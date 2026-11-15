import { describe, expect, it } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { buildBrief } from '@/lib/engine/brief';
import { PRESETS } from '@/lib/engine/presets';
import { QUESTION_MAX } from '@/lib/brief/explain';
import { suggestQuestions } from '@/lib/brief/suggestions';

const brief = (k: keyof typeof PRESETS) => buildBrief({ ...PRESETS[k] }, HALO_DATA);
const GRADE = { artemis: 'D', iss: 'B', moon: 'C', rover: 'C', suit: 'F' } as const;

describe('suggestQuestions', () => {
  for (const k of Object.keys(GRADE) as (keyof typeof GRADE)[]) {
    it(`${k}: starts with its grade, 3-4 short unique questions`, () => {
      const b = brief(k);
      const qs = suggestQuestions(b);
      expect(b.grade.grade).toBe(GRADE[k]);
      expect(qs[0]).toBe(`Why is the grade ${GRADE[k]}?`);
      expect(qs.length).toBeGreaterThanOrEqual(2);
      expect(qs.length).toBeLessThanOrEqual(4);
      expect(new Set(qs).size).toBe(qs.length);
      for (const q of qs) expect(q.length).toBeLessThanOrEqual(QUESTION_MAX);
      expect(suggestQuestions(b)).toEqual(qs);
    });
  }

  it('artemis: grade, Kapton detector, next test, one flow-or-gravity question', () => {
    const b = brief('artemis');
    const qs = suggestQuestions(b);
    expect(qs).toContain('Would my smoke detector catch a Kapton fire?');
    expect(qs).toContain('What test would help most?');
    expect(qs.length).toBe(4);
  });

  it('asks about a detector only when a detector-miss flag exists', () => {
    for (const k of ['artemis', 'iss', 'moon', 'rover', 'suit'] as const) {
      const b = brief(k);
      const missed = b.flags.some((f) => f.id.startsWith('detector-miss-'));
      expect(suggestQuestions(b).some((q) => q.startsWith('Would my smoke detector'))).toBe(missed);
    }
  });

  it('asks about airflow when the flow flag is present, else gravity, never both', () => {
    for (const k of ['artemis', 'iss', 'moon', 'rover', 'suit'] as const) {
      const b = brief(k);
      const qs = suggestQuestions(b);
      const flow = qs.includes('Is my cabin airflow inside what was tested?');
      const grav = qs.includes('What about lunar gravity?');
      expect(flow).toBe(b.flags.some((f) => f.id === 'flow-outside-tested'));
      expect(flow && grav).toBe(false);
    }
  });

  it('omits the next-test question when there is no next test', () => {
    const b = { ...brief('artemis'), nextTests: [] };
    expect(suggestQuestions(b)).not.toContain('What test would help most?');
  });
});
