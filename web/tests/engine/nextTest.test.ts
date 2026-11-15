import { describe, it, expect } from 'vitest';
import { loadFixtureData } from '@/lib/data/fixtures';
import { nextTests, PRESET_PRIORITY } from '@/lib/engine/nextTest';
import type { TestPoint } from '@/lib/engine/types';

const tp = (fuelClass: TestPoint['fuelClass'], o2Pct: number, pressurePsia: number): TestPoint => ({
  id: `${fuelClass}-${o2Pct}-${pressurePsia}`, psiId: 'X', acronym: 'X', fuelClass, fuel: 'f',
  o2Pct, pSrc: 'measured', o2Src: 'measured', pressurePsia,
});

function diverse(r: ReturnType<typeof nextTests>) {
  for (let i = 0; i < r.length; i++) for (let j = 0; j < i; j++) {
    const a = r[i], b = r[j];
    const ok = a.fuelClass !== b.fuelClass || Math.abs(a.o2Pct - b.o2Pct) >= 3 || Math.abs(a.pressurePsia - b.pressurePsia) >= 1.5;
    if (!ok) return false;
  }
  return true;
}

describe('nextTests', () => {
  const tests = loadFixtureData().tests;
  it('returns k=4 by default, descending scores, diverse', () => {
    const r = nextTests(tests);
    expect(r).toHaveLength(4);
    for (let i = 1; i < r.length; i++) expect(r[i].score).toBeLessThanOrEqual(r[i - 1].score);
    expect(diverse(r)).toBe(true);
  });
  it('respects k and grid bounds', () => {
    const r = nextTests(tests, 6);
    expect(r).toHaveLength(6);
    for (const c of r) {
      expect(c.o2Pct).toBeGreaterThanOrEqual(25); expect(c.o2Pct).toBeLessThanOrEqual(40);
      expect(c.pressurePsia).toBeGreaterThanOrEqual(4); expect(c.pressurePsia).toBeLessThanOrEqual(15);
    }
  });
  it('with no solid tests, the top pick is solid near the Moon/Artemis window', () => {
    const [top] = nextTests([tp('droplet', 21, 14.7), tp('gas', 21, 14.7)]);
    expect(top.fuelClass).toBe('solid');
    expect(top.o2Pct).toBeGreaterThanOrEqual(29);
    expect(top.o2Pct).toBeLessThanOrEqual(36);
  });
  it('gains are nonnegative, capped at 3, and the suit is not helped', () => {
    const [top] = nextTests([tp('solid', 21, 14.7)]);
    for (const g of top.gains) { expect(g.before).toBeLessThanOrEqual(3); expect(g.after).toBeLessThanOrEqual(g.before); }
    const suit = top.gains.find((g) => g.preset === 'suit')!;
    expect(suit.before - suit.after).toBe(0);
  });
  it('score equals class weight times priority-weighted gains', () => {
    const [top] = nextTests([tp('solid', 21, 14.7)]);
    const sum = top.gains.reduce((s, g) => s + PRESET_PRIORITY[g.preset as keyof typeof PRESET_PRIORITY] * (g.before - g.after), 0);
    expect(top.score).toBeCloseTo(2 * sum, 9);
  });
  it('is fast', () => {
    const t0 = performance.now();
    nextTests(tests);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

import { archiveGains, literaturePoints, nearestLiterature, nextTestsIfArchived } from '@/lib/engine/nextTest';
import type { HaloData, LiteratureRow } from '@/lib/engine/types';

describe('next test against the literature', () => {
  const lit = (sampleId: string, o2Pct: number | null, pressurePsia: number | null): LiteratureRow => ({
    mission: 'Saffire-VI', sampleId, material: 'Cast PMMA slab', o2Pct, pressurePsia, flowCmS: 20, spreadRateMmS: null,
    outcome: '', sourceUrl: 'https://ntrs.nasa.gov/citations/20240002981', confidence: 'high',
  });
  const data: HaloData = { ...loadFixtureData(), literature: [lit('VI-3', 30.3, 7.92), lit('VI-1', 31.9, null)] };

  it('literaturePoints keeps only runs with O2 and pressure, as solids', () => {
    const pts = literaturePoints(data.literature);
    expect(pts).toHaveLength(1);
    expect(pts[0]).toMatchObject({ fuelClass: 'solid', o2Pct: 30.3, pressurePsia: 7.92 });
  });
  it('nearestLiterature measures a solid candidate to the nearest run, and skips other classes', () => {
    const [c] = nextTests(data.tests);
    const n = nearestLiterature({ ...c, fuelClass: 'solid', o2Pct: 30, pressurePsia: 8 }, data.literature)!;
    expect(n.row.sampleId).toBe('VI-3');
    expect(n.d).toBeCloseTo(Math.hypot(0.03, 0.08 / 3), 6);
    expect(nearestLiterature({ ...c, fuelClass: 'gas' }, data.literature)).toBeNull();
  });
  it('archiveGains never raises a distance and lowers it where the literature run sits', () => {
    const g = archiveGains(data);
    expect(g.map((x) => x.preset).sort()).toEqual(Object.keys(PRESET_PRIORITY).sort());
    for (const x of g) expect(x.after).toBeLessThanOrEqual(x.before);
    const art = g.find((x) => x.preset === 'artemis')!;
    expect(art.after).toBeLessThan(art.before);
  });
  it('nextTestsIfArchived counts the literature as coverage, so solid gains near it shrink', () => {
    const plain = nextTests(data.tests, 50).find((c) => c.fuelClass === 'solid' && c.o2Pct === 30 && c.pressurePsia === 8)!;
    const archived = nextTestsIfArchived(data, 400).find((c) => c.fuelClass === 'solid' && c.o2Pct === 30 && c.pressurePsia === 8);
    expect(archived === undefined || archived.score < plain.score).toBe(true);
  });
});
