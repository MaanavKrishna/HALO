import { PRESETS } from '@/lib/engine/presets';
import { habitatToQuery, queryToHabitat } from '@/lib/engine/url';
import type { Brief, Habitat } from '@/lib/engine/types';

/** `a` / `b` hold a whole habitat query string (as produced by habitatToQuery). */
export function habitatFromParam(raw: string | string[] | undefined, fallback: Habitat): Habitat {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return fallback;
  return queryToHabitat(new URLSearchParams(v)).habitat;
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
