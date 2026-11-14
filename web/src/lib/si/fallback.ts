import type { Brief } from '@/lib/engine/types';

/**
 * Precomputed narrative shown before (or instead of) live SI text. Built only
 * from the grade letter and the flags, whose numbers all come from Facts, so it
 * passes validateNumbers against brief.facts. Deterministic: same brief, same text.
 */

const cite = (ids: string[]) => ids.map((id) => `[${id}]`).join(' ');

export function fallbackNarrative(brief: Brief): string {
  const parts = [`Evidence grade ${brief.grade.grade}.`];
  for (const f of brief.flags) {
    const ids = f.factIds.length ? ` ${cite(f.factIds)}` : '';
    parts.push(`${f.title}. ${f.detail}${ids}`);
  }
  return parts.join(' ');
}

/** Fact ids cited by fallbackNarrative, in order of first use. */
export function fallbackFactIds(brief: Brief): string[] {
  return [...new Set(brief.flags.flatMap((f) => f.factIds))];
}
