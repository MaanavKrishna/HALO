import type { FuelClass, Grade, Nearest } from './types';

export function classGrade(n: Nearest): Grade {
  if (n.d === null) return 'F';
  if (n.d <= 0.5) return n.measuredBoth ? 'A' : 'B';
  if (n.d <= 1.0) return 'C';
  if (n.d <= 2.0) return 'D';
  return 'F';
}

const ORDER: Grade[] = ['F', 'D', 'C', 'B', 'A'];

/** Solid-class grade, raised one step (never above C) when a surrogate fuel is within d <= 0.5. */
export function overallGrade(byClass: Record<FuelClass, Nearest>): { grade: Grade; reason: string } {
  const base = classGrade(byClass.solid);
  const sur = byClass.solid_surrogate;
  const surrogateNear = sur.d !== null && sur.d <= 0.5;
  const idx = ORDER.indexOf(base);
  if (surrogateNear && idx < ORDER.indexOf('C')) {
    const grade = ORDER[idx + 1];
    return {
      grade,
      reason: `Solid-fuel evidence grades ${base}; a surrogate-fuel test within d = ${sur.d!.toFixed(2)} raises it one step to ${grade} (capped at C).`,
    };
  }
  const d = byClass.solid.d;
  return {
    grade: base,
    reason: d === null
      ? 'No solid-fuel tests are eligible, so the grade is F.'
      : `Grade set by the nearest solid-fuel test at d = ${d.toFixed(2)}.`,
  };
}
