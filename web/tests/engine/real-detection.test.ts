import { describe, it, expect } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { detectionFor, sensorWhatIf } from '@/lib/engine/detection';

// Real-data expectations. Skipped while src/data holds the fixture placeholders.
const isReal = HALO_DATA.manifest.totalRows === 1967;

describe.skipIf(!isReal)('real data: detector blind spot', () => {
  const det = HALO_DATA.detector;
  it('kapton scatter is low in 20 of 35 runs (~57.1%)', () => {
    const [k] = detectionFor(['kapton'], ['scatter'], det);
    expect(k.scatterLow).toBe(20);
    expect(k.scatterRuns).toBe(35);
    expect(k.scatterLowPct).toBeCloseTo(57.1, 1);
  });
  it('teflon is ~78.3% (18/23)', () => {
    const [t] = detectionFor(['teflon'], ['scatter'], det);
    expect(t.scatterLowPct).toBeCloseTo(78.3, 1);
  });
  it('cotton is 0', () => {
    expect(detectionFor(['cotton'], ['scatter'], det)[0].scatterLowPct).toBe(0);
  });
  it('kapton what-if: adding ionization raises caught %', () => {
    const w = sensorWhatIf('kapton', det);
    expect(w).toHaveLength(2);
    expect(w[1].caughtPct).toBeGreaterThan(w[0].caughtPct);
  });
  it('pmma has no SAME analog', () => {
    expect(detectionFor(['pmma'], ['scatter'], det)[0].noSameAnalog).toBe(true);
  });
  it('empty materials gives []', () => {
    expect(detectionFor([], ['scatter'], det)).toEqual([]);
  });
});
