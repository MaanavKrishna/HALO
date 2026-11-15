import { describe, it, expect } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { buildBrief } from '@/lib/engine/brief';
import { overallGrade } from '@/lib/engine/grade';
import { allFacts, gradeIfSolidDistance, gradeLadder } from '@/lib/brief/pageFacts';

describe('grade ladder', () => {
  for (const [key, h] of Object.entries(PRESETS)) {
    const b = buildBrief(h, HALO_DATA);
    const steps = gradeLadder(b, HALO_DATA);
    const ids = new Set(allFacts(b, HALO_DATA).map((f) => f.id));
    it(`${key}: today matches the brief, and the helper reproduces it at today's distance`, () => {
      console.log(key, steps.map((s) => `${s.kind}:${s.grade}:${s.d?.toFixed(2)}:${s.factId}`).join(' | '));
      expect(steps[0].grade).toBe(b.grade.grade);
      expect(gradeIfSolidDistance(b, b.byClass.solid.d, b.byClass.solid.measuredBoth)).toBe(b.grade.grade);
    });
    it(`${key}: each hypothetical grade is overallGrade at that step's distance, never closer-but-worse`, () => {
      for (const s of steps.slice(1)) {
        expect(s.grade).toBe(overallGrade({ ...b.byClass, solid: { ...b.byClass.solid, d: s.d, measuredBoth: s.grade === 'A' } }).grade);
        if (s.d !== null && b.byClass.solid.d !== null) expect(s.d).toBeLessThanOrEqual(b.byClass.solid.d + 1e-9);
      }
    });
    it(`${key}: every step renders its distance from a fact`, () => {
      for (const s of steps) expect(ids.has(s.factId), s.factId).toBe(true);
    });
  }
  it('Artemis: archiving and the suggested test both raise the D', () => {
    const b = buildBrief(PRESETS.artemis, HALO_DATA);
    const [today, arch, next] = gradeLadder(b, HALO_DATA);
    expect(today.grade).toBe('D');
    expect(arch.grade).not.toBe('D');
    expect(next.grade).not.toBe('D');
  });
});
