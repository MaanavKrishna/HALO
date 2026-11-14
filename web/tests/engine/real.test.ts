import { describe, it, expect } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { nearestByClass } from '@/lib/engine/distance';
import { overallGrade } from '@/lib/engine/grade';

// Real-data expectations. Skipped while src/data holds the fixture placeholders.
// One describe block per engine module; later tasks append their own.
const isReal = HALO_DATA.manifest.totalRows === 1967;

describe.skipIf(!isReal)('real data: distance + grade', () => {
  const grade = (k: keyof typeof PRESETS) =>
    overallGrade(nearestByClass(PRESETS[k], HALO_DATA.tests)).grade;

  it('artemis is D', () => expect(grade('artemis')).toBe('D'));
  it('moon envelope is C', () => expect(grade('moon')).toBe('C'));
  it('ISS is B', () => expect(grade('iss')).toBe('B'));
  it('EVA suit is F', () => expect(grade('suit')).toBe('F'));
});
