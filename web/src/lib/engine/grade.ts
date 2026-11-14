import type { FuelClass, Grade, Nearest } from './types';

/** Evidence-distance limits for grades B (and A), C and D: the "halo rings". */
export const GRADE_RINGS = [0.5, 1.0, 2.0] as const;
const [B_RING, C_RING, D_RING] = GRADE_RINGS;

export function classGrade(n: Nearest): Grade {
  if (n.d === null) return 'F';
  if (n.d <= B_RING) return n.measuredBoth ? 'A' : 'B';
  if (n.d <= C_RING) return 'C';
  if (n.d <= D_RING) return 'D';
  return 'F';
}

const ORDER: Grade[] = ['F', 'D', 'C', 'B', 'A'];
/** Below this, a distance prints as "at these exact conditions" rather than "0.00". */
const EXACT = 0.005;

/** "a" or "an" for the word that follows (acronyms read by their first letter's sound). */
const article = (next: string) => (/^[AEFHILMNORSX]/.test(next) ? 'an' : 'a');

const where = (d: number) => (d < EXACT ? 'at these exact conditions' : `at evidence distance ${d.toFixed(2)}`);

/** Solid-class grade, raised one step (never above C) when a surrogate fuel is within the B-ring. */
export function overallGrade(byClass: Record<FuelClass, Nearest>): { grade: Grade; reason: string } {
  const base = classGrade(byClass.solid);
  const sur = byClass.solid_surrogate;
  const surrogateNear = sur.d !== null && sur.d <= B_RING;
  const idx = ORDER.indexOf(base);
  if (surrogateNear && idx < ORDER.indexOf('C')) {
    const grade = ORDER[idx + 1];
    const acronym = sur.test ? `${sur.test.acronym} ` : '';
    return {
      grade,
      reason: `Real cabin solids grade ${base}; ${article(acronym || 's')} ${acronym}surrogate-fuel test ${where(sur.d!)} raises it one step to ${grade} (raised grades are capped at C).`,
    };
  }
  const solid = byClass.solid;
  if (solid.d === null) return { grade: base, reason: 'No real cabin solid has been tested in the eligible data, so the grade is F.' };
  const acronym = solid.test ? `${solid.test.acronym} ` : '';
  return {
    grade: base,
    reason: `Set by the nearest real cabin solid, ${article(acronym || 't')} ${acronym}test ${where(solid.d)}.`,
  };
}
