import { describe, it, expect } from 'vitest';
import { loadFixtureData } from '@/lib/data/fixtures';
import { PRESETS } from '@/lib/engine/presets';
import { extinctionAt } from '@/lib/engine/extinction';
import type { ExtinctionData } from '@/lib/engine/types';

const ext = loadFixtureData().extinction;

describe('extinctionAt', () => {
  it('flags pressure extrapolation for Artemis (0.56 atm) and clamps to 0.7', () => {
    const r = extinctionAt(PRESETS.artemis, ext);
    expect(r.extrapolatedPressure).toBe(true);
    expect(r.pAtmUsed).toBeCloseTo(0.7, 6);
  });
  it('does not flag ISS', () => {
    const r = extinctionAt(PRESETS.iss, ext);
    expect(r.extrapolatedPressure).toBe(false);
    expect(r.pAtmUsed).toBeLessThanOrEqual(1);
  });
  it('flags O2 outside the tested range', () => {
    expect(extinctionAt(PRESETS.suit, ext).extrapolatedO2).toBe(true);
    expect(extinctionAt(PRESETS.iss, ext).extrapolatedO2).toBe(false);
  });
  it('curve spans 10..45 step 0.5 with non-increasing p50 and ordered bands', () => {
    const { curve } = extinctionAt(PRESETS.iss, ext);
    expect(curve[0].o2).toBe(10);
    expect(curve[curve.length - 1].o2).toBe(45);
    expect(curve).toHaveLength(71);
    for (let i = 1; i < curve.length; i++) expect(curve[i].p50).toBeLessThanOrEqual(curve[i - 1].p50 + 1e-12);
    for (const c of curve) { expect(c.lo).toBeLessThanOrEqual(c.p50); expect(c.p50).toBeLessThanOrEqual(c.hi); }
  });
  it('p50 at 22.6% O2 and 1 atm is in [0.4, 0.6]', () => {
    const r = extinctionAt({ ...PRESETS.iss, o2Pct: 22.6 }, ext);
    expect(r.p50).toBeGreaterThanOrEqual(0.4);
    expect(r.p50).toBeLessThanOrEqual(0.6);
  });
  it('matches a hand-computed logistic for a single-row model', () => {
    const one: ExtinctionData = { ...ext, coefs: [[1, -0.1, 0, 0]] };
    const r = extinctionAt({ ...PRESETS.iss, o2Pct: 20 }, one);
    expect(r.p50).toBeCloseTo(1 / (1 + Math.exp(1)), 9);
    expect(r.lo).toBeCloseTo(r.p50, 12);
  });
});
