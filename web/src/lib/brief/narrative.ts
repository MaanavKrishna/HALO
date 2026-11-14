import type { Brief } from '@/lib/engine/types';

/**
 * Deterministic plain-language summary built only from the brief's grade and
 * flags. It restates engine text, so it introduces no number of its own.
 * Used until (and whenever) the SI explanation is unavailable.
 */
export function fallbackNarrative(b: Brief): string[] {
  const out: string[] = [];
  const crit = b.flags.filter((f) => f.severity === 'critical');
  const warn = b.flags.filter((f) => f.severity === 'warning');
  const info = b.flags.filter((f) => f.severity === 'info');

  out.push(`${b.habitat.name} has evidence grade ${b.grade.grade}. ${b.grade.reason}`);
  if (crit.length === 0) out.push('No critical gaps were found in the published NASA test evidence for this habitat.');
  else {
    const n = crit.length === 1 ? 'One critical gap stands out' : 'Critical gaps stand out';
    out.push(`${n}: ${crit.map((f) => f.title.charAt(0).toLowerCase() + f.title.slice(1)).join('; ')}.`);
  }
  if (warn.length) out.push(`Also note: ${warn.map((f) => f.title.charAt(0).toLowerCase() + f.title.slice(1)).join('; ')}.`);
  for (const f of info) out.push(f.detail);
  return out;
}
