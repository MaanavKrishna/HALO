import { PARTIAL_GRAVITY_FACTS } from './facts';
import { flowId } from './flow';
import { literatureInWindow, literatureWindowSentence } from './literatureWindow';
import { MATERIALS } from './materials';
import { factText } from './types';
import type { DetectionResult, ExtinctionResult, Fact, Flag, FlowCoverage, FuelClass, Habitat, HaloData, Nearest, Source } from './types';

/**
 * Flag rules. Every number a flag renders is read from a Fact it lists in
 * factIds, rendered with factText(fact), so a validator can match them.
 */

const PSI_PER_ATM = 14.696;
const ISS_AIR_MAX_O2 = 23;
const ISS_AIR_MIN_P = 13;
const SOLID_C_LIMIT = 1.0;
const MISS_PCT = 50;
const SELF_EXTINGUISH_P = 0.1;
const PARTIAL_GRAVITY_URL = 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/';

const r1 = (x: number) => Number(x.toFixed(1));
const r2 = (x: number) => Number(x.toFixed(2));
const pct = (x: number) => Math.round(x * 100);

export interface FlagResult { flags: Flag[]; facts: Fact[] }

function testSource(data: HaloData, psiId: string): Source {
  const doi = data.manifest.psiDatasetDois[psiId] ?? data.investigations.find((i) => i.psiId === psiId)?.datasetDoi;
  return doi ? { psiId, doi } : { psiId };
}

/** SAME (smoke detection) investigation source, if the data has one. */
export function detectorSource(data: HaloData): Source {
  // The detector runs are SAME; prefer it over other smoke-detection investigations (DAFT, SAME-R).
  const inv =
    data.investigations.find((i) => i.acronym.trim().toUpperCase() === 'SAME') ??
    data.investigations.find((i) => i.hazards.includes('smoke_detection'));
  return inv ? { psiId: inv.psiId, doi: inv.datasetDoi, note: inv.acronym } : { note: 'SAME smoke detector runs' };
}

/** The 2.0 V scatter level is an assumed alarm proxy for an ISS-style photoelectric detector, not a logged alarm. */
export function scatterThresholdFact(data: HaloData): Fact {
  return {
    id: 'det-scatter-threshold', label: 'Scatter alarm proxy (photoelectric, assumed)', value: data.detector.thresholds.scatterV,
    unit: 'V', decimals: 1, provenance: 'assumed', source: detectorSource(data),
  };
}

const comboKey = (detectors: string[]) => [...detectors].sort().join('-');
const comboLabel = (detectors: string[]) => [...detectors].sort().join(' + ');

/** Detection facts per material: scatter low/runs, plus missed/runs for the selected detector combo. */
export function detectionFacts(det: DetectionResult[], detectors: string[], data: HaloData): Fact[] {
  const src = detectorSource(data);
  const out: Fact[] = [];
  const key = comboKey(detectors);
  for (const d of det) {
    const label = MATERIALS[d.material].label;
    if (d.scatterRuns > 0) {
      out.push(
        { id: `det-${d.material}-scatter-low`, label: `${label} runs below the scatter alarm level`, value: d.scatterLow, provenance: 'computed', source: src },
        { id: `det-${d.material}-scatter-runs`, label: `${label} runs with a scatter reading`, value: d.scatterRuns, provenance: 'computed', source: src },
      );
    }
    if (key !== 'scatter' && d.caughtPct !== null && d.caughtRuns > 0) {
      const caught = Math.round((d.caughtPct / 100) * d.caughtRuns);
      out.push(
        { id: `det-${d.material}-${key}-low`, label: `${label} runs missed by ${comboLabel(detectors)}`, value: d.caughtRuns - caught, provenance: 'inferred', source: src },
        { id: `det-${d.material}-${key}-runs`, label: `${label} runs with every selected channel recorded`, value: d.caughtRuns, provenance: 'computed', source: src },
      );
    }
  }
  return out;
}

export function buildFlags(
  h: Habitat,
  data: HaloData,
  byClass: Record<FuelClass, Nearest>,
  detection: DetectionResult[],
  extinction: ExtinctionResult,
  detFacts: Fact[],
  flow?: Record<FuelClass, FlowCoverage>,
  flowFacts: Fact[] = [],
): FlagResult {
  const flags: Flag[] = [];
  const facts: Fact[] = [];

  // critical: no real cabin material in the PSI data tested at this atmosphere
  const solid = byClass.solid;
  if (solid.d === null || solid.d > SOLID_C_LIMIT) {
    // Real solids burned near here outside PSI (Saffire VI, NASA reports): stated, never graded on.
    const lit = literatureInWindow(data);
    const litText = lit ? ` ${literatureWindowSentence(lit)}` : '';
    const litIds = lit ? lit.facts.map((f) => f.id) : [];
    if (lit) facts.push(...lit.facts);
    const count: Fact = {
      id: 'cov-solid-count', label: 'Eligible solid-fuel tests', provenance: 'computed',
      value: data.tests.filter((t) => t.fuelClass === 'solid').length,
      source: { note: `Eligible PSI test rows searched: ${[...new Set(data.tests.map((t) => t.psiId))].sort().join(', ')}` },
    };
    if (solid.test && solid.d !== null) {
      const t = solid.test;
      const src = testSource(data, t.psiId);
      const near: Fact[] = [
        { id: 'cov-solid-distance', label: 'Evidence distance to the nearest solid-fuel test', value: r2(solid.d), provenance: 'computed', source: src },
        { id: 'cov-solid-oxygen', label: 'O2 of the nearest solid-fuel test', value: t.o2Pct, unit: '%', provenance: t.o2Src, source: src },
        { id: 'cov-solid-pressure', label: 'Pressure of the nearest solid-fuel test', value: t.pressurePsia, unit: 'psia', decimals: 1, provenance: t.pSrc, source: src },
        { id: 'cov-solid-oxygen-gap', label: 'O2 gap between the habitat and the nearest solid-fuel test', value: r1(Math.abs(t.o2Pct - h.o2Pct)), unit: 'O2-points', decimals: 1, provenance: 'computed', source: src },
        { id: 'cov-solid-pressure-gap', label: 'Pressure gap between the habitat and the nearest solid-fuel test', value: r1(Math.abs(t.pressurePsia - h.pressurePsia)), unit: 'psia', decimals: 1, provenance: 'computed', source: src },
      ];
      facts.push(...near);
      flags.push({
        id: 'no-solid-evidence', severity: 'critical',
        title: 'No real cabin material in the PSI data tested at this atmosphere',
        detail: `The nearest real-material test in PSI (${t.acronym}) ran at ${factText(near[1])}% O2 and ${factText(near[2])} psia: ${factText(near[3])} O2 points and ${factText(near[4])} psia away from your habitat (evidence distance ${near[0].value}). Material behavior at your atmosphere is untested in PSI, so any estimate here is an extrapolation.${litText}`,
        factIds: [...near.map((f) => f.id), ...litIds],
      });
    } else {
      facts.push(count);
      flags.push({
        id: 'no-solid-evidence', severity: 'critical',
        title: 'No real cabin material in the PSI data tested at this atmosphere',
        detail: `No eligible solid-fuel test exists in the PSI data, so solid-material behavior here is untested in PSI.${litText}`,
        factIds: [count.id, ...litIds],
      });
    }
  }

  // critical: selected detectors would likely miss a material's smoke
  const key = comboKey(h.detectors);
  for (const d of detection) {
    // caughtPct null means no runs with data: that is "no data", never 0%.
    if (d.caughtPct === null || d.caughtRuns === 0 || d.caughtPct >= MISS_PCT) continue;
    const label = MATERIALS[d.material].label;
    const low = detFacts.find((f) => f.id === `det-${d.material}-${key}-low`);
    const runs = detFacts.find((f) => f.id === `det-${d.material}-${key}-runs`);
    if (!low || !runs) continue;
    if (h.detectors.includes('scatter')) facts.push(scatterThresholdFact(data));
    const thr = scatterThresholdFact(data);
    const usesScatter = h.detectors.includes('scatter');
    flags.push({
      id: `detector-miss-${d.material}`, severity: 'critical',
      title: `Your detector would likely miss ${label} smoke`,
      detail: `In SAME, ${h.detectors.length > 1 ? `both channels (${comboLabel(h.detectors)}) stayed below their alarm thresholds` : `the ${comboLabel(h.detectors)} channel stayed below its alarm threshold`}${usesScatter ? ` (scatter is a ${factText(thr)} V proxy)` : ''} in ${low.value} of ${runs.value} ${label} runs.`,
      factIds: usesScatter ? [low.id, runs.id, thr.id] : [low.id, runs.id],
    });
  }

  // warning: smoke data exists only at ISS air
  if (h.o2Pct > ISS_AIR_MAX_O2 || h.pressurePsia < ISS_AIR_MIN_P) {
    const src = detectorSource(data);
    const amb: Fact[] = [
      { id: 'det-ambient-oxygen', label: 'O2 of the SAME detector runs', value: data.detector.ambient.o2Pct, unit: '%', provenance: 'assumed', source: src },
      { id: 'det-ambient-pressure', label: 'Pressure of the SAME detector runs', value: Number((data.detector.ambient.pressurePsia / PSI_PER_ATM).toFixed(1)), unit: 'atm', provenance: 'assumed', source: src },
    ];
    facts.push(...amb);
    flags.push({
      id: 'smoke-iss-air', severity: 'warning',
      title: 'Smoke data only exists at ISS air',
      detail: `SAME ran at ISS air (${amb[0].value}% O2, ${amb[1].value} atm); smoke behavior at habitat atmosphere is untested.`,
      factIds: amb.map((f) => f.id),
    });
  }

  // warning: cabin air flow outside every tested solid-fuel flow
  const sf = flow?.solid;
  const fmin = flowFacts.find((f) => f.id === flowId('solid', 'min'));
  const fmax = flowFacts.find((f) => f.id === flowId('solid', 'max'));
  if (sf && sf.inside === false && fmin && fmax) {
    flags.push({
      id: 'flow-outside-tested', severity: 'warning',
      title: 'Cabin air flow outside every tested solid-fuel flow',
      detail: `PSI real-material tests ran at ${factText(fmin)} to ${factText(fmax)} cm/s of air flow; your cabin flow of ${h.flowCmS} cm/s is outside that range. In microgravity the air flow sets how a flame spreads and goes out, so flame behavior at your flow is untested in PSI.`,
      factIds: [fmin.id, fmax.id, 'habitat-flow'],
    });
  }

  // warning: pressure outside the extinction model's tested range
  const extSrc: Source = { psiId: data.extinction.source.psiId, doi: data.extinction.source.doi };
  // The extinction model covers droplet fuels only.
  if (h.liquids && extinction.extrapolatedPressure) {
    const rng: Fact[] = [
      { id: 'ext-pressure-min', label: 'Lowest pressure in the droplet extinction fit', value: data.extinction.pRangeAtm[0], unit: 'atm', provenance: 'measured', source: extSrc },
      { id: 'ext-pressure-max', label: 'Highest pressure in the droplet extinction fit', value: data.extinction.pRangeAtm[1], unit: 'atm', provenance: 'measured', source: extSrc },
      { id: 'ext-pressure-used', label: 'Pressure the extinction model is evaluated at', value: r2(extinction.pAtmUsed), unit: 'atm', provenance: 'model', source: extSrc },
    ];
    facts.push(...rng);
    flags.push({
      id: 'pressure-extrapolated', severity: 'warning',
      title: 'Droplet-fuel pressure outside tested range',
      detail: `FLEX droplet tests span ${rng[0].value} to ${rng[1].value} atm. Your cabin pressure is outside that range, so the extinction estimate is evaluated at ${rng[2].value} atm and is an extrapolation.`,
      factIds: rng.map((f) => f.id),
    });
  }

  // warning: droplet flames unlikely to self-extinguish
  if (h.liquids && extinction.p50 < SELF_EXTINGUISH_P) {
    const ex: Fact[] = [
      { id: 'ext-probability', label: 'Median chance a droplet flame goes out on its own', value: pct(extinction.p50), unit: '%', provenance: 'model', source: extSrc },
      { id: 'ext-probability-lo', label: 'Lower 95% bound of that chance', value: pct(extinction.lo), unit: '%', provenance: 'model', source: extSrc },
      { id: 'ext-probability-hi', label: 'Upper 95% bound of that chance', value: pct(extinction.hi), unit: '%', provenance: 'model', source: extSrc },
      { id: 'ext-droplet-size', label: 'Droplet diameter the model is evaluated at', value: data.extinction.d0Mm, unit: 'mm', provenance: 'model', source: extSrc },
    ];
    facts.push(...ex);
    flags.push({
      id: 'droplet-no-self-extinction', severity: 'warning',
      title: 'Droplet flames unlikely to self-extinguish',
      detail: `The FLEX model gives a ${ex[0].value}% median chance (range ${ex[1].value}–${ex[2].value}%) that a ${ex[3].value} mm droplet flame goes out on its own at this oxygen level.`,
      factIds: ex.map((f) => f.id),
    });
  }

  // info: no partial-gravity data (always)
  const ids = [...new Set(data.investigations.map((i) => i.psiId))].sort();
  const invCount: Fact = {
    id: 'psi-investigations', label: 'PSI investigations in the HALO dataset', value: ids.length,
    provenance: 'computed',
    source: {
      url: PARTIAL_GRAVITY_URL,
      note: `The challenge states PSI holds no partial-gravity combustion data. Investigations counted: ${ids.join(', ')}`,
    },
  };
  facts.push(invCount, ...PARTIAL_GRAVITY_FACTS);
  flags.push({
    id: 'no-partial-gravity', severity: 'info',
    title: 'No partial-gravity data in PSI',
    detail: `None of the ${invCount.value} PSI investigations HALO uses ran at lunar or Martian gravity. Behavior at partial gravity is untested here. NASA's LUCI burned samples in simulated lunar gravity, and FM2 is planned to burn materials on the Moon; neither is in PSI yet.`,
    factIds: [invCount.id, ...PARTIAL_GRAVITY_FACTS.map((f) => f.id)],
  });

  const order = { critical: 0, warning: 1, info: 2 } as const;
  flags.sort((a, b) => order[a.severity] - order[b.severity]);
  return { flags, facts };
}
