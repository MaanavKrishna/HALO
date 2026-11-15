import { classGrade } from '@/lib/engine/grade';
import type { Brief, ConditionSource, Grade, RankedInvestigation, TestPoint } from '@/lib/engine/types';

/** PSI rows that only point at the row above carry no fuel of their own. */
const PLACEHOLDER_FUEL = /see previous row/i;

/**
 * Distinct fuel / sample labels an investigation's test rows record, most
 * frequent first. Placeholder cells ("(see previous row)") and repeats that
 * differ only in case or spacing are dropped.
 */
export function rankedFuels(tests: TestPoint[], psiId: string, max = 3): { shown: string[]; total: number } {
  const counts = new Map<string, { label: string; n: number }>();
  for (const t of tests) {
    if (t.psiId !== psiId) continue;
    const label = t.fuel.replace(/\s+/g, ' ').trim();
    if (!label || PLACEHOLDER_FUEL.test(label)) continue;
    // "100% C2H4" and "100%C2H4" are one fuel.
    const key = label.toLowerCase().replace(/\s+/g, '');
    const seen = counts.get(key);
    if (seen) seen.n += 1;
    else counts.set(key, { label, n: 1 });
  }
  const all = [...counts.values()].sort((a, b) => b.n - a.n || (a.label < b.label ? -1 : 1)).map((x) => x.label);
  return { shown: all.slice(0, max), total: all.length };
}

/**
 * The smoke-detector investigation the ranking note names: SAME, when the
 * shown list holds it in its lower half and it sits further from the habitat
 * atmosphere than the top-ranked investigation does. Null otherwise.
 */
export function lowRankedSmokeEvidence(ranked: RankedInvestigation[]): string | null {
  const i = ranked.findIndex((r) => r.inv.acronym === 'SAME' && r.inv.hazards.includes('smoke_detection'));
  if (i < 0 || ranked.length < 2) return null;
  const low = i >= ranked.length / 2 && ranked[i].parts.proximity < ranked[0].parts.proximity;
  return low ? ranked[i].inv.acronym : null;
}

export interface SurrogateCaveat {
  /** Acronym of the stand-in test that lifts the grade. */
  acronym: string;
  /** Provenance of that test row's pressure; never 'measured' here. */
  pressureSrc: Exclude<ConditionSource, 'measured'>;
  /** The grade real cabin solids alone would get. */
  without: Grade;
}

/**
 * Set when the grade is lifted by a stand-in test whose pressure was not
 * logged by the experiment: the lift then rests on a pressure HALO read from
 * the investigation's documentation.
 */
export function surrogateCaveat(brief: Pick<Brief, 'grade' | 'byClass'>): SurrogateCaveat | null {
  const without = classGrade(brief.byClass.solid);
  const test = brief.byClass.solid_surrogate.test;
  if (!test || without === brief.grade.grade || test.pSrc === 'measured') return null;
  return { acronym: test.acronym, pressureSrc: test.pSrc, without };
}
