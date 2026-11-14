import { factText } from '@/lib/engine/types';
import { describe, it, expect } from 'vitest';
import { loadFixtureData } from '@/lib/data/fixtures';
import { PRESETS } from '@/lib/engine/presets';
import { buildBrief } from '@/lib/engine/brief';
import { aftermathFacts, reportsCoOverLimit } from '@/lib/engine/facts';
import type { Brief, Habitat } from '@/lib/engine/types';

const data = loadFixtureData();

/** Numbers as rendered in text, ignoring chemical subscripts such as O2 and CO2. */
function numbersIn(text: string): string[] {
  return text.match(/(?<![A-Za-z\d.])\d+(?:\.\d+)?/g) ?? [];
}

function factValueStrings(b: Brief, ids: string[]): Set<string> {
  const byId = new Map(b.facts.map((f) => [f.id, f]));
  return new Set(ids.map((id) => { const f = byId.get(id); return f ? factText(f) : 'undefined'; }));
}

describe('buildBrief (fixtures)', () => {
  const b = buildBrief(PRESETS.artemis, data);

  it('builds Artemis with both criticals and at least 4 flags', () => {
    expect(b.flags.length).toBeGreaterThanOrEqual(4);
    const crit = b.flags.filter((f) => f.severity === 'critical').map((f) => f.title);
    expect(crit).toContain('No real cabin material in the PSI data tested at this atmosphere');
    expect(crit.some((t) => /^Your detector would likely miss .+ smoke$/.test(t))).toBe(true);
    expect(b.flags.map((f) => f.title)).toContain('Smoke data only exists at ISS air');
    expect(b.flags.map((f) => f.title)).toContain('No partial-gravity data in PSI');
  });

  it('orders flags critical, warning, info', () => {
    const rank = { critical: 0, warning: 1, info: 2 };
    const r = b.flags.map((f) => rank[f.severity]);
    expect(r).toEqual([...r].sort((x, y) => x - y));
  });

  it('every flag factId resolves in brief.facts', () => {
    const ids = new Set(b.facts.map((f) => f.id));
    for (const f of b.flags) {
      expect(f.factIds.length).toBeGreaterThan(0);
      for (const id of f.factIds) expect(ids.has(id), `${f.id} -> ${id}`).toBe(true);
    }
  });

  it('every number rendered in a flag is a value of one of its facts', () => {
    for (const f of b.flags) {
      const allowed = factValueStrings(b, f.factIds);
      for (const n of numbersIn(`${f.title} ${f.detail}`)) expect(allowed.has(n), `${f.id}: ${n}`).toBe(true);
    }
  });

  it('every fact id matches /^[a-z-]+$/, ids are unique, every fact has a source', () => {
    const all = [...b.facts, ...b.aftermath, ...b.earth];
    for (const f of all) {
      expect(f.id).toMatch(/^[a-z-]+$/);
      // Habitat inputs are the user's own values: they cite the habitat definition note.
      if (f.id.startsWith('habitat-')) expect(f.source.note, f.id).toMatch(/habitat definition/i);
      else expect(f.source.psiId || f.source.doi || f.source.url, f.id).toBeTruthy();
    }
    expect(new Set(b.facts.map((f) => f.id)).size).toBe(b.facts.length);
  });

  it('aftermath comes from Saffire VI literature rows', () => {
    expect(b.aftermath.length).toBeGreaterThanOrEqual(2);
    const urls = new Set(data.literature.filter((r) => r.mission === 'Saffire-VI').map((r) => r.sourceUrl));
    for (const f of b.aftermath) {
      expect(f.provenance).toBe('literature');
      expect(urls.has(f.source.url!)).toBe(true);
    }
    const ids = b.aftermath.map((f) => f.id);
    expect(ids).toContain('aftermath-pmma-power-low');
    expect(ids).toContain('aftermath-pmma-power-high');
    expect(ids).toContain('aftermath-toxic-oxygen');
    const v = (id: string) => b.aftermath.find((f) => f.id === id)!.value;
    expect(v('aftermath-pmma-power-low')).toBe(1.5);
    expect(v('aftermath-pmma-power-high')).toBe(3.2);
    expect(v('aftermath-toxic-oxygen')).toBe(32);
  });

  it('ignores negated toxic-gas outcomes', () => {
    expect(reportsCoOverLimit('CO and CO2 did not exceed 24 h limits')).toBe(false);
    expect(reportsCoOverLimit('CO +308 ppm (>24-h SMAC 100)')).toBe(true);
    expect(reportsCoOverLimit('CO and CO2 exceeded 24 h limits')).toBe(true);
    const lit = data.literature.map((r) => ({ ...r, outcome: r.outcome.replace('exceeded', 'did not exceed') }));
    expect(aftermathFacts({ ...data, literature: lit }).some((f) => f.id === 'aftermath-toxic-oxygen')).toBe(false);
  });

  it('two-detector combo wording and inferred miss counts', () => {
    const w = buildBrief({ ...PRESETS.artemis, detectors: ['scatter', 'ionization'] }, data);
    for (const f of w.flags.filter((x) => x.id.startsWith('detector-miss-'))) expect(f.detail).toMatch(/both channels .* their alarm levels/);
    for (const f of w.facts.filter((x) => /^det-.+-ionization-scatter-low$/.test(x.id))) expect(f.provenance).toBe('inferred');
  });

  it('list-valued sources live in note, psiId is a single id', () => {
    for (const f of b.facts) if (f.source.psiId) expect(f.source.psiId).toMatch(/^PSI-\d+$/);
    expect(b.facts.find((f) => f.id === 'psi-investigations')?.source.url).toBe('https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/');
  });

  it('has three Earth facts with Spinoff URLs and the BASS fact', () => {
    expect(b.earth).toHaveLength(3);
    for (const f of b.earth) expect(f.source.url).toMatch(/^https:\/\/spinoff\.nasa\.gov\/node\/\d+$/);
    const bass = b.facts.find((f) => f.id === 'bass-test-one');
    expect(String(bass?.value)).toMatch(/^NASA-STD-6001 Test 1 is not conservative/);
    expect(bass?.value).toBe('NASA-STD-6001 Test 1 is not conservative, and materials can burn at lower oxygen levels in microgravity than on Earth');
    expect(bass?.provenance).toBe('literature');
    expect(bass?.source.url).toMatch(/^https:\/\/www\.nasa\.gov\/.+\.pdf$/);
  });

  it('never uses verdict words', () => {
    const text = JSON.stringify([b.flags, b.facts, b.grade]);
    expect(text).not.toMatch(/\b(un)?safe\b/i);
  });

  it('droplet pressure flag fires only when liquids are present', () => {
    const t = 'Droplet-fuel pressure outside tested range';
    expect(b.extinction.extrapolatedPressure).toBe(true);
    expect(b.flags.map((f) => f.title)).not.toContain(t);
    expect(buildBrief({ ...PRESETS.artemis, liquids: true }, data).flags.map((f) => f.title)).toContain(t);
  });

  it('coolFlame is set only when liquids are present', () => {
    expect(b.coolFlame).toBeNull();
    const w = buildBrief({ ...PRESETS.artemis, liquids: true }, data);
    expect(w.coolFlame?.source.doi).toBe('10.1016/j.combustflame.2012.07.012');
    expect(w.facts.some((f) => f.id === w.coolFlame!.id)).toBe(true);
  });

  it('droplet flag fires when liquids are present and p50 < 0.1, with numbers from facts', () => {
    const w = buildBrief({ ...PRESETS.artemis, liquids: true }, data);
    const has = w.flags.some((f) => f.title === 'Droplet flames unlikely to self-extinguish');
    expect(has).toBe(w.extinction.p50 < 0.1);
    for (const f of w.flags) {
      const allowed = factValueStrings(w, f.factIds);
      for (const n of numbersIn(`${f.title} ${f.detail}`)) expect(allowed.has(n), `${f.id}: ${n}`).toBe(true);
    }
  });

  it('ISS has no solid critical and no ISS-air warning', () => {
    const i = buildBrief(PRESETS.iss, data);
    const titles = i.flags.map((f) => f.title);
    expect(titles).not.toContain('No real cabin material in the PSI data tested at this atmosphere');
    expect(titles).not.toContain('Smoke data only exists at ISS air');
    expect(titles).toContain('No partial-gravity data in PSI');
  });

  it('Review Focus 2: no materials, no liquids builds cleanly', () => {
    const h: Habitat = { ...PRESETS.moon, materials: [], liquids: false };
    let out: Brief | undefined;
    expect(() => { out = buildBrief(h, data); }).not.toThrow();
    expect(out!.detection).toEqual([]);
    expect(out!.coolFlame).toBeNull();
    expect(out!.flags.some((f) => f.title.startsWith('Your detector would likely miss'))).toBe(false);
  });

  it('a material without SAME data is never reported as 0% caught', () => {
    const p = buildBrief({ ...PRESETS.artemis, materials: ['pmma'] }, data);
    expect(p.flags.some((f) => /PMMA/.test(f.title))).toBe(false);
  });

  it('passes notices through', () => {
    expect(buildBrief(PRESETS.iss, data, ['x']).notices).toEqual(['x']);
    expect(buildBrief(PRESETS.iss, data).notices).toEqual([]);
  });

  it('works for every preset', () => {
    for (const h of Object.values(PRESETS)) expect(() => buildBrief(h, data)).not.toThrow();
  });
});
