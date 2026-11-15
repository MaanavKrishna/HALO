import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import {
  DEFAULT_IDS, compareMatrix, compareSummary, normalizeId, parseIds, toggleHref,
} from '@/components/views/compareInvestigations';
import { SCREEN_MATERIALS, parseScreenParams, screenMaterial } from '@/components/materials/screener';
import { LEVELS, classifyBurn, materialBounds, pairTally, parseSaffireII } from '@/components/gravity/gravity';
import { PSI99_CSV, PSI99_SOURCE_FILE } from '@/components/gravity/psi99Table';
import { STATIC_ROUTES } from '@/lib/site';

const KNOWN = HALO_DATA.investigations.map((i) => i.psiId);

describe('compare investigations: URL selection', () => {
  it('normalizes ids', () => {
    expect(normalizeId('25')).toBe('PSI-25');
    expect(normalizeId(' psi-99 ')).toBe('PSI-99');
    expect(normalizeId('PSI 20')).toBe('PSI-20');
    expect(normalizeId('BASS')).toBeNull();
  });

  it('defaults silently when no ids are given', () => {
    expect(parseIds(undefined, KNOWN)).toEqual({ ids: [...DEFAULT_IDS], notices: [], usedDefault: true });
  });

  it('reads comma lists and repeated params, dedupes, drops unknown ids with a notice', () => {
    const r = parseIds(['PSI-26,22', 'PSI-26', 'nope'], KNOWN);
    expect(r.ids).toEqual(['PSI-26', 'PSI-22']);
    expect(r.notices.join(' ')).toMatch(/nope/);
  });

  it('keeps at most four and falls back below two', () => {
    expect(parseIds('10,20,21,22,23', KNOWN).ids).toEqual(['PSI-10', 'PSI-20', 'PSI-21', 'PSI-22']);
    const one = parseIds('PSI-25', KNOWN);
    expect(one.usedDefault).toBe(true);
    expect(one.notices.join(' ')).toMatch(/at least 2/);
  });

  it('toggle links add up to four and remove down to two', () => {
    expect(toggleHref(['PSI-25', 'PSI-99'], 'PSI-69')).toBe('/investigations/compare?ids=PSI-25,PSI-99,PSI-69');
    expect(toggleHref(['PSI-25', 'PSI-99'], 'PSI-25')).toBeNull();
    expect(toggleHref(['PSI-25', 'PSI-99', 'PSI-69'], 'PSI-25')).toBe('/investigations/compare?ids=PSI-99,PSI-69');
    expect(toggleHref(['PSI-25', 'PSI-99', 'PSI-69', 'PSI-20'], 'PSI-10')).toBeNull();
  });
});

describe('compare investigations: matrix', () => {
  const invs = DEFAULT_IDS.map((id) => HALO_DATA.investigations.find((i) => i.psiId === id)!);
  const rows = compareMatrix(invs, HALO_DATA);

  it('has one cell per investigation in every row', () => {
    for (const r of rows) expect(r.cells).toHaveLength(invs.length);
  });

  it('marks shared set items and differing rows from the data', () => {
    const hazards = rows.find((r) => r.key === 'hazards')!;
    const shared = invs.map((i) => i.hazards).reduce((a, b) => a.filter((x) => b.includes(x)));
    expect(hazards.shared.length).toBe(shared.length);
    const o2 = rows.find((r) => r.key === 'o2')!;
    expect(o2.same).toBe(false);
  });

  it('a self-comparison has no differences', () => {
    const same = compareMatrix([invs[0], invs[0]], HALO_DATA);
    expect(compareSummary(same).differ).toEqual([]);
  });

  it('never shows sensors from a summary awaiting review', () => {
    const sensors = rows.find((r) => r.key === 'sensors')!;
    invs.forEach((inv, k) => {
      const s = HALO_DATA.summaries[inv.psiId];
      const cell = sensors.cells[k];
      if (!s || s.needsReview) expect(cell.kind === 'set' && cell.items.length).toBe(0);
    });
  });
});

describe('material screener', () => {
  const pmma = SCREEN_MATERIALS.find((m) => m.id === 'pmma')!;

  it('parses material and atmosphere with presets and clamped custom values', () => {
    expect(parseScreenParams({}).atmosphere.presetKey).toBe('artemis');
    const moon = parseScreenParams({ m: 'cotton', at: 'moon' });
    expect(moon.material.id).toBe('cotton');
    expect([moon.atmosphere.o2Pct, moon.atmosphere.pressurePsia]).toEqual([PRESETS.moon.o2Pct, PRESETS.moon.pressurePsia]);
    const custom = parseScreenParams({ m: 'pmma', o2: '150', p: 'x' });
    expect(custom.atmosphere.o2Pct).toBe(100);
    expect(custom.notices).toHaveLength(2);
    expect(parseScreenParams({ m: 'unobtainium' }).notices[0]).toMatch(/Unknown material/);
  });

  it('finds PMMA rows in BASS-II and Saffire-II, sorted nearest first', () => {
    const s = screenMaterial(pmma, parseScreenParams({}).atmosphere, HALO_DATA);
    expect(s.investigations).toEqual(expect.arrayContaining(['PSI-25', 'PSI-99']));
    for (let i = 1; i < s.psi.length; i++) expect(s.psi[i].d).toBeGreaterThanOrEqual(s.psi[i - 1].d);
    expect(s.nearestPsi?.d).toBe(s.psi[0].d);
    // Rows matched only by shape are flagged as inferred.
    expect(s.psi.some((e) => e.inferredMaterial)).toBe(true);
    expect(s.psi.filter((e) => /pmma/i.test(e.test.fuel)).every((e) => !e.inferredMaterial)).toBe(true);
  });

  it('only matches solid rows and literature by material', () => {
    for (const m of SCREEN_MATERIALS) {
      const s = screenMaterial(m, parseScreenParams({}).atmosphere, HALO_DATA);
      expect(s.psi.every((e) => e.test.fuelClass === 'solid')).toBe(true);
      expect(s.literature.every((l) => m.match.test(l.row.material))).toBe(true);
    }
  });

  it('reads smoke stats from the detector runs through the engine', () => {
    const kapton = SCREEN_MATERIALS.find((m) => m.id === 'kapton')!;
    const s = screenMaterial(kapton, parseScreenParams({}).atmosphere, HALO_DATA);
    const runs = HALO_DATA.detector.runs.filter((r) => r.material === 'Kapton' && r.scatterV !== null);
    expect(s.smoke?.result.scatterRuns).toBe(runs.length);
    expect(s.smoke?.result.scatterLow).toBe(runs.filter((r) => (r.scatterV as number) < HALO_DATA.detector.thresholds.scatterV).length);
    expect(screenMaterial(pmma, parseScreenParams({}).atmosphere, HALO_DATA).smoke).toBeNull();
  });
});

describe('partial-gravity bounds', () => {
  it('embeds the PSI-99 table byte for byte', () => {
    const mirror = readFileSync(path.resolve(import.meta.dirname, '../../..', PSI99_SOURCE_FILE), 'utf8');
    expect(PSI99_CSV).toBe(mirror);
  });

  it('classifies burn lengths', () => {
    expect(classifyBurn('Complete', '29 cm')).toBe('complete');
    expect(classifyBurn('29 cm', '29 cm')).toBe('complete');
    expect(classifyBurn('7.6 cm', '29 cm')).toBe('partial');
    expect(classifyBurn('~ 0', '29 cm')).toBe('none');
    expect(classifyBurn('~ 0 (Nomex)', '29 cm')).toBe('none');
    expect(classifyBurn('5 cm & 0 (note 2)', '5 and 24 cm')).toBe('mixed');
    expect(classifyBurn('n/a', '29 cm')).toBe('unknown');
  });

  it('parses every Saffire-II sample and carries blank materials forward', () => {
    const pairs = parseSaffireII();
    expect(pairs.map((p) => p.sample)).toEqual(['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7', '2-8', '2-9']);
    expect(pairs.find((p) => p.sample === '2-6')!.material).toMatch(/SIBAL/);
    expect(pairs.find((p) => p.sample === '2-9')!.material).toBe('PMMA');
    const t = pairTally(pairs);
    expect(t.oneGFurther + t.same + t.microFurther).toBe(t.comparable);
    expect(t.comparable).toBeLessThan(t.total);
  });

  it('orders the gravity levels and bounds only materials with evidence', () => {
    const gs = LEVELS.map((l) => l.g);
    expect([...gs].sort((a, b) => a - b)).toEqual(gs);
    const b = materialBounds(HALO_DATA);
    expect(b.map((x) => x.id)).toEqual(expect.arrayContaining(['pmma', 'cotton', 'silicone', 'nomex']));
    expect(b.find((x) => x.id === 'kapton')).toBeUndefined();
  });
});

describe('site routes', () => {
  it('lists the tool views and the design page in the sitemap routes', () => {
    expect(STATIC_ROUTES).toEqual(expect.arrayContaining(['/investigations/compare', '/materials', '/gravity', '/design']));
  });
});
