import type { Fact } from '@/lib/engine/types';

/**
 * Number grounding for runtime SI text. Every number the SI writes must match
 * a Fact value (or a number inside a text Fact) within a small tolerance.
 * Extraction errs on the side of counting more numbers: an extra number can
 * only turn an answer into the fallback, never let an invented one through.
 */

/** Gas formulas whose digits are subscripts, not quantities. */
const GAS = /\b(?:CO2|O2|N2|H2O|H2|CH4|N2O|NO2|SO2|O3|SF6)\b/g;
/** [fact-id] citations; ids are lowercase letters and hyphens, possibly several per bracket. */
const CITATION = /\[[a-z-]+(?:\s*,\s*[a-z-]+)*\]/g;
/** 1,967 · 20 · 0.118 · .5 (signs are ignored: "5-10" is a range, not -10). */
const NUMBER = /\d{1,3}(?:,\d{3})+(?![\d,])(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+/g;

export function extractNumbers(text: string): number[] {
  const clean = text.replace(CITATION, ' ').replace(GAS, ' ');
  return [...clean.matchAll(NUMBER)].map((m) => Number(m[0].replace(/,/g, '')));
}

/** Every number a list of facts can vouch for: numeric values, plus numbers written inside text values. */
export function factNumbers(facts: Fact[]): number[] {
  return facts.flatMap((f) => (typeof f.value === 'number' ? [f.value] : extractNumbers(f.value)));
}

/**
 * ok when every number in `text` is within `tol` (relative, default 5%) or
 * 0.05 absolute of some fact number. `offending` lists each failing number once.
 */
export function validateNumbers(text: string, facts: Fact[], tol = 0.05): { ok: boolean; offending: number[] } {
  const allowed = factNumbers(facts);
  const abs = tol === 0 ? 0 : 0.05;
  const matches = (n: number) => allowed.some((v) => Math.abs(n - v) <= Math.max(abs, tol * Math.abs(v)));
  const offending = [...new Set(extractNumbers(text).filter((n) => !matches(n)))];
  return { ok: offending.length === 0, offending };
}
