import { describe, it, expect } from 'vitest';
import { classGrade, overallGrade } from '@/lib/engine/grade';
import type { FuelClass, Nearest } from '@/lib/engine/types';

const n = (d: number | null, measuredBoth = false, fuelClass: FuelClass = 'solid'): Nearest => ({
  fuelClass, d, test: null, o2Gap: null, pGap: null, measuredBoth,
});
const by = (solid: number | null, sur: number | null): Record<FuelClass, Nearest> => ({
  solid: n(solid), solid_surrogate: n(sur, false, 'solid_surrogate'),
  droplet: n(null, false, 'droplet'), gas: n(null, false, 'gas'),
});

describe('classGrade', () => {
  it('thresholds 0.5 / 1.0 / 2.0 (inclusive)', () => {
    expect(classGrade(n(0.5))).toBe('B');
    expect(classGrade(n(0.5001))).toBe('C');
    expect(classGrade(n(1.0))).toBe('C');
    expect(classGrade(n(1.0001))).toBe('D');
    expect(classGrade(n(2.0))).toBe('D');
    expect(classGrade(n(2.0001))).toBe('F');
  });
  it('A only when d <= 0.5 and measuredBoth', () => {
    expect(classGrade(n(0.5, true))).toBe('A');
    expect(classGrade(n(0, true))).toBe('A');
    expect(classGrade(n(0.6, true))).toBe('C');
    expect(classGrade(n(0.2, false))).toBe('B');
  });
  it('no tests gives F', () => {
    expect(classGrade(n(null))).toBe('F');
  });
});

describe('overallGrade', () => {
  it('uses the solid class grade', () => {
    expect(overallGrade(by(0.8, null)).grade).toBe('C');
    expect(overallGrade(by(1.5, null)).grade).toBe('D');
    expect(overallGrade(by(3, 0.9)).grade).toBe('F');
  });
  it('surrogate within 0.5 steps up one grade, capped at C', () => {
    expect(overallGrade(by(3, 0.5)).grade).toBe('D');
    expect(overallGrade(by(1.5, 0.2)).grade).toBe('C');
    expect(overallGrade(by(null, 0.2)).grade).toBe('D');
    expect(overallGrade(by(0.8, 0.2)).grade).toBe('C');
    expect(overallGrade(by(0.3, 0.1)).grade).toBe('B');
  });
  it('gives a non-empty reason, mentioning the surrogate when it applied', () => {
    expect(overallGrade(by(3, 0.2)).reason).toMatch(/surrogate/i);
    expect(overallGrade(by(3, null)).reason.length).toBeGreaterThan(0);
  });
});
