import { describe, it, expect } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { loadFixtureData } from '@/lib/data/fixtures';
import {
  TestPointZ, InvestigationZ, DetectorZ, ExtinctionZ, LiteratureZ, SummaryZ, ManifestZ,
} from '@/lib/data/schema';

describe('fixtures', () => {
  const f = loadFixtureData();

  it('fixtures parse', () => {
    expect(f.tests).toHaveLength(30);
    expect(new Set(f.tests.map((t) => t.fuelClass))).toEqual(
      new Set(['solid', 'solid_surrogate', 'droplet', 'gas']),
    );
    expect(f.investigations).toHaveLength(4);
    expect(f.detector.runs).toHaveLength(10);
    expect(f.extinction.coefs).toHaveLength(200);
    expect(f.extinction.coefs.every((c) => c.length === 4)).toBe(true);
    expect(f.literature.length).toBeGreaterThan(0);
    expect(f.summaries).toEqual({});
  });

  it('schemas reject malformed input', () => {
    expect(() => TestPointZ.parse({ ...f.tests[0], fuelClass: 'plasma' })).toThrow();
    expect(() => TestPointZ.parse({ ...f.tests[0], o2Src: 'guessed' })).toThrow();
    expect(() => InvestigationZ.parse({ ...f.investigations[0], hazards: ['fun'] })).toThrow();
    expect(() => DetectorZ.parse({ ...f.detector, runs: [{ material: 'x', scatterV: 'hi', ionizationDV: null, cmdUm: null }] })).toThrow();
    expect(() => ExtinctionZ.parse({ ...f.extinction, coefs: [[1, 2, 3]] })).toThrow();
    expect(() => LiteratureZ.parse({})).toThrow();
    expect(() => ManifestZ.parse({ ...f.manifest, totalRows: -1 })).toThrow();
    expect(() => SummaryZ.parse({ summary: 5 })).toThrow();
  });

  it('SummaryZ parses a full entry', () => {
    const entry = {
      summary: 'Flame spread over cotton-fiberglass fabric at reduced pressure.',
      habitatRelevance: 'Closest tested solid fuel to the chosen atmosphere.',
      hazards: ['spread', 'extinction'],
      sensors: ['thermocouple'],
      quotes: ['Not conservative for microgravity.'],
      model: 'test-model',
      generatedAt: '2026-11-14T00:00:00Z',
      needsReview: true,
    };
    expect(SummaryZ.parse(entry)).toEqual(entry);
    const { needsReview: _n, ...noFlag } = entry;
    expect(SummaryZ.parse(noFlag)).toEqual(noFlag);
    expect(() => SummaryZ.parse({ ...entry, hazards: ['fun'] })).toThrow();
  });

  it('detector has no obscuration fields', () => {
    expect(JSON.stringify(f.detector.runs)).not.toMatch(/obscur/i);
    expect(Object.keys(f.detector.thresholds).sort()).toEqual(['ionizationDV', 'scatterV']);
  });
});

describe('bundled data', () => {
  // Placeholders (copies of the fixtures) carry totalRows = 30; the pipeline writes 1967.
  const isReal = HALO_DATA.manifest.totalRows === 1967;

  it.skipIf(!isReal)('real data parses', () => {
    expect(HALO_DATA.tests.length).toBe(1225);
    expect(HALO_DATA.investigations.length).toBe(24);
    expect(HALO_DATA.extinction.coefs.length).toBe(200);
    expect(HALO_DATA.manifest.totalRows).toBe(1967);
  });

  it('HALO_DATA is loaded and shaped', () => {
    expect(HALO_DATA.tests.length).toBeGreaterThan(0);
    expect(typeof HALO_DATA.summaries).toBe('object');
  });
});
