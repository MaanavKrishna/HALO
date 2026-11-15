import { scaledDistance } from './distance';
import { literatureOutsidePsi } from './literatureWindow';
import { PRESETS } from './presets';
import type { FuelClass, HaloData, LiteratureRow, NextTestCandidate, TestPoint } from './types';

export const PRESET_PRIORITY = { artemis: 3, moon: 3, rover: 2, iss: 1, suit: 1 } as const;

const GRID_CLASSES: FuelClass[] = ['solid', 'droplet', 'gas'];
const CLASS_WEIGHT: Record<string, number> = { solid: 2, droplet: 1, gas: 1 };
const DIST_CAP = 3;
const MIN_O2_GAP = 3;
const MIN_P_GAP = 1.5;

type PresetKey = keyof typeof PRESET_PRIORITY;
const PRESET_KEYS = Object.keys(PRESET_PRIORITY) as PresetKey[];

function differs(a: NextTestCandidate, b: NextTestCandidate): boolean {
  return (
    a.fuelClass !== b.fuelClass ||
    Math.abs(a.o2Pct - b.o2Pct) >= MIN_O2_GAP ||
    Math.abs(a.pressurePsia - b.pressurePsia) >= MIN_P_GAP
  );
}

/**
 * Rank candidate tests by how much they would close the evidence gap for the
 * habitat presets. Each candidate is scored as if it were a measured test of
 * its own fuel class; distances are capped before differencing.
 */
export function nextTests(tests: TestPoint[], k = 4): NextTestCandidate[] {
  // Nearest existing distance per class per preset, computed once.
  const before = {} as Record<string, Record<PresetKey, number>>;
  for (const fc of GRID_CLASSES) {
    const subset = tests.filter((t) => t.fuelClass === fc);
    const row = {} as Record<PresetKey, number>;
    for (const key of PRESET_KEYS) {
      const h = PRESETS[key];
      let best = Infinity;
      for (const t of subset) best = Math.min(best, scaledDistance(h.o2Pct, h.pressurePsia, t.o2Pct, t.pressurePsia));
      row[key] = Math.min(DIST_CAP, best);
    }
    before[fc] = row;
  }

  const all: NextTestCandidate[] = [];
  for (const fc of GRID_CLASSES) {
    for (let o2 = 25; o2 <= 40; o2 += 1) {
      for (let p = 4; p <= 15; p += 0.5) {
        const gains: NextTestCandidate['gains'] = [];
        let score = 0;
        for (const key of PRESET_KEYS) {
          const h = PRESETS[key];
          const b = before[fc][key];
          const a = Math.min(b, scaledDistance(h.o2Pct, h.pressurePsia, o2, p), DIST_CAP);
          gains.push({ preset: key, before: b, after: a });
          score += CLASS_WEIGHT[fc] * PRESET_PRIORITY[key] * (b - a);
        }
        all.push({ fuelClass: fc, o2Pct: o2, pressurePsia: p, score, gains });
      }
    }
  }
  all.sort((x, y) => y.score - x.score || x.o2Pct - y.o2Pct || x.pressurePsia - y.pressurePsia);

  const picked: NextTestCandidate[] = [];
  for (const c of all) {
    if (picked.length >= k) break;
    if (picked.every((p) => differs(c, p))) picked.push(c);
  }
  return picked;
}

/** Literature runs that could count as new coverage: a recorded O2 and pressure, from a mission with no PSI test rows. */
export function archivableLiterature(literature: LiteratureRow[], tests: Pick<TestPoint, 'acronym'>[]): LiteratureRow[] {
  return literatureOutsidePsi(literature, tests).filter((r) => r.o2Pct !== null && r.pressurePsia !== null);
}

/**
 * Literature runs as solid-fuel coverage points (Saffire burned real solids).
 * Missions already in PSI (Saffire I–III are PSI-98/99/100) are left out: their
 * conditions are already PSI rows, so archiving them would add nothing.
 */
export function literaturePoints(literature: LiteratureRow[], tests: Pick<TestPoint, 'acronym'>[]): TestPoint[] {
  return archivableLiterature(literature, tests)
    .map((r) => ({
      id: `lit:${r.mission}:${r.sampleId}`,
      psiId: 'PSI-0',
      acronym: r.mission,
      fuelClass: 'solid' as const,
      fuel: r.material,
      o2Pct: r.o2Pct as number,
      pressurePsia: r.pressurePsia as number,
      o2Src: 'measured' as const,
      pSrc: 'measured' as const,
      flowCmS: r.flowCmS,
    }));
}

/**
 * The same search, counting the literature runs not yet in PSI as if their data
 * were archived there. Where the pick moves shows what those flights already cover.
 */
export function nextTestsIfArchived(data: HaloData, k = 4): NextTestCandidate[] {
  return nextTests([...data.tests, ...literaturePoints(data.literature, data.tests)], k);
}

/** The archivable literature run nearest a point (the one that sets its "if archived" distance), or null. */
export function nearestArchivable(p: { o2Pct: number; pressurePsia: number }, data: HaloData): LiteratureRow | null {
  let best: { d: number; row: LiteratureRow } | null = null;
  for (const r of archivableLiterature(data.literature, data.tests)) {
    const d = scaledDistance(p.o2Pct, p.pressurePsia, r.o2Pct as number, r.pressurePsia as number);
    if (best === null || d < best.d) best = { d, row: r };
  }
  return best?.row ?? null;
}

/** Nearest literature run to a candidate (same fuel class only), or null. */
export function nearestLiterature(c: NextTestCandidate, literature: LiteratureRow[]): { d: number; row: LiteratureRow } | null {
  if (c.fuelClass !== 'solid') return null;
  let best: { d: number; row: LiteratureRow } | null = null;
  for (const r of literature) {
    if (r.o2Pct === null || r.pressurePsia === null) continue;
    const d = scaledDistance(c.o2Pct, c.pressurePsia, r.o2Pct, r.pressurePsia);
    if (best === null || d < best.d) best = { d, row: r };
  }
  return best;
}

/**
 * Real-solid evidence distance per preset from PSI rows alone, and with the
 * literature runs not yet in PSI counted as if archived there (both capped like the search).
 */
export function archiveGains(data: HaloData): NextTestCandidate['gains'] {
  const psi = data.tests.filter((t) => t.fuelClass === 'solid');
  const lit = literaturePoints(data.literature, data.tests);
  const near = (h: { o2Pct: number; pressurePsia: number }, pts: TestPoint[]) =>
    Math.min(DIST_CAP, ...pts.map((t) => scaledDistance(h.o2Pct, h.pressurePsia, t.o2Pct, t.pressurePsia)));
  return PRESET_KEYS.map((key) => {
    const h = PRESETS[key];
    const before = near(h, psi);
    return { preset: key, before, after: Math.min(before, near(h, lit)) };
  });
}
