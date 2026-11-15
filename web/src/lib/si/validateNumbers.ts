import type { Fact } from '@/lib/engine/types';

/**
 * Number grounding for runtime SI text. SI text never introduces a number that
 * is not a Fact value: every number it writes must equal a Fact value rounded
 * to the precision the SI wrote it with ("0.25" or "0.2" for 0.248, never
 * "0.29"; "92" for 92.3; "20" never "21"). Extraction errs on the side of
 * counting more: an extra number can only turn an answer into the fallback.
 */

/** Gas formulas whose digits are subscripts, not quantities. */
const GAS = /\b(?:CO2|O2|N2|H2O|H2|CH4|N2O|NO2|SO2|O3|SF6)\b/g;
/** [fact-id] citations; ids are lowercase letters and hyphens, possibly several per bracket. */
const CITATION = /\[[a-z-]+(?:\s*,\s*[a-z-]+)*\]/g;
/** 1,967 · 20 · 0.118 · .5 (signs are ignored: "5-10" is a range, not -10). */
const NUMBER = /\d{1,3}(?:,\d{3})+(?![\d,])(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+/g;
/** Digits other than ASCII 0-9: full-width, Arabic-Indic, superscripts, fractions, circled numbers. */
const FOREIGN_DIGIT = /(?![0-9])[\p{Nd}\p{No}]/u;
/** Spelled-out numbers. "one" is left out so that "one of the runs" passes. */
const NUMBER_WORD =
  /\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|percent)\b/i;

/**
 * Digits that name something rather than measure it, in fact labels and text
 * values: ids and standard numbers (II-5, PSI-25, NASA-STD-3001), letter-glued
 * names (FM2), "Test 1"-style designations, and years. They are dropped before
 * a fact's text is read into the allowlist, so "5" from sample II-5 never
 * vouches for an SI "5".
 */
const ID_LIKE = [
  /\b[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d[A-Za-z0-9]*\b/g,
  /\b[A-Za-z]+\d+[A-Za-z0-9]*\b/g,
  /\b(?:Test|Method|Sample|Run)\s+\d+\b/gi,
  /\b(?:19|20)\d{2}\b/g,
];

export interface NumToken { value: number; decimals: number }

function tokens(text: string): NumToken[] {
  const clean = text.replace(CITATION, ' ').replace(GAS, ' ');
  return [...clean.matchAll(NUMBER)].map((m) => {
    const raw = m[0].replace(/,/g, '');
    const dot = raw.indexOf('.');
    return { value: Number(raw), decimals: dot === -1 ? 0 : raw.length - dot - 1 };
  });
}

/** Numbers written in the text, with the decimals each was written to. */
export function numberTokens(text: string): NumToken[] {
  return tokens(text);
}

/** True when a written number equals the value, or the value rounded to the written decimals. */
export function numberMatches(t: NumToken, v: number): boolean {
  return v === t.value || Math.abs(roundTo(v, t.decimals) - t.value) < EPS;
}

export function extractNumbers(text: string): number[] {
  return tokens(text).map((t) => t.value);
}

/** True when the text writes a number some other way than ASCII digits. */
export function hasHiddenNumbers(text: string): boolean {
  return FOREIGN_DIGIT.test(text) || NUMBER_WORD.test(text);
}

/** Quantities written in a fact's own text (label or text value), with id-like digits and years dropped. */
export function factTextTokens(text: string): NumToken[] {
  // Gas formulas go first so the letter-glued rule never sees them.
  const clean = ID_LIKE.reduce((t, re) => t.replace(re, ' '), text.replace(CITATION, ' ').replace(GAS, ' '));
  return tokens(clean);
}

/**
 * Every number a list of facts can vouch for: numeric values, quantities
 * written inside text values, and quantities in the (server-owned) labels.
 * Ids, standard numbers and years in that text never count (see ID_LIKE).
 */
export function factNumbers(facts: Fact[]): number[] {
  return facts.flatMap((f) => [
    ...(typeof f.value === 'number' ? [f.value] : factTextTokens(f.value).map((t) => t.value)),
    ...factTextTokens(f.label).map((t) => t.value),
  ]);
}

const EPS = 1e-9;
const roundTo = (v: number, k: number) => Math.round(v * 10 ** k) / 10 ** k;

/**
 * ok when every number in `text` equals some fact number, or that number
 * rounded to the decimals the text wrote, and the text spells no number in
 * words or non-ASCII digits. `offending` lists each unmatched digit number once.
 */
export function validateNumbers(text: string, facts: Fact[]): { ok: boolean; offending: number[] } {
  const allowed = factNumbers(facts);
  const matches = (t: NumToken) => allowed.some((v) => numberMatches(t, v));
  const offending = [...new Set(tokens(text).filter((t) => !matches(t)).map((t) => t.value))];
  return { ok: offending.length === 0 && !hasHiddenNumbers(text), offending };
}
