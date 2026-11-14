import { describe, it, expect } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { buildBrief } from '@/lib/engine/brief';
import { allFacts, nearId, pageFacts, whatIfId } from '@/lib/brief/pageFacts';
import { buildCitations, safeUrl } from '@/lib/brief/citations';
import { fallbackNarrative } from '@/lib/brief/narrative';

const isReal = HALO_DATA.manifest.totalRows === 1967;
const numbersIn = (t: string) => t.match(/(?<![A-Za-z\d.])\d+(?:\.\d+)?/g) ?? [];

describe('page facts', () => {
  for (const [key, h] of Object.entries(PRESETS)) {
    const b = buildBrief(h, HALO_DATA);
    const facts = allFacts(b, HALO_DATA);
    it(`${key}: ids are unique, lowercase and hyphens only`, () => {
      const ids = facts.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z-]+$/);
    });
    it(`${key}: page facts that share an engine id carry the same value`, () => {
      const engine = new Map(b.facts.map((f) => [f.id, f.value]));
      for (const f of pageFacts(b, HALO_DATA)) if (engine.has(f.id)) expect(f.value, f.id).toBe(engine.get(f.id));
    });
    it(`${key}: SAME ambient facts are always present (ISS included)`, () => {
      const ids = new Set(facts.map((f) => f.id));
      expect(ids.has('det-ambient-oxygen')).toBe(true);
      expect(ids.has('det-ambient-pressure')).toBe(true);
    });
    it(`${key}: every fact gets a citation number`, () => {
      const { byFact, list } = buildCitations(facts, HALO_DATA);
      for (const f of facts) expect(byFact.get(f.id), f.id).toBeGreaterThan(0);
      for (const c of list) if (c.url) expect(c.url.startsWith('https://')).toBe(true);
    });
    it(`${key}: fallback narrative only states numbers from grade or flag text`, () => {
      const allowed = new Set([b.grade.reason, ...b.flags.map((f) => `${f.title} ${f.detail}`)].flatMap(numbersIn));
      for (const n of numbersIn(fallbackNarrative(b).join(' ').replace(b.habitat.name, ''))) expect(allowed.has(n), n).toBe(true);
    });
  }

  it('materials without SAME runs get no what-if facts (never 0%)', () => {
    const b = buildBrief({ ...PRESETS.artemis, materials: ['pmma', 'nomex'] }, HALO_DATA);
    const ids = pageFacts(b, HALO_DATA).map((f) => f.id);
    expect(ids.some((id) => id.startsWith('whatif-pmma') || id.startsWith('whatif-nomex'))).toBe(false);
  });

  it('safeUrl keeps https only', () => {
    expect(safeUrl('https://doi.org/10.1/x')).toBe('https://doi.org/10.1/x');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('http://example.com')).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
  });
});

describe.skipIf(!isReal)('real data: page facts', () => {
  const b = buildBrief(PRESETS.artemis, HALO_DATA);
  const v = (id: string) => allFacts(b, HALO_DATA).find((f) => f.id === id)?.value;
  it('nearest solid gap for Artemis is 11.8 O2-points', () => {
    expect(v(nearId('solid', 'gap'))).toBe(11.8);
  });
  it('ppO2 for Artemis is 2.79 psia', () => {
    expect(v('habitat-oxygen-partial-pressure')).toBe(2.79);
  });
  it('kapton what-if: scatter catches 15 of 35', () => {
    expect(v(whatIfId('kapton', ['scatter'], 'caught'))).toBe(15);
    expect(v(whatIfId('kapton', ['scatter'], 'runs'))).toBe(35);
  });
});

describe('citation order', () => {
  it('numbers sources by first appearance on the page', async () => {
    const { appearanceOrder } = await import('@/lib/brief/context');
    const { numberSources } = await import('@/lib/brief/citations');
    const b = buildBrief(PRESETS.artemis, HALO_DATA);
    const facts = allFacts(b, HALO_DATA);
    const byId = new Map(facts.map((f) => [f.id, f]));
    const order = appearanceOrder(b, []).filter((x): x is string => typeof x === 'string' && byId.has(x));
    const { byFact } = numberSources(order.map((id) => ({ id, source: byId.get(id)!.source })), HALO_DATA);
    // The first flag's first fact gets source 1, and numbers never decrease faster than they appear.
    expect(byFact.get(b.flags[0].factIds[0])).toBe(1);
    let max = 0;
    for (const id of order) {
      const n = byFact.get(id)!;
      expect(n).toBeLessThanOrEqual(max + 1);
      max = Math.max(max, n);
    }
  });
});
