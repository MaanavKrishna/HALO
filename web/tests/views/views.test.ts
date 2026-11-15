import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import {
  DEFAULT_IDS, compareMatrix, compareSummary, normalizeId, parseIds, toggleHref,
} from '@/components/views/compareInvestigations';
import { SCREEN_MATERIALS, outcomeLabel, parseScreenParams, resolvedFuels, screenMaterial } from '@/components/materials/screener';
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
    const one = parseIds('PSI-26', KNOWN);
    expect(one.ids[0]).toBe('PSI-26');
    expect(one.ids).toHaveLength(2);
    expect(one.notices.join(' ')).toMatch(/at least 2/);
    // An id that is already a default is kept, and the pad skips it.
    expect(parseIds('PSI-25', KNOWN).ids).toEqual(['PSI-25', 'PSI-99']);
    expect(parseIds('nope', KNOWN).usedDefault).toBe(true);
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

  it('a gap in every column is not a similarity', () => {
    const noRanges = HALO_DATA.investigations.filter((i) => !i.o2Range).slice(0, 2);
    expect(noRanges).toHaveLength(2);
    const r = compareMatrix(noRanges, HALO_DATA);
    expect(r.find((x) => x.key === 'o2')!.same).toBe(false);
    const sum = compareSummary(r);
    expect(sum.same).not.toContain('O₂ range');
    expect(sum.differ).not.toContain('O₂ range');
    expect(sum.untabulated).toContain('O₂ range');
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

  it('carries "(see previous row)" forward within an investigation', () => {
    const fuels = resolvedFuels(HALO_DATA.tests);
    expect(fuels.get('PSI-99:2-6')).toEqual({ fuel: 'Cotton-Fiberglass (SIBAL)', fromPrevious: true });
    expect(fuels.get('PSI-99:2-9')).toEqual({ fuel: 'PMMA', fromPrevious: true });
    const at = parseScreenParams({}).atmosphere;
    const pm = screenMaterial(pmma, at, HALO_DATA).psi.find((e) => e.test.id === 'PSI-99:2-9')!;
    expect(pm.fuelFromPreviousRow).toBe(true);
    expect(pm.inferredMaterial).toBe(true);
    const cotton = SCREEN_MATERIALS.find((m) => m.id === 'cotton')!;
    expect(screenMaterial(cotton, at, HALO_DATA).psi.map((e) => e.test.id)).toContain('PSI-99:2-6');
    expect(screenMaterial(pmma, at, HALO_DATA).psi.map((e) => e.test.id)).not.toContain('PSI-99:2-6');
  });

  it('pins PMMA attribution: named PMMA rows are direct, BASS-II shape-only rows inferred, PMMA & Nomex counts for both', () => {
    const at = parseScreenParams({}).atmosphere;
    const s = screenMaterial(pmma, at, HALO_DATA);
    const byId = new Map(s.psi.map((e) => [e.test.id, e]));
    for (const e of s.psi) {
      if (/pmma/i.test(e.fuel)) expect(e.inferredMaterial).toBe(e.fuelFromPreviousRow);
      else expect(e.test.psiId).toBe('PSI-25');
    }
    expect(s.psi.some((e) => e.fuel === '1/4" clear rod' && e.inferredMaterial)).toBe(true);
    expect(s.psi.some((e) => /wax|sibal|nomex natural/i.test(e.fuel))).toBe(false);
    const nomex = SCREEN_MATERIALS.find((m) => m.id === 'nomex')!;
    const both = HALO_DATA.tests.find((t) => t.fuel === 'PMMA & Nomex')!;
    expect(byId.has(both.id)).toBe(true);
    expect(screenMaterial(nomex, at, HALO_DATA).psi.map((e) => e.test.id)).toContain(both.id);
  });

  it('pins the Lampwick smoke counts: none below the scatter proxy, every run caught', () => {
    const cotton = SCREEN_MATERIALS.find((m) => m.id === 'cotton')!;
    const smoke = screenMaterial(cotton, parseScreenParams({}).atmosphere, HALO_DATA).smoke!;
    expect(smoke.sameClass).toBe('Lampwick');
    expect([smoke.result.scatterLow, smoke.result.scatterRuns]).toEqual([0, 26]);
    const alone = smoke.whatIf.find((w) => w.combo.length === 1)!;
    expect([alone.caught, alone.runs]).toEqual([26, 26]);
  });

  it('labels the outcome enum, including the CFI-G values', () => {
    expect(outcomeLabel('unknown')).toBeNull();
    expect(outcomeLabel(undefined)).toBeNull();
    expect(outcomeLabel('no-hot-ignition')).toBe('No hot-flame ignition');
    expect(outcomeLabel('cool-flame')).toBe('Cool flame');
  });

  it('only matches solid rows and literature by material', () => {
    for (const m of SCREEN_MATERIALS) {
      const s = screenMaterial(m, parseScreenParams({}).atmosphere, HALO_DATA);
      expect(s.psi.every((e) => e.test.fuelClass === 'solid')).toBe(true);
      expect(s.literature.every((l) => m.match.test(l.row.material))).toBe(true);
      expect(s.psi.every((e) => m.match.test(e.fuel) || (m.inferMatch?.test(e.fuel) ?? false))).toBe(true);
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
    // Blank PSI material cells are filled from the row above, and flagged as such.
    expect(pairs.filter((p) => p.materialFromPrevious).map((p) => p.sample)).toEqual(['2-6', '2-9']);
    const cottonBound = materialBounds(HALO_DATA, pairs).find((b) => b.id === 'cotton')!;
    expect(cottonBound.oneG.find((p) => p.sample === '2-6')!.materialFromPrevious).toBe(true);
    expect(cottonBound.oneG.find((p) => p.sample === '2-5')!.materialFromPrevious).toBe(false);
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
    expect(b.filter((x) => x.luci).map((x) => x.id).sort()).toEqual(['cotton', 'pmma']);
    expect(b.every((x) => !('fm2' in x))).toBe(true);
  });
});

describe('site routes', () => {
  it('lists the tool views and the design page in the sitemap routes', () => {
    expect(STATIC_ROUTES).toEqual(expect.arrayContaining(['/investigations/compare', '/materials', '/gravity', '/design']));
  });
});
