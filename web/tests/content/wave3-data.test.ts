import { describe, expect, it } from 'vitest';
import { computeFindings } from '@/components/content/findings';
import { DOWNLOADS, investigationCsv, investigationCsvRows } from '@/components/content/downloads';
import { HALO_DATA } from '@/lib/data/load';
import { loadFixtureData } from '@/lib/data/fixtures';
import { InvestigationZ, LiteratureZ, TestPointZ, investigationRows, literatureRows, testRows } from '@/lib/data/schema';
import { matchesSampleOrSensor, sensorMap } from '@/lib/explore';

const real = HALO_DATA.manifest.totalRows !== 30;

describe('wave-3 optional fields', () => {
  const f = loadFixtureData();
  it('older rows without the new fields still parse', () => {
    expect(() => TestPointZ.parse(f.tests[0])).not.toThrow();
    expect(() => InvestigationZ.parse(f.investigations[0])).not.toThrow();
  });
  it('new fields are validated', () => {
    expect(() => TestPointZ.parse({ ...f.tests[0], outcome: 'exploded' })).toThrow();
    for (const o of ['no-hot-ignition', 'cool-flame', 'no-ignition']) expect(() => TestPointZ.parse({ ...f.tests[0], outcome: o })).not.toThrow();
    expect(() => TestPointZ.parse({ ...f.tests[0], flowSrc: 'guessed' })).toThrow();
    expect(() => TestPointZ.parse({ ...f.tests[0], flowCmS: -1 })).toThrow();
    expect(() => TestPointZ.parse({ ...f.tests[0], diluent: 'Ar' })).toThrow();
    expect(() => InvestigationZ.parse({ ...f.investigations[0], acronymSource: 'nasa' })).toThrow();
    expect(() => LiteratureZ.parse({ ...f.literature[0], sources: [{ url: 1 }] })).toThrow();
  });
  it('parsed real data keeps the new fields', () => {
    if (!real) return;
    const t = testRows(HALO_DATA);
    expect(t).toHaveLength(1225);
    expect(t.every((x) => x.outcome !== undefined && x.flowSrc !== undefined)).toBe(true);
    const inv = investigationRows(HALO_DATA);
    expect(inv.filter((i) => i.acronymSource === 'halo').map((i) => i.psiId).sort()).toEqual(['PSI-115', 'PSI-117', 'PSI-142', 'PSI-60', 'PSI-62']);
    expect(inv.every((i) => !!i.geometry)).toBe(true);
    const v4 = literatureRows(HALO_DATA).find((r) => r.sampleId === 'V-4')!;
    expect(v4.sources?.map((s) => s.url.split('/').pop())).toEqual(['20210017785', '20210011521']);
  });
});

describe.skipIf(!real)('findings from the real data', () => {
  const fs = computeFindings();
  const by = (id: string) => fs.find((x) => x.id === id)!;

  it('suppression finding: FLEX diluent self-extinction shares', () => {
    const f = by('diluent-suppression');
    expect(f.topic).toBe('Suppression');
    expect(f.viz.kind).toBe('diluent');
    if (f.viz.kind !== 'diluent') return;
    const rows = Object.fromEntries(f.viz.rows.map((r) => [r.label.split(' ')[0], r]));
    expect(rows['Nitrogen'].all).toEqual({ ext: 58, n: 101 });
    expect(rows['Carbon'].all).toEqual({ ext: 87, n: 122 });
    expect(rows['Helium'].all).toEqual({ ext: 40, n: 50 });
    expect(rows['Nitrogen'].matched).toEqual({ ext: 40, n: 61 });
    expect(rows['Carbon'].matched).toEqual({ ext: 57, n: 68 });
    expect(rows['Helium'].matched).toEqual({ ext: 28, n: 31 });
    expect(f.viz.levels).toBe('14–21%');
    expect(f.stat.value).toBe('90');
    expect(f.body).toMatch(/not tests of an extinguisher or a suppression system/);
    expect(f.sources.map((s) => s.href)).toContain('https://doi.org/10.60555/mbq8-0451');
    expect(f.body).toMatch(/The same direction shows for each fuel, on small counts .*most of the nitrogen gap comes from the heptane runs/);
    expect(f.viz.byFuel?.map((x) => x.fuel)).toEqual(['Methanol', 'Heptane']);
    expect(f.brief.href).toMatch(/[?&]l=1(&|$)/);
  });

  it('Moon window shows the CFI-G burn outcomes', () => {
    const f = by('moon-window');
    if (f.viz.kind !== 'breakdown') throw new Error('kind');
    expect(f.viz.outcomes?.total).toBe(20);
    expect(Object.fromEntries(f.viz.outcomes!.parts.map((p) => [p.outcome, p.count]))).toEqual({ extinguished: 13, 'flow-stopped': 5, 'no-hot-ignition': 2 });
    expect(f.body).toMatch(/in 13 the hot flame went out on its own, 5 burned until the fuel flow was stopped and 2 did not reach a hot flame \(both logged as direct cool flames\)/);
    expect(f.provenance).toContain('computed');
  });

  it('next-test finding names the same nearest literature run as the brief', () => {
    const body = by('next-test').body;
    expect(body).toMatch(/Saffire-?V run V-2 burned .* at evidence distance 0\.39 from this point \(NASA report, literature; mission not in PSI\)/);
    expect(body).not.toMatch(/0\.69/);
  });

  it('cites FM2, SoFIE, FLARE and ASE', () => {
    expect(by('partial-gravity').body).toMatch(/LUCI, which burned samples.*planned FM2/);
    expect(by('partial-gravity').sources.some((s) => s.href?.includes('flammability-of-materials-on-the-moon-fm2'))).toBe(true);
    const solid = by('solid-ceiling');
    expect(solid.sources.some((s) => s.href?.includes('sofie'))).toBe(true);
    expect(solid.sources.some((s) => s.href?.includes('flare'))).toBe(true);
    expect(by('detector-blind-spot').sources.some((s) => s.href === 'https://doi.org/10.60555/pdgr-c961')).toBe(true);
  });

  it('Saffire spread cites every report, Eigenbrod included, by paper title', () => {
    const labels = by('saffire-spread').sources.map((s) => s.label);
    expect(labels.some((l) => l.includes('20210017785'))).toBe(true);
    expect(labels.join(' ')).not.toMatch(/Saffire-IV\)/);
  });
});

describe.skipIf(!real)('CSV export', () => {
  const csv = DOWNLOADS.find((d) => d.file === 'tests.csv')!;
  it('is listed with its manifest sha and has one line per eligible row', () => {
    expect(csv.sha256).toBe(HALO_DATA.manifest.files['tests.csv']);
    expect(csv.contentType).toMatch(/^text\/csv/);
    const lines = csv.body.toString('utf-8').trim().split('\n');
    expect(lines[0]).toBe('id,psiId,acronym,fuelClass,fuel,geometry,o2Pct,o2Src,pressurePsia,pSrc,flowCmS,flowSrc,outcome,diluent,datasetDoi');
    expect(lines).toHaveLength(HALO_DATA.manifest.eligibleRows + 1);
  });
  it('filters per investigation', () => {
    expect(investigationCsvRows('PSI-69')).toBe(HALO_DATA.tests.filter((t) => t.psiId === 'PSI-69').length);
    expect(investigationCsv('PSI-47')).toBeNull();
    expect(investigationCsv('PSI-1')).toBeNull();
    const one = investigationCsv('PSI-159')!.trim().split('\n');
    expect(one.slice(1).every((l) => l.startsWith('PSI-159:'))).toBe(true);
  });
});

describe('explore sample/sensor search', () => {
  const sensors = sensorMap({ 'PSI-1': { sensors: ['Radiometers', ' '] }, 'PSI-2': { sensors: ['x'], needsReview: true } });
  const inv = { ...loadFixtureData().investigations[0], psiId: 'PSI-1', geometry: 'PMMA rods 10 mm' };
  it('builds the map without reviewed-out entries', () => expect(sensors).toEqual({ 'PSI-1': ['Radiometers'] }));
  it('matches geometry and sensors, every word', () => {
    expect(matchesSampleOrSensor(inv, sensors, '')).toBe(true);
    expect(matchesSampleOrSensor(inv, sensors, 'pmma radiometer')).toBe(true);
    expect(matchesSampleOrSensor(inv, sensors, 'pmma camera')).toBe(false);
  });
});
