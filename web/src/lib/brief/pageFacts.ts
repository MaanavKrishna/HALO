import { sensorWhatIf } from '@/lib/engine/detection';
import { detectorSource, scatterThresholdFact } from '@/lib/engine/flags';
import { HABITAT_SOURCE, habitatFacts } from '@/lib/engine/brief';
import { classGrade, overallGrade } from '@/lib/engine/grade';
import { nearestByClass } from '@/lib/engine/distance';
import { literatureInWindow, missionInPsi, missionSpan } from '@/lib/engine/literatureWindow';
import { archivableLiterature, literaturePoints, nearestArchivable, nearestLiterature } from '@/lib/engine/nextTest';
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
/** Display O2 and pressure to 1 decimal when the value carries more (14.696 psia prints as 14.7); the value stays exact. */
const dp1 = (v: number) => (Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? {} : { decimals: 1 });

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
      { id: nearId(c, 'oxygen'), label: `O2 of the nearest ${CLASS_LABEL[c].toLowerCase()} test`, value: n.test.o2Pct, unit: '%', ...dp1(n.test.o2Pct), provenance: n.test.o2Src, source: src },
      { id: nearId(c, 'pressure'), label: `Pressure of the nearest ${CLASS_LABEL[c].toLowerCase()} test`, value: n.test.pressurePsia, unit: 'psia', ...dp1(n.test.pressurePsia), provenance: n.test.pSrc, source: src },
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

  // The top suggestion against the Saffire runs (NASA reports): its distance to the nearest one,
  // and what archiving those runs in PSI would do for real-solid coverage.
  const best = b.nextTests[0];
  const lit = literatureInWindow(data);
  if (lit) out.push(...lit.facts);
  const near = best ? nearestLiterature(best, data.literature) : null;
  if (best && near) {
    const mission = near.row.mission.replace(/-/g, ' ');
    const scope = missionInPsi(near.row.mission, data.tests) ? 'NASA report' : 'NASA report, mission not in PSI';
    out.push({
      id: NEXT_LITERATURE_DISTANCE,
      label: `Evidence distance from suggested test 1 to the nearest Saffire run (${mission}, ${scope})`,
      value: r2(near.d), provenance: 'computed', source: { url: near.row.sourceUrl, note: `${mission} sample ${near.row.sampleId}: ${near.row.material}` },
    });
  }
  // "If archived": only literature missions not already in PSI count (Saffire I–III are PSI rows already).
  const archMissions = archiveMissionLabel(data);
  const archNote = `${archMissions} runs from NASA reports (literature.json), not yet in PSI, counted as if archived there; real-solid evidence distance per reference habitat (computed)`;
  const archSrc = (p: { o2Pct: number; pressurePsia: number }): Source => {
    const row = nearestArchivable(p, data);
    return { note: row ? `${archNote}; nearest run ${row.mission.replace(/-/g, ' ')} sample ${row.sampleId}` : archNote, ...(row ? { url: row.sourceUrl } : {}) };
  };
  for (const g of b.archiveGains) {
    const src = archSrc(PRESETS[g.preset as keyof typeof PRESETS]);
    out.push(
      { id: archiveId(g.preset, 'before'), label: `${presetName(g.preset)}: real-solid evidence distance, PSI rows only`, value: r2(g.before), provenance: 'computed', source: src },
      { id: archiveId(g.preset, 'after'), label: `${presetName(g.preset)}: real-solid evidence distance if the ${archMissions} runs not yet in PSI were archived there`, value: r2(g.after), provenance: 'computed', source: src },
    );
  }
  const archivedSolid = b.nextTestsIfArchived.find((t) => t.fuelClass === 'solid');
  if (archivedSolid) {
    const src = archSrc(archivedSolid);
    out.push(
      { id: 'next-archived-oxygen', label: `Best real-solid test once the ${archMissions} runs count as coverage: O2`, value: archivedSolid.o2Pct, unit: '%', provenance: 'computed', source: src },
      { id: 'next-archived-pressure', label: `Best real-solid test once the ${archMissions} runs count as coverage: pressure`, value: archivedSolid.pressurePsia, unit: 'psia', provenance: 'computed', source: src },
    );
  }

  // Grade ladder: distances for a habitat that matches no preset (presets cite the next-test and archive facts).
  if (!ladderPreset(h)) {
    const lad = gradeLadder(b, data);
    for (const s of lad) {
      if (s.kind === 'today' || s.d === null || s.factId === 'grade-solid-distance') continue;
      out.push({
        id: `ladder-${s.kind}-distance`,
        label: s.kind === 'archive'
          ? `Real-solid evidence distance if the ${archMissions} runs not yet in PSI were archived there`
          : 'Real-solid evidence distance after suggested test 1',
        value: r2(s.d), provenance: 'computed', source: s.kind === 'archive' ? archSrc(h) : nextSrc,
      });
    }
  }

  return out;
}

/** The preset whose atmosphere this habitat matches (its next-test and archive facts apply), or null. */
export function ladderPreset(h: { o2Pct: number; pressurePsia: number }): PresetKey | null {
  return PRESET_ORDER.find((k) => PRESETS[k].o2Pct === h.o2Pct && PRESETS[k].pressurePsia === h.pressurePsia) ?? null;
}

/**
 * Overall grade if the nearest real cabin solid test sat at evidence distance `d`,
 * by the engine's own rule (overallGrade): the surrogate lift still applies.
 */
export function gradeIfSolidDistance(b: Brief, d: number | null, measuredBoth = false): Grade {
  return overallGrade({ ...b.byClass, solid: { ...b.byClass.solid, d, measuredBoth } }).grade;
}

export interface LadderStep {
  kind: 'today' | 'archive' | 'next';
  grade: Grade;
  /** Real-solid evidence distance at this step (unrounded). */
  d: number | null;
  /** Fact the page renders the distance from. */
  factId: string;
  href: string;
  /** The step lowers the real-solid distance below today's. */
  closer: boolean;
}

/**
 * "What would raise this grade": today, with the literature runs not yet in PSI
 * archived there, and after the top suggested test. Each hypothetical step reruns
 * the engine's nearest-test search with the extra points, then overallGrade.
 */
export function gradeLadder(b: Brief, data: HaloData): LadderStep[] {
  const h = b.habitat;
  const solid = data.tests.filter((t) => t.fuelClass === 'solid');
  const preset = ladderPreset(h);
  const today = b.byClass.solid;
  const step = (kind: 'archive' | 'next', extra: TestPoint[], factId: string, href: string): LadderStep => {
    const n = nearestByClass(h, [...solid, ...extra]).solid;
    return { kind, grade: gradeIfSolidDistance(b, n.d, n.measuredBoth), d: n.d, factId, href, closer: n.d !== null && (today.d === null || n.d < today.d - 1e-9) };
  };
  const best = b.nextTests[0];
  const planned: TestPoint[] = best && best.fuelClass === 'solid'
    ? [{ id: 'next:1', psiId: 'PSI-0', acronym: 'Suggested test', fuelClass: 'solid', fuel: 'real cabin solid', o2Pct: best.o2Pct, pressurePsia: best.pressurePsia, o2Src: 'measured', pSrc: 'measured', flowCmS: null }]
    : [];
  return [
    { kind: 'today', grade: b.grade.grade, d: today.d, factId: 'grade-solid-distance', href: '#grade', closer: false },
    step('archive', literaturePoints(data.literature, data.tests), preset ? archiveId(preset, 'after') : 'ladder-archive-distance', '#next-archive'),
    step('next', planned, planned.length === 0 ? 'grade-solid-distance' : preset ? gainId(0, preset, 'after') : 'ladder-next-distance', '#next-test'),
  ];
}

/** The literature missions that "if archived" counts, as a span from the data ("Saffire IV–VI"). */
export function archiveMissionLabel(data: Pick<HaloData, 'literature' | 'tests'>): string {
  return missionSpan(archivableLiterature(data.literature, data.tests).map((r) => r.mission));
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
