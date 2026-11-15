import type { FuelClass, Grade, GradeResult, Nearest } from './types';

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
/** Highest grade a nearby surrogate-fuel test can lift the real-solid grade to. */
export const SURROGATE_CAP: Grade = 'C';
/** Below this, a distance prints as "at these exact conditions" rather than "0.00". */
const EXACT = 0.005;

const where = (d: number) => (d < EXACT ? 'at these exact conditions' : `at evidence distance ${d.toFixed(2)}`);

/** How near the closest real cabin solid test sits, in words, for a class grade. */
const NEARNESS: Record<Grade, string> = {
  A: 'A real cabin material was tested close to this atmosphere, with oxygen and pressure both measured.',
  B: 'A real cabin material was tested close to this atmosphere.',
  C: 'The closest real cabin material test is near this atmosphere, but not close.',
  D: 'The closest real cabin material test is some way from this atmosphere.',
  F: 'No real cabin material in PSI was tested anywhere near this atmosphere.',
};

/**
 * Solid-class grade, raised one step (never above C) when a surrogate fuel is
 * within the B-ring. `reason` is plain language; `technical` states the rule.
 */
export function overallGrade(byClass: Record<FuelClass, Nearest>): GradeResult {
  const base = classGrade(byClass.solid);
  const sur = byClass.solid_surrogate;
  const surrogateNear = sur.d !== null && sur.d <= B_RING;
  const idx = ORDER.indexOf(base);
  if (surrogateNear && idx < ORDER.indexOf(SURROGATE_CAP)) {
    const grade = ORDER[idx + 1];
    // The test is named plainly ("the nearest surrogate-fuel test, BRE,"), so no article has to guess how an acronym is read.
    const named = sur.test ? `, ${sur.test.acronym},` : '';
    const solidPart = byClass.solid.d === null ? 'no eligible real cabin solid test' : `the nearest real cabin solid test sits ${where(byClass.solid.d)}`;
    return {
      grade,
      reason: `${NEARNESS[base].replace(/\.$/, '')}, so real materials alone would grade ${base}. A stand-in (a gas burner that mimics a burning solid) was tested close by, which lifts the grade one step to ${grade}.`,
      technical: `Real cabin solids grade ${base} (${solidPart}); the nearest surrogate-fuel test${named} sits ${where(sur.d!)}, inside the B-ring (evidence distance ${B_RING}), and raises it one step to ${grade}. A surrogate can raise the grade to C at most.`,
    };
  }
  const solid = byClass.solid;
  if (solid.d === null) {
    return {
      grade: base,
      reason: 'No real cabin material has been tested in the eligible PSI data, so the grade is F.',
      technical: 'No eligible solid-fuel test row exists, and no surrogate-fuel test sits inside the B-ring.',
    };
  }
  const named = solid.test ? ` (${solid.test.acronym})` : '';
  return {
    grade: base,
    reason: NEARNESS[base],
    technical: `Set by the nearest real cabin solid test${named}, ${where(solid.d)}.`,
  };
}
