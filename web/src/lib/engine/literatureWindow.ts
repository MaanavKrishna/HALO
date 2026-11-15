import { PRESETS } from './presets';
import { factText, type Fact, type HaloData, type LiteratureRow, type TestPoint } from './types';

/**
 * Real solids burned in the Moon window outside PSI. The challenge's Moon
 * envelope (O2 at or above the Moon preset, pressure at or below it) holds no
 * real solid among the PSI test rows, but NASA reports (literature.json)
 * describe Saffire runs there. These rows are not graded on; every sentence
 * that says "no real solid was tested" is scoped to PSI and points here.
 */

export interface LiteratureWindow {
  rows: LiteratureRow[];
  /** "Saffire VI" (missions, de-hyphenated, in data order). */
  missions: string[];
  /** Short material names ("SIBAL", "PMMA"). */
  materials: string[];
  o2Low: number;
  o2High: number;
  /** Mean pressure, one decimal ("about 7.9 psia"). */
  pressure: number;
  sourceUrls: string[];
  facts: Fact[];
}

const r1 = (x: number) => Number(x.toFixed(1));

const missionKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Whether a literature mission ("Saffire-II") is also a PSI investigation among the test rows (acronym match, case and punctuation ignored). */
export function missionInPsi(mission: string, tests: Pick<TestPoint, 'acronym'>[]): boolean {
  const k = missionKey(mission);
  return tests.some((t) => missionKey(t.acronym) === k);
}

/**
 * Missions named as a span, in data order: ["Saffire-IV", "Saffire-V", "Saffire-VI"] → "Saffire IV–VI";
 * two → "Saffire IV and V"; mixed prefixes are listed in full.
 */
export function missionSpan(missions: string[]): string {
  const ms = uniq(missions.map((m) => m.replace(/-/g, ' ')));
  if (ms.length <= 1) return ms.join('');
  const parts = ms.map((m) => {
    const i = m.lastIndexOf(' ');
    return i < 0 ? { head: '', tail: m } : { head: m.slice(0, i), tail: m.slice(i + 1) };
  });
  const head = parts[0].head;
  if (!head || parts.some((p) => p.head !== head)) return list(ms);
  const tails = parts.map((p) => p.tail);
  return tails.length === 2 ? `${head} ${tails[0]} and ${tails[1]}` : `${head} ${tails[0]}–${tails[tails.length - 1]}`;
}

/** Literature rows whose mission has no PSI test rows (e.g. Saffire IV–VI; Saffire I–III are PSI-98/99/100). */
export function literatureOutsidePsi(literature: LiteratureRow[], tests: Pick<TestPoint, 'acronym'>[]): LiteratureRow[] {
  return literature.filter((r) => !missionInPsi(r.mission, tests));
}
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** "SIBAL fabric 41x50 cm" → "SIBAL"; "Cast PMMA slab" → "PMMA"; falls back to the first word. */
export function shortMaterial(material: string): string {
  const caps = material.match(/\b[A-Z]{3,}\b/);
  return caps ? caps[0] : material.split(/\s+/)[0];
}

/** Literature rows with O2 ≥ o2Min and a recorded pressure ≤ pMax (default: the Moon envelope). */
export function literatureInWindow(
  data: HaloData,
  o2Min: number = PRESETS.moon.o2Pct,
  pMax: number = PRESETS.moon.pressurePsia,
): LiteratureWindow | null {
  const rows = data.literature.filter(
    (r) => r.o2Pct !== null && r.pressurePsia !== null && r.o2Pct >= o2Min && r.pressurePsia <= pMax,
  );
  if (rows.length === 0) return null;
  const o2s = rows.map((r) => r.o2Pct as number);
  const ps = rows.map((r) => r.pressurePsia as number);
  const o2Low = r1(Math.min(...o2s));
  const o2High = r1(Math.max(...o2s));
  const pressure = r1(ps.reduce((a, b) => a + b, 0) / ps.length);
  const missions = uniq(rows.map((r) => r.mission.replace(/-/g, ' ')));
  const materials = uniq(rows.map((r) => shortMaterial(r.material)));
  const sourceUrls = uniq(rows.map((r) => r.sourceUrl));
  const note = `${missions.join(', ')} samples ${rows.map((r) => `${r.sampleId} (${r.material}, ${r.o2Pct}% O2, ${r.pressurePsia} psia)`).join('; ')}. NASA reports, not PSI test rows; HALO does not grade on them.`;
  const source = { url: sourceUrls[0], note };
  const facts: Fact[] = [
    { id: 'lit-window-oxygen-low', label: `Lowest O2 of the ${missions.join(', ')} solids burned in the Moon envelope`, value: o2Low, unit: '%', decimals: 1, provenance: 'literature', source },
    { id: 'lit-window-oxygen-high', label: `Highest O2 of the ${missions.join(', ')} solids burned in the Moon envelope`, value: o2High, unit: '%', decimals: 1, provenance: 'literature', source },
    { id: 'lit-window-pressure', label: `Mean pressure of the ${missions.join(', ')} solids burned in the Moon envelope`, value: pressure, unit: 'psia', decimals: 1, provenance: 'literature', source },
  ];
  return { rows, missions, materials, o2Low, o2High, pressure, sourceUrls, facts };
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** O2 range text, "30.3–31.0" or a single value; one decimal, as the facts display. */
export function windowO2Text(w: LiteratureWindow): string {
  return w.o2Low === w.o2High ? w.o2Low.toFixed(1) : `${w.o2Low.toFixed(1)}–${w.o2High.toFixed(1)}`;
}

/**
 * "Saffire VI (NASA reports, literature) burned SIBAL and PMMA at 30.3–31% O2
 * and about 7.9 psia; these runs are not in PSI, so HALO does not grade on them."
 */
export function literatureWindowSentence(w: LiteratureWindow): string {
  return `${list(w.missions)} (NASA reports, literature) burned ${list(w.materials)} at ${windowO2Text(w)}% O2 and about ${factText(w.facts[2])} psia; these runs are not in PSI, so HALO does not grade on them.`;
}
