import { describe, it, expect } from 'vitest';
import { PRESETS } from '@/lib/engine/presets';
import { scaledDistance, nearestByClass, nearestForInvestigation } from '@/lib/engine/distance';
import type { TestPoint } from '@/lib/engine/types';

const tp = (o: Partial<TestPoint>): TestPoint => ({
  id: 'x', psiId: 'PSI-1', acronym: 'X', fuelClass: 'solid', fuel: 'f',
  o2Pct: 21, pressurePsia: 14.7, o2Src: 'measured', pSrc: 'measured', ...o,
});

describe('presets', () => {
  it('match the spec table', () => {
    expect(PRESETS.iss).toMatchObject({ o2Pct: 21, pressurePsia: 14.7, flowCmS: 10 });
    expect(PRESETS.artemis).toMatchObject({ o2Pct: 34, pressurePsia: 8.2, flowCmS: 10 });
    expect(PRESETS.moon).toMatchObject({ o2Pct: 30, pressurePsia: 10.2, flowCmS: 10 });
    expect(PRESETS.rover).toMatchObject({ o2Pct: 30, pressurePsia: 10.2, flowCmS: 5 });
    expect(PRESETS.suit).toMatchObject({ o2Pct: 100, pressurePsia: 4.3, flowCmS: 0 });
    for (const h of Object.values(PRESETS)) {
      expect(h.materials).toEqual(['kapton', 'teflon', 'cotton']);
      expect(h.detectors).toEqual(['scatter']);
      expect(h.liquids).toBe(false);
    }
  });
});

describe('scaledDistance', () => {
  it('artemis vs ISS air is about 2.47', () => {
    expect(scaledDistance(34, 8.2, 22.2, 14.7)).toBeCloseTo(2.47, 2);
  });
  it('is zero for identical points and symmetric', () => {
    expect(scaledDistance(21, 14.7, 21, 14.7)).toBe(0);
    expect(scaledDistance(10, 3, 20, 6)).toBeCloseTo(scaledDistance(20, 6, 10, 3), 12);
  });
  it('10 O2 points equal 3 psia', () => {
    expect(scaledDistance(30, 10, 20, 10)).toBeCloseTo(1, 12);
    expect(scaledDistance(30, 13, 30, 10)).toBeCloseTo(1, 12);
  });
});

describe('nearestByClass', () => {
  it('returns d=null and no test for a class without tests', () => {
    const r = nearestByClass(PRESETS.iss, [tp({ fuelClass: 'solid' })]);
    expect(r.gas).toMatchObject({ fuelClass: 'gas', d: null, test: null, o2Gap: null, pGap: null, measuredBoth: false });
    expect(r.droplet.d).toBeNull();
    expect(r.solid.d).toBe(0);
  });
  it('picks the nearest test per class with signed gaps', () => {
    const near = tp({ id: 'near', o2Pct: 24, pressurePsia: 14.7 });
    const far = tp({ id: 'far', o2Pct: 40, pressurePsia: 5 });
    const r = nearestByClass(PRESETS.iss, [far, near]);
    expect(r.solid.test?.id).toBe('near');
    expect(r.solid.o2Gap).toBeCloseTo(3);
    expect(r.solid.pGap).toBeCloseTo(0);
    expect(r.solid.d).toBeCloseTo(0.3);
  });
  it('measuredBoth requires both sources measured', () => {
    const a = nearestByClass(PRESETS.iss, [tp({ pSrc: 'inferred' })]);
    expect(a.solid.measuredBoth).toBe(false);
    const b = nearestByClass(PRESETS.iss, [tp({})]);
    expect(b.solid.measuredBoth).toBe(true);
  });
});

describe('nearestForInvestigation', () => {
  it('filters by psiId', () => {
    const tests = [tp({ id: 'a', psiId: 'PSI-1', o2Pct: 21 }), tp({ id: 'b', psiId: 'PSI-2', o2Pct: 40 })];
    const r = nearestForInvestigation(PRESETS.iss, tests, 'PSI-2');
    expect(r.test?.id).toBe('b');
    expect(r.d).toBeCloseTo(1.9);
  });
  it('returns nulls when the investigation has no tests', () => {
    expect(nearestForInvestigation(PRESETS.iss, [tp({})], 'PSI-9')).toEqual({ d: null, test: null });
  });
});
