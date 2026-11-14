import { PRESETS } from '@/lib/engine/presets';
import { habitatToQuery, queryToHabitat } from '@/lib/engine/url';
import type { Brief, Habitat } from '@/lib/engine/types';

const KNOWN_KEYS = ['o2', 'p', 'f', 'm', 'd', 'l', 'n'];

/**
 * `a` / `b` hold a whole habitat query string (as produced by habitatToQuery).
 * A missing param gives the fallback silently. A param with no readable key
 * falls back to the default preset with a notice. Otherwise parse notices are passed on.
 */
export function habitatFromParam(
  raw: string | string[] | undefined,
  fallback: Habitat,
  side: 'a' | 'b',
): { habitat: Habitat; notices: string[] } {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return { habitat: fallback, notices: [] };
  const q = new URLSearchParams(v);
  if (!KNOWN_KEYS.some((k) => q.has(k))) {
    return { habitat: fallback, notices: [`Could not read habitat "${side}"; showing ${fallback.name} instead.`] };
  }
  const { habitat, notices } = queryToHabitat(q);
  return { habitat, notices: notices.map((n) => `Habitat "${side}": ${n}`) };
}

/** Same atmosphere, flow, materials, detectors and liquids (the name is ignored). */
export function samePreset(a: Habitat, b: Habitat): boolean {
  const key = (h: Habitat) => habitatToQuery({ ...h, name: '' });
  return key(a) === key(b);
}

export function compareHref(a: Habitat, b: Habitat): string {
  const q = new URLSearchParams({ a: habitatToQuery(a), b: habitatToQuery(b) });
  return `/compare?${q.toString()}`;
}

export const briefHref = (h: Habitat) => `/brief?${habitatToQuery(h)}`;

export const DEFAULT_A = PRESETS.iss;
export const DEFAULT_B = PRESETS.artemis;

/** Short plain-language differences between two briefs. Flags are matched by id. */
export function changes(a: Brief, b: Brief): { gradeChanged: boolean; added: Brief['flags']; removed: Brief['flags'] } {
  const idsA = new Set(a.flags.map((f) => f.id));
  const idsB = new Set(b.flags.map((f) => f.id));
  return {
    gradeChanged: a.grade.grade !== b.grade.grade,
    added: b.flags.filter((f) => !idsA.has(f.id)),
    removed: a.flags.filter((f) => !idsB.has(f.id)),
  };
}

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F'] as const;

export interface CompareDelta {
  o2: number;
  pressure: number;
  flow: number;
  grade: { from: Brief['grade']['grade']; to: Brief['grade']['grade']; direction: 'firmer' | 'thinner' | 'same' };
  added: Brief['flags'];
  removed: Brief['flags'];
  kept: Brief['flags'];
  detection: Array<{ material: Brief['detection'][number]['material']; from: number | null; to: number | null; diff: number | null }>;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Everything that changes from brief a to brief b, computed from the two briefs. */
export function compareDelta(a: Brief, b: Brief): CompareDelta {
  const { added, removed } = changes(a, b);
  const idsA = new Set(a.flags.map((f) => f.id));
  const ga = GRADE_ORDER.indexOf(a.grade.grade);
  const gb = GRADE_ORDER.indexOf(b.grade.grade);
  const pct = (d: Brief['detection'][number] | undefined) => (d && d.caughtRuns > 0 && d.caughtPct !== null ? d.caughtPct : null);
  const materials = [...new Set([...a.detection.map((d) => d.material), ...b.detection.map((d) => d.material)])];
  return {
    o2: r2(b.habitat.o2Pct - a.habitat.o2Pct),
    pressure: r2(b.habitat.pressurePsia - a.habitat.pressurePsia),
    flow: r2(b.habitat.flowCmS - a.habitat.flowCmS),
    grade: { from: a.grade.grade, to: b.grade.grade, direction: gb === ga ? 'same' : gb < ga ? 'firmer' : 'thinner' },
    added,
    removed,
    kept: b.flags.filter((f) => idsA.has(f.id)),
    detection: materials.map((m) => {
      const from = pct(a.detection.find((d) => d.material === m));
      const to = pct(b.detection.find((d) => d.material === m));
      return { material: m, from, to, diff: from !== null && to !== null ? r2(to - from) : null };
    }),
  };
}

/** Which preset key a habitat matches, or null for a custom habitat. */
export function presetKey(h: Habitat): keyof typeof PRESETS | null {
  const hit = (Object.keys(PRESETS) as Array<keyof typeof PRESETS>).find((k) => samePreset(PRESETS[k], h));
  return hit ?? null;
}
