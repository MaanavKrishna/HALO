import { describe, it, expect } from 'vitest';
import { detectionFor, sensorWhatIf } from '@/lib/engine/detection';
import { MATERIALS } from '@/lib/engine/materials';
import type { DetectorData, DetectorRun } from '@/lib/engine/types';

const run = (material: string, scatterV: number | null, ionizationDV: number | null, cmdUm: number | null = null): DetectorRun =>
  ({ material, scatterV, ionizationDV, cmdUm });

const det: DetectorData = {
  ambient: { o2Pct: 21, pressurePsia: 14.7 },
  thresholds: { scatterV: 2, ionizationDV: 0.25 },
  calibration: '',
  obscurationNote: '',
  runs: [
    run('Kapton', 2.4, 0.3, 0.3),
    run('Kapton', 0.8, 0.4, 0.2), // scatter misses, ionization catches
    run('Kapton', 0.5, 0.1, 0.4), // both miss
    run('Kapton', 1.0, null), // ionization null: out of the combo denominator
    run('Kapton', null, null),
    run('Lampwick', 0.1, 0.5),
    run('Lampwick', 0.2, 0.1),
  ],
};

describe('materials map', () => {
  it('maps habitat ids to SAME classes', () => {
    expect(MATERIALS.cotton).toMatchObject({ label: 'Cotton (lampwick)', sameClass: 'Lampwick' });
    expect(MATERIALS.dbp.label).toBe('Plasticizer aerosol (DBP)');
    expect(MATERIALS.pmma).toMatchObject({ sameClass: null, literatureMaterial: 'PMMA' });
    expect(MATERIALS.nomex).toMatchObject({ sameClass: null, literatureMaterial: 'Nomex' });
  });
});

describe('detectionFor', () => {
  it('counts scatter-low over non-null scatter runs', () => {
    const [k] = detectionFor(['kapton'], ['scatter'], det);
    expect(k.scatterRuns).toBe(4);
    expect(k.scatterLow).toBe(3);
    expect(k.scatterLowPct).toBeCloseTo(75, 5);
    expect(k.noSameAnalog).toBe(false);
  });
  it('caughtPct uses selected detectors over runs where all are non-null', () => {
    const [s] = detectionFor(['kapton'], ['scatter'], det);
    expect(s.caughtRuns).toBe(4);
    expect(s.caughtPct).toBeCloseTo(25, 5);
    const [both] = detectionFor(['kapton'], ['scatter', 'ionization'], det);
    expect(both.caughtRuns).toBe(3);
    expect(both.caughtPct).toBeCloseTo((2 / 3) * 100, 5);
  });
  it('reports medians', () => {
    const [k] = detectionFor(['kapton'], ['scatter'], det);
    expect(k.cmdUm).toBeCloseTo(0.3, 5);
    expect(k.ionizationMedianDV).toBeCloseTo(0.3, 5);
  });
  it('lampwick/cotton scatter-low is all runs', () => {
    const [c] = detectionFor(['cotton'], ['scatter'], det);
    expect(c.scatterLow).toBe(2);
    expect(c.caughtPct).toBe(0);
  });
  it('pmma has no SAME analog', () => {
    const [p] = detectionFor(['pmma'], ['scatter'], det);
    expect(p.noSameAnalog).toBe(true);
    expect(p.scatterRuns).toBe(0);
    expect(p.scatterLowPct).toBeNull();
    expect(p.caughtPct).toBeNull();
  });
  it('no detectors selected gives null caughtPct', () => {
    expect(detectionFor(['kapton'], [], det)[0].caughtPct).toBeNull();
  });
  it('empty materials gives []', () => {
    expect(detectionFor([], ['scatter'], det)).toEqual([]);
  });
});

describe('sensorWhatIf', () => {
  it('adding ionization catches more', () => {
    const w = sensorWhatIf('kapton', det);
    expect(w).toHaveLength(2);
    expect(w[0].combo).toEqual(['scatter']);
    expect(w[1].combo).toEqual(['scatter', 'ionization']);
    expect(w[0]).toMatchObject({ caught: 1, runs: 4 });
    expect(w[1]).toMatchObject({ caught: 2, runs: 3 });
    expect(w[1].caughtPct).toBeGreaterThan(w[0].caughtPct);
  });
  it('no analog gives zero runs and 0%', () => {
    expect(sensorWhatIf('pmma', det)[0]).toMatchObject({ caught: 0, runs: 0, caughtPct: 0 });
  });
});
