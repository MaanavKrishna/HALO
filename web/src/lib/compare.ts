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
