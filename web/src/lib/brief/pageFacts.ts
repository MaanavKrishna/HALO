import { sensorWhatIf } from '@/lib/engine/detection';
import { detectorSource, scatterThresholdFact } from '@/lib/engine/flags';
import { HABITAT_SOURCE, habitatFacts } from '@/lib/engine/brief';
import { classGrade } from '@/lib/engine/grade';
import { literatureInWindow } from '@/lib/engine/literatureWindow';
import { nearestLiterature } from '@/lib/engine/nextTest';
import { MATERIALS } from '@/lib/engine/materials';
import { PRESETS } from '@/lib/engine/presets';
import type { Brief, Fact, FuelClass, Grade, HaloData, MaterialId, Source, TestPoint } from '@/lib/engine/types';

/**
 * Facts the brief page displays beyond the ones the engine attached to flags.
 * The page renders every number from a Fact, so values computed for display
 * (habitat inputs, nearest-test gaps, what-if detector counts, the extinction
 * band and the next-test point) are wrapped here with provenance and source.
 * Ids that the engine may also emit use the same id and formula; the engine's
 * copy wins when both exist (see `allFacts`).
 */

const PSI_PER_ATM = 14.696;
const r1 = (x: number) => Number(x.toFixed(1));
const r2 = (x: number) => Number(x.toFixed(2));
const pct = (x: number) => Math.round(x * 100);

export const CLASS_ORDER: FuelClass[] = ['solid', 'solid_surrogate', 'droplet', 'gas'];
export const CLASS_LABEL: Record<FuelClass, string> = {
  solid: 'Real cabin solid',
  solid_surrogate: 'Solid surrogate',
  droplet: 'Liquid droplet',
  gas: 'Gas flame',
};
export const PRESET_ORDER = ['iss', 'artemis', 'moon', 'rover', 'suit'] as const;
export type PresetKey = (typeof PRESET_ORDER)[number];
export const presetName = (k: string) => (PRESETS as Record<string, { name: string }>)[k]?.name ?? k;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const HABITAT = HABITAT_SOURCE;

export function testSource(data: HaloData, t: Pick<TestPoint, 'psiId'>): Source {
  const doi = data.manifest.psiDatasetDois[t.psiId] ?? data.investigations.find((i) => i.psiId === t.psiId)?.datasetDoi;
  return doi ? { psiId: t.psiId, doi } : { psiId: t.psiId };
}

/** Ids of the per-class nearest-test facts. */
export const nearId = (c: FuelClass, what: 'distance' | 'oxygen' | 'pressure' | 'gap') => `near-${slug(c)}-${what}`;
export const whatIfId = (m: MaterialId, combo: string[], what: 'caught' | 'runs') => `whatif-${m}-${combo.join('-')}-${what}`;
export const gainId = (rank: number, preset: string, when: 'before' | 'after') =>
  `next-${['first', 'second', 'third', 'fourth', 'fifth'][rank] ?? 'later'}-${preset}-${when}`;
export const nextId = (rank: number, what: 'oxygen' | 'pressure') =>
  `next-${['first', 'second', 'third', 'fourth', 'fifth'][rank] ?? 'later'}-${what}`;

export function pageFacts(b: Brief, data: HaloData): Fact[] {
  const h = b.habitat;
  const out: Fact[] = [
    ...habitatFacts(h),
    {
      id: 'habitat-oxygen-partial-pressure', label: 'Habitat O2 partial pressure (O2 fraction × total pressure)',
      value: r2((h.o2Pct / 100) * h.pressurePsia), unit: 'psia', provenance: 'computed', source: HABITAT,
    },
  ];

  // Nearest eligible test per fuel class.
  for (const c of CLASS_ORDER) {
    const n = b.byClass[c];
    if (!n.test || n.d === null) continue;
    const src = testSource(data, n.test);
    out.push(
      { id: nearId(c, 'distance'), label: `Evidence distance to the nearest ${CLASS_LABEL[c].toLowerCase()} test`, value: r2(n.d), provenance: 'computed', source: src },
      { id: nearId(c, 'oxygen'), label: `O2 of the nearest ${CLASS_LABEL[c].toLowerCase()} test`, value: n.test.o2Pct, unit: '%', provenance: n.test.o2Src, source: src },
      { id: nearId(c, 'pressure'), label: `Pressure of the nearest ${CLASS_LABEL[c].toLowerCase()} test`, value: n.test.pressurePsia, unit: 'psia', provenance: n.test.pSrc, source: src },
      { id: nearId(c, 'gap'), label: `O2 gap between the habitat and the nearest ${CLASS_LABEL[c].toLowerCase()} test`, value: r1(Math.abs(n.o2Gap ?? 0)), unit: 'O2-points', provenance: 'computed', source: src },
    );
  }

  // SAME ambient: always shown on the detection card, ISS-like habitats included.
  const detSrc = detectorSource(data);
  out.push(
    { id: 'det-ambient-oxygen', label: 'O2 of the SAME detector runs', value: data.detector.ambient.o2Pct, unit: '%', provenance: 'assumed', source: detSrc },
    { id: 'det-ambient-pressure', label: 'Pressure of the SAME detector runs', value: Number((data.detector.ambient.pressurePsia / PSI_PER_ATM).toFixed(1)), unit: 'atm', provenance: 'assumed', source: detSrc },
    scatterThresholdFact(data),
    { id: 'det-ionization-threshold', label: 'Ionization alarm level (10th percentile of Lampwick ΔV)', value: Number(data.detector.thresholds.ionizationDV.toFixed(3)), unit: 'V', provenance: 'inferred', source: detSrc },
  );

  // Sensor what-if: scatter alone versus scatter + ionization, per material with SAME runs.
  for (const m of h.materials) {
    if (MATERIALS[m].sameClass === null) continue;
    for (const w of sensorWhatIf(m, data.detector)) {
      if (w.runs === 0) continue; // no SAME data: never shown as 0%
      const label = `${MATERIALS[m].label} runs`;
      out.push(
        { id: whatIfId(m, w.combo, 'caught'), label: `${label} caught by ${w.combo.join(' + ')}`, value: w.caught, provenance: w.combo.length > 1 ? 'inferred' : 'computed', source: detSrc },
        { id: whatIfId(m, w.combo, 'runs'), label: `${label} with every channel of ${w.combo.join(' + ')} recorded`, value: w.runs, provenance: 'computed', source: detSrc },
      );
    }
  }

  // Droplet extinction (same ids and rounding as the engine's flag facts).
  const ext = b.extinction;
  const extSrc: Source = { psiId: data.extinction.source.psiId, doi: data.extinction.source.doi };
  out.push(
    { id: 'ext-probability', label: 'Median chance a droplet flame goes out on its own', value: pct(ext.p50), unit: '%', provenance: 'model', source: extSrc },
    { id: 'ext-probability-lo', label: 'Lower 95% bound of that chance', value: pct(ext.lo), unit: '%', provenance: 'model', source: extSrc },
    { id: 'ext-probability-hi', label: 'Upper 95% bound of that chance', value: pct(ext.hi), unit: '%', provenance: 'model', source: extSrc },
    { id: 'ext-droplet-size', label: 'Droplet diameter the model is evaluated at', value: data.extinction.d0Mm, unit: 'mm', provenance: 'model', source: extSrc },
    { id: 'ext-pressure-min', label: 'Lowest pressure in the droplet extinction fit', value: data.extinction.pRangeAtm[0], unit: 'atm', provenance: 'measured', source: extSrc },
    { id: 'ext-pressure-max', label: 'Highest pressure in the droplet extinction fit', value: data.extinction.pRangeAtm[1], unit: 'atm', provenance: 'measured', source: extSrc },
    { id: 'ext-pressure-used', label: 'Pressure the extinction model is evaluated at', value: r2(ext.pAtmUsed), unit: 'atm', provenance: 'model', source: extSrc },
  );

  // Next tests: the computed point and the per-preset gain.
  const nextSrc: Source = { note: 'HALO next-test search over the eligible PSI test rows (computed)' };
  b.nextTests.forEach((t, i) => {
    out.push(
      { id: nextId(i, 'oxygen'), label: `Suggested test ${i + 1}: O2`, value: t.o2Pct, unit: '%', provenance: 'computed', source: nextSrc },
      { id: nextId(i, 'pressure'), label: `Suggested test ${i + 1}: pressure`, value: t.pressurePsia, unit: 'psia', provenance: 'computed', source: nextSrc },
    );
    for (const g of t.gains) {
      out.push(
        { id: gainId(i, g.preset, 'before'), label: `${presetName(g.preset)}: evidence distance today`, value: r2(g.before), provenance: 'computed', source: nextSrc },
        { id: gainId(i, g.preset, 'after'), label: `${presetName(g.preset)}: evidence distance after suggested test ${i + 1}`, value: r2(g.after), provenance: 'computed', source: nextSrc },
      );
    }
  });

  // The top suggestion against the Saffire runs (NASA reports, not PSI): its distance to the nearest one,
  // and what archiving those runs in PSI would do for real-solid coverage.
  const best = b.nextTests[0];
  const lit = literatureInWindow(data);
  if (lit) out.push(...lit.facts);
  const near = best ? nearestLiterature(best, data.literature) : null;
  if (best && near) {
    const mission = near.row.mission.replace(/-/g, ' ');
    out.push({
      id: NEXT_LITERATURE_DISTANCE,
      label: `Evidence distance from suggested test 1 to the nearest Saffire run (${mission} ${near.row.sampleId}, literature, not PSI)`,
      value: r2(near.d), provenance: 'computed', source: { url: near.row.sourceUrl, note: `${mission} ${near.row.sampleId}: ${near.row.material}` },
    });
  }
  const archSrc: Source = { note: 'Saffire runs from NASA reports (literature.json) counted as if archived in PSI; real-solid evidence distance per reference habitat (computed)' , url: data.literature.find((r) => r.o2Pct !== null && r.pressurePsia !== null)?.sourceUrl };
  for (const g of b.archiveGains) {
    out.push(
      { id: archiveId(g.preset, 'before'), label: `${presetName(g.preset)}: real-solid evidence distance, PSI rows only`, value: r2(g.before), provenance: 'computed', source: archSrc },
      { id: archiveId(g.preset, 'after'), label: `${presetName(g.preset)}: real-solid evidence distance if the Saffire runs were archived in PSI`, value: r2(g.after), provenance: 'computed', source: archSrc },
    );
  }
  const archivedSolid = b.nextTestsIfArchived.find((t) => t.fuelClass === 'solid');
  if (archivedSolid) {
    out.push(
      { id: 'next-archived-oxygen', label: 'Best real-solid test once the Saffire runs count as coverage: O2', value: archivedSolid.o2Pct, unit: '%', provenance: 'computed', source: archSrc },
      { id: 'next-archived-pressure', label: 'Best real-solid test once the Saffire runs count as coverage: pressure', value: archivedSolid.pressurePsia, unit: 'psia', provenance: 'computed', source: archSrc },
    );
  }

  return out;
}

export const NEXT_LITERATURE_DISTANCE = 'next-first-literature-distance';
export const archiveId = (preset: string, when: 'before' | 'after') => `archive-${preset}-${when}`;

/** Engine facts first, then page facts not already present. */
export function allFacts(b: Brief, data: HaloData): Fact[] {
  const seen = new Set(b.facts.map((f) => f.id));
  return [...b.facts, ...pageFacts(b, data).filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)))];
}

export function gradeOf(b: Brief, c: FuelClass): Grade {
  return classGrade(b.byClass[c]);
}
