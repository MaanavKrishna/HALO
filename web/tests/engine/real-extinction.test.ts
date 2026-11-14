import { describe, it, expect } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { extinctionAt } from '@/lib/engine/extinction';
import { nextTests } from '@/lib/engine/nextTest';

// Real-data expectations. Skipped while src/data holds the fixture placeholders.
const isReal = HALO_DATA.manifest.totalRows === 1967;

describe.skipIf(!isReal)('real data: extinction + next test', () => {
  it('artemis extrapolates pressure, iss does not', () => {
    expect(extinctionAt(PRESETS.artemis, HALO_DATA.extinction).extrapolatedPressure).toBe(true);
    expect(extinctionAt(PRESETS.iss, HALO_DATA.extinction).extrapolatedPressure).toBe(false);
  });
  it('p50 at 22.6% O2 is in [0.4, 0.6]', () => {
    const r = extinctionAt({ ...PRESETS.iss, o2Pct: 22.6 }, HALO_DATA.extinction);
    expect(r.p50).toBeGreaterThanOrEqual(0.4);
    expect(r.p50).toBeLessThanOrEqual(0.6);
  });
  it('top next test is solid near 30% O2 / 10 psia, and picks are diverse', () => {
    const r = nextTests(HALO_DATA.tests);
    expect(r).toHaveLength(4);
    expect(r[0].fuelClass).toBe('solid');
    expect(r[0].o2Pct).toBeGreaterThanOrEqual(29);
    expect(r[0].o2Pct).toBeLessThanOrEqual(36);
    expect(r[0].pressurePsia).toBeGreaterThanOrEqual(7.5);
    expect(r[0].pressurePsia).toBeLessThanOrEqual(10.5);
    for (let i = 1; i < r.length; i++) for (let j = 0; j < i; j++) {
      const a = r[i], b = r[j];
      expect(a.fuelClass !== b.fuelClass || Math.abs(a.o2Pct - b.o2Pct) >= 3 || Math.abs(a.pressurePsia - b.pressurePsia) >= 1.5).toBe(true);
    }
  });
});
