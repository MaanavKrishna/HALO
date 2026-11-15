import { describe, expect, it } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { buildBrief } from '@/lib/engine/brief';
import { PRESETS } from '@/lib/engine/presets';
import type { TestPoint } from '@/lib/engine/types';
import { RANKED_SHOWN } from '@/lib/brief/context';
import { listWords, lowRankedSmokeEvidence, rankedFuels, surrogateCaveat } from '@/lib/brief/notes';

const row = (psiId: string, fuel: string): TestPoint => ({
  id: `${psiId}:${fuel}`, psiId, acronym: 'X', fuelClass: 'solid', fuel, o2Pct: 21, pressurePsia: 14.7, o2Src: 'measured', pSrc: 'measured',
});

describe('rankedFuels', () => {
  it('drops "(see previous row)" placeholders and repeats, most frequent first', () => {
    const tests = [
      row('PSI-1', 'Silicone'), row('PSI-1', '(see previous row)'), row('PSI-1', '(See Previous Row)'), row('PSI-1', 'Cotton'),
      row('PSI-1', 'cotton '), row('PSI-1', ' Cot ton'), row('PSI-1', ''), row('PSI-2', 'PMMA'),
    ];
    expect(rankedFuels(tests, 'PSI-1')).toEqual({ shown: ['Cotton', 'Silicone'], total: 2 });
  });

  it('counts the labels left over after the shown ones', () => {
    const tests = ['a', 'b', 'c', 'd', '(see previous row)'].map((f) => row('PSI-1', f));
    expect(rankedFuels(tests, 'PSI-1', 3)).toEqual({ shown: ['a', 'b', 'c'], total: 4 });
  });

  it('shows no placeholder for any investigation in the real data', () => {
    for (const inv of HALO_DATA.investigations) {
      const { shown } = rankedFuels(HALO_DATA.tests, inv.psiId, 99);
      expect(shown.join('; ')).not.toMatch(/see previous row/i);
      expect(new Set(shown.map((f) => f.toLowerCase().replace(/\s+/g, ''))).size).toBe(shown.length);
    }
    // SAFFIRE-II is the investigation whose rows carry the placeholder.
    expect(HALO_DATA.tests.some((t) => t.psiId === 'PSI-99' && /see previous row/i.test(t.fuel))).toBe(true);
  });
});

describe('lowRankedSmokeEvidence', () => {
  const shown = (id: keyof typeof PRESETS) => buildBrief({ ...PRESETS[id] }, HALO_DATA).ranked.slice(0, RANKED_SHOWN);

  it('names every low-ranked smoke-detection row for Artemis, in rank order', () => {
    expect(lowRankedSmokeEvidence(shown('artemis'))).toEqual(['SAME-R', 'SAME']);
    expect(listWords(lowRankedSmokeEvidence(shown('moon')))).toBe('SAME-R, SAME and DAFT / DAFT-2');
  });

  it('is empty at ISS air, where the smoke tests are as close as the top-ranked test', () => {
    expect(lowRankedSmokeEvidence(shown('iss'))).toEqual([]);
  });

  it('is empty when the list holds no smoke-detection row', () => {
    expect(lowRankedSmokeEvidence(shown('artemis').filter((r) => !r.inv.hazards.includes('smoke_detection')))).toEqual([]);
  });

  it('joins names in words', () => {
    expect([listWords([]), listWords(['A']), listWords(['A', 'B'])]).toEqual(['', 'A', 'A and B']);
  });
});

describe('surrogateCaveat', () => {
  const brief = (id: keyof typeof PRESETS) => buildBrief({ ...PRESETS[id] }, HALO_DATA);

  it('reports the inferred pressure behind the Artemis lift from F', () => {
    expect(surrogateCaveat(brief('artemis'))).toEqual({ acronym: 'ACME BRE', pressureSrc: 'inferred', without: 'F' });
  });

  it('is null when no stand-in lifts the grade', () => {
    expect(surrogateCaveat(brief('iss'))).toBeNull();
    expect(surrogateCaveat(brief('suit'))).toBeNull();
  });

  it('is null when the stand-in pressure was measured', () => {
    const b = brief('artemis');
    const sur = b.byClass.solid_surrogate;
    const measured = { ...b, byClass: { ...b.byClass, solid_surrogate: { ...sur, test: { ...sur.test!, pSrc: 'measured' as const } } } };
    expect(surrogateCaveat(measured)).toBeNull();
  });
});
