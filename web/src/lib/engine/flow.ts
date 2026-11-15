import { scaledDistance, TIE_EPS } from './distance';
import { BASS_GUIDE_URL } from './facts';
import { shortMaterial } from './literatureWindow';
import type { ConditionSource, Fact, FlowCoverage, FuelClass, Habitat, HaloData, Investigation, LiteratureRow, Nearest, Source, TestPoint } from './types';

/**
 * Air-flow coverage per fuel class. In microgravity there is no buoyant
 * flow, so the forced flow past a sample sets how a flame spreads and goes
 * out. HALO grades on O2 and pressure only; flow is reported beside the
 * grade: the tested flow range per class, the nearest test's flow, and
 * whether the habitat's cabin flow falls inside what was tested.
 *
 * Per-row flows (TestPoint.flowCmS) are used when tests.json carries them;
 * otherwise the range falls back to the flow ranges of the investigations
 * the class's tests come from (investigations.json flowRangeCmS).
 */

const CLASSES: FuelClass[] = ['solid', 'solid_surrogate', 'droplet', 'gas'];

const hasFlow = (t: TestPoint): t is TestPoint & { flowCmS: number } => typeof t.flowCmS === 'number' && Number.isFinite(t.flowCmS);

function span(xs: number[]): [number, number] | null {
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
}

export function flowCoverage(
  h: Habitat,
  tests: TestPoint[],
  investigations: Investigation[],
  byClass: Record<FuelClass, Nearest>,
): Record<FuelClass, FlowCoverage> {
  const out = {} as Record<FuelClass, FlowCoverage>;
  for (const fc of CLASSES) {
    const subset = tests.filter((t) => t.fuelClass === fc);
    const rows = subset.filter(hasFlow);
    let range: [number, number] | null = null;
    let basis: FlowCoverage['basis'] = null;
    if (rows.length) {
      range = span(rows.map((t) => t.flowCmS));
      basis = 'rows';
    } else {
      const ids = new Set(subset.map((t) => t.psiId));
      const ranges = investigations.filter((i) => ids.has(i.psiId) && i.flowRangeCmS).map((i) => i.flowRangeCmS as [number, number]);
      if (ranges.length) {
        range = [Math.min(...ranges.map((r) => r[0])), Math.max(...ranges.map((r) => r[1]))];
        basis = 'investigations';
      }
    }

    const near = byClass[fc];
    const nearestFlow = near.test && hasFlow(near.test) ? near.test.flowCmS : null;
    const nearestFlowSrc: ConditionSource | null = nearestFlow === null ? null : (near.test?.flowSrc ?? 'measured');
    let nearestPoint: FlowCoverage['nearestPoint'] = null;
    if (near.test && near.d !== null) {
      const tied = rows.filter(
        (t) => Math.abs(scaledDistance(h.o2Pct, h.pressurePsia, t.o2Pct, t.pressurePsia) - near.d!) <= TIE_EPS,
      );
      const r = span(tied.map((t) => t.flowCmS));
      if (r) nearestPoint = { n: tied.length, range: r };
    }

    out[fc] = {
      fuelClass: fc,
      habitatFlow: h.flowCmS,
      range,
      basis,
      inside: range ? h.flowCmS >= range[0] && h.flowCmS <= range[1] : null,
      nearestFlow,
      nearestFlowSrc,
      nearestPoint,
    };
  }
  return out;
}

// ---- facts ----


const slug = (c: FuelClass) => c.replace(/_/g, '-');
const CLASS_WORD: Record<FuelClass, string> = {
  solid: 'real cabin solid',
  solid_surrogate: 'solid surrogate',
  droplet: 'liquid droplet',
  gas: 'gas flame',
};

/** Ids of the per-class flow facts. */
export const flowId = (c: FuelClass, what: 'min' | 'max') => `flow-${slug(c)}-${what}`;
export const nearFlowId = (c: FuelClass, what: 'flow' | 'flow-low' | 'flow-high' | 'flow-count') => `near-${slug(c)}-${what}`;

/** NASA's Researcher's Guide on air flow and solid-fuel flames in microgravity. */
export const FLOW_GUIDE_SOURCE: Source = { url: BASS_GUIDE_URL, note: 'A Researcher’s Guide to: Combustion Science (2015)' };
export const FLOW_GUIDE_MINIMUM: Fact = {
  id: 'flow-guide-minimum',
  label: 'Air flow at which flames over solids burn at the lowest oxygen and spread fastest in microgravity (order of magnitude; typical of spacecraft ventilation)',
  value: 10,
  unit: 'cm/s',
  provenance: 'literature',
  source: FLOW_GUIDE_SOURCE,
};
export const FLOW_GUIDE_UPSTREAM: Fact = {
  id: 'flow-guide-upstream',
  label: 'Air flow and flame direction in microgravity',
  value: 'At low air flow in microgravity a flame on a thin fuel can spread upstream, into the oncoming air, the opposite of normal gravity; ventilation flow strongly enhances flames, so margins based on still-air tests may not hold',
  provenance: 'literature',
  source: FLOW_GUIDE_SOURCE,
};

function invNote(tests: TestPoint[], c: FuelClass): string {
  const ids = [...new Set(tests.filter((t) => t.fuelClass === c).map((t) => t.psiId))].sort();
  return `Eligible PSI ${CLASS_WORD[c]} rows from ${ids.join(', ')}`;
}

/** Facts for the flow coverage: tested range per class, and the nearest test's flow when rows record it. */
export function flowFacts(cov: Record<FuelClass, FlowCoverage>, byClass: Record<FuelClass, Nearest>, data: HaloData): Fact[] {
  const out: Fact[] = [];
  for (const c of CLASSES) {
    const f = cov[c];
    if (f.range) {
      const t0 = byClass[c].test;
      const doi0 = t0 ? data.manifest.psiDatasetDois[t0.psiId] : undefined;
      const source: Source = {
        ...(t0 ? (doi0 ? { psiId: t0.psiId, doi: doi0 } : { psiId: t0.psiId }) : {}),
        note: `${invNote(data.tests, c)}; ${f.basis === 'rows' ? 'per-test air flow' : 'investigation flow ranges (per-test flow not yet in tests.json)'}`,
      };
      // A min or max of recorded flows is a recorded flow.
      out.push(
        { id: flowId(c, 'min'), label: `Lowest air flow in the ${CLASS_WORD[c]} tests`, value: f.range[0], unit: 'cm/s', provenance: 'measured', source },
        { id: flowId(c, 'max'), label: `Highest air flow in the ${CLASS_WORD[c]} tests`, value: f.range[1], unit: 'cm/s', provenance: 'measured', source },
      );
    }
    const t = byClass[c].test;
    if (t && f.nearestFlow !== null) {
      const doi = data.manifest.psiDatasetDois[t.psiId];
      const src: Source = doi ? { psiId: t.psiId, doi } : { psiId: t.psiId };
      out.push({ id: nearFlowId(c, 'flow'), label: `Air flow of the nearest ${CLASS_WORD[c]} test`, value: f.nearestFlow, unit: 'cm/s', provenance: f.nearestFlowSrc ?? 'measured', source: src });
      if (f.nearestPoint && f.nearestPoint.n > 1) {
        out.push(
          { id: nearFlowId(c, 'flow-count'), label: `${CLASS_WORD[c]} tests at the nearest tested condition`, value: f.nearestPoint.n, provenance: 'computed', source: src },
          { id: nearFlowId(c, 'flow-low'), label: `Lowest air flow among the tests at the nearest ${CLASS_WORD[c]} condition`, value: f.nearestPoint.range[0], unit: 'cm/s', provenance: 'measured', source: src },
          { id: nearFlowId(c, 'flow-high'), label: `Highest air flow among the tests at the nearest ${CLASS_WORD[c]} condition`, value: f.nearestPoint.range[1], unit: 'cm/s', provenance: 'measured', source: src },
        );
      }
    }
  }
  return out;
}

export interface LiteratureFlowPair { low: LiteratureRow; high: LiteratureRow; facts: Fact[] }

/**
 * Two literature runs of the same mission and material at different air
 * flows, both with a spread rate: the data's own flame-spread-versus-flow
 * comparison. Picks the pair with the widest flow difference.
 */
export function literatureFlowPair(data: HaloData): LiteratureFlowPair | null {
  const rows = data.literature.filter((r) => r.flowCmS !== null && r.spreadRateMmS !== null);
  let best: { low: LiteratureRow; high: LiteratureRow; gap: number } | null = null;
  for (const a of rows) {
    for (const b of rows) {
      if (a.mission !== b.mission || a.material !== b.material) continue;
      const gap = (b.flowCmS as number) - (a.flowCmS as number);
      if (gap > 0 && (best === null || gap > best.gap)) best = { low: a, high: b, gap };
    }
  }
  if (!best) return null;
  const { low, high } = best;
  const mat = shortMaterial(low.material);
  const mission = low.mission.replace(/-/g, ' ');
  const source: Source = { url: low.sourceUrl, note: `${mission} ${low.sampleId} and ${high.sampleId} (${low.material}); NASA report, not PSI` };
  const facts: Fact[] = [
    { id: 'lit-flow-low', label: `${mission} ${mat} sample ${low.sampleId}: air flow`, value: low.flowCmS as number, unit: 'cm/s', provenance: 'literature', source },
    { id: 'lit-flow-low-spread', label: `${mission} ${mat} sample ${low.sampleId}: flame spread rate`, value: low.spreadRateMmS as number, unit: 'mm/s', provenance: 'literature', source },
    { id: 'lit-flow-high', label: `${mission} ${mat} sample ${high.sampleId}: air flow`, value: high.flowCmS as number, unit: 'cm/s', provenance: 'literature', source },
    { id: 'lit-flow-high-spread', label: `${mission} ${mat} sample ${high.sampleId}: flame spread rate`, value: high.spreadRateMmS as number, unit: 'mm/s', provenance: 'literature', source },
  ];
  return { low, high, facts };
}
