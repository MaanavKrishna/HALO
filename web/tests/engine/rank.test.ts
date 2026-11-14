import { describe, it, expect } from 'vitest';
import { loadFixtureData } from '@/lib/data/fixtures';
import { PRESETS } from '@/lib/engine/presets';
import { scaledDistance, nearestForInvestigation } from '@/lib/engine/distance';
import { rankInvestigations, DEFAULT_WEIGHTS } from '@/lib/engine/rank';

const data = loadFixtureData();

describe('rankInvestigations', () => {
  it('default weights are the spec values', () => {
    expect(DEFAULT_WEIGHTS).toEqual({ proximity: 0.4, fuel: 0.3, hazard: 0.2, richness: 0.1 });
  });

  it('returns every investigation, sorted by score descending', () => {
    const r = rankInvestigations(PRESETS.artemis, data);
    expect(r).toHaveLength(data.investigations.length);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
  });

  it('parts are in 0..1 and score is the weighted sum', () => {
    for (const x of rankInvestigations(PRESETS.iss, data)) {
      for (const v of Object.values(x.parts)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      const w = DEFAULT_WEIGHTS;
      const sum = w.proximity * x.parts.proximity + w.fuel * x.parts.fuel + w.hazard * x.parts.hazard + w.richness * x.parts.richness;
      expect(x.score).toBeCloseTo(sum, 10);
    }
  });

  it('every why is non-empty for the top entries', () => {
    for (const x of rankInvestigations(PRESETS.artemis, data).slice(0, 8)) {
      expect(x.why.length).toBeGreaterThan(0);
      for (const s of x.why) expect(s.length).toBeGreaterThan(0);
    }
  });

  it('detection investigations use ambient 21% O2 / 14.7 psia for proximity', () => {
    const same = rankInvestigations(PRESETS.artemis, data).find((x) => x.inv.acronym === 'SAME-R')!;
    const d = scaledDistance(34, 8.2, 21, 14.7);
    expect(same.parts.proximity).toBeCloseTo(1 / (1 + d), 10);
    const iss = rankInvestigations(PRESETS.iss, data).find((x) => x.inv.acronym === 'SAME-R')!;
    expect(iss.parts.proximity).toBe(1);
  });

  it('detection fuel part is 1 with detectors, 0 without', () => {
    const find = (h: typeof PRESETS.iss) =>
      rankInvestigations(h, data).find((x) => x.inv.acronym === 'SAME-R')!;
    expect(find(PRESETS.iss).parts.fuel).toBe(1);
    expect(find({ ...PRESETS.iss, detectors: [] }).parts.fuel).toBe(0);
  });

  it('fuel part: solid 1 with materials, droplet 1 only with liquids, gas 0.5', () => {
    const f = (h: typeof PRESETS.iss, a: string) =>
      rankInvestigations(h, data).find((x) => x.inv.acronym === a)!.parts.fuel;
    expect(f(PRESETS.iss, 'BASS-II')).toBe(1);
    expect(f(PRESETS.iss, 'FLEX')).toBe(0);
    expect(f({ ...PRESETS.iss, liquids: true }, 'FLEX')).toBe(1);
    expect(f(PRESETS.iss, 'CFI-G')).toBe(0.5);
    expect(f({ ...PRESETS.iss, materials: [] }, 'BASS-II')).toBe(0);
  });

  it('hazard part counts the four tracked hazards over 4', () => {
    const r = rankInvestigations(PRESETS.iss, data);
    const h = (a: string) => r.find((x) => x.inv.acronym === a)!.parts.hazard;
    expect(h('BASS-II')).toBe(2 / 4);
    expect(h('FLEX')).toBe(1 / 4);
    expect(h('CFI-G')).toBe(3 / 4);
    expect(h('SAME-R')).toBe(1 / 4);
  });

  it('richness is 1 for the richest investigation', () => {
    const r = rankInvestigations(PRESETS.iss, data);
    const top = r.reduce((a, b) => (b.parts.richness > a.parts.richness ? b : a));
    expect(top.parts.richness).toBeCloseTo(1, 10);
  });

  it('proximity-only weights put the smallest-d investigation first', () => {
    const w = { proximity: 1, fuel: 0, hazard: 0, richness: 0 };
    const h = PRESETS.artemis;
    const r = rankInvestigations(h, data, w);
    const dOf = (psiId: string) => {
      const inv = data.investigations.find((i) => i.psiId === psiId)!;
      if (inv.hazards.includes('smoke_detection')) return scaledDistance(h.o2Pct, h.pressurePsia, 21, 14.7);
      return nearestForInvestigation(h, data.tests, psiId).d ?? Infinity;
    };
    const best = Math.min(...data.investigations.map((i) => dOf(i.psiId)));
    expect(dOf(r[0].inv.psiId)).toBeCloseTo(best, 10);
  });

  it('breaks ties by psiId ascending and is deterministic', () => {
    const zero = { proximity: 0, fuel: 0, hazard: 0, richness: 0 };
    const ids = rankInvestigations(PRESETS.iss, data, zero).map((x) => x.inv.psiId);
    expect(ids).toEqual([...ids].sort());
    expect(rankInvestigations(PRESETS.iss, data)).toEqual(rankInvestigations(PRESETS.iss, data));
  });

  it('investigations with no eligible tests and no detection get proximity 0', () => {
    const d2 = { ...data, tests: data.tests.filter((t) => t.psiId !== 'PSI-69') };
    const flex = rankInvestigations(PRESETS.iss, d2).find((x) => x.inv.acronym === 'FLEX')!;
    expect(flex.parts.proximity).toBe(0);
  });
});
