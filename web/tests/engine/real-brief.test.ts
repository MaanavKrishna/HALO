import { describe, it, expect } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { buildBrief } from '@/lib/engine/brief';

// Real-data expectations. Skipped while src/data holds the fixture placeholders.
const isReal = HALO_DATA.manifest.totalRows === 1967;

const numbersIn = (t: string) => t.match(/(?<![A-Za-z\d.])\d+(?:\.\d+)?/g) ?? [];

describe.skipIf(!isReal)('real data: Artemis fire brief', () => {
  const b = buildBrief(PRESETS.artemis, HALO_DATA);

  it('grades Artemis D', () => {
    expect(b.grade.grade).toBe('D');
  });
  it('has at least 4 flags including both criticals', () => {
    expect(b.flags.length).toBeGreaterThanOrEqual(4);
    const crit = b.flags.filter((f) => f.severity === 'critical').map((f) => f.title);
    expect(crit).toContain('No real cabin material in the PSI data tested at this atmosphere');
    expect(crit.some((t) => /^Your detector would likely miss .+ smoke$/.test(t))).toBe(true);
  });

  it('scopes the no-solid flag to PSI and states the Saffire VI literature runs in the Moon envelope from data', () => {
    const f = b.flags.find((x) => x.id === 'no-solid-evidence')!;
    const rows = HALO_DATA.literature.filter(
      (r) => r.o2Pct !== null && r.pressurePsia !== null && r.o2Pct >= PRESETS.moon.o2Pct && r.pressurePsia <= PRESETS.moon.pressurePsia,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(f.detail).toMatch(/Saffire VI \(NASA reports, literature\) burned SIBAL and PMMA/);
    expect(f.detail).toContain('not in PSI, so HALO does not grade on them');
    const low = b.facts.find((x) => x.id === 'lit-window-oxygen-low')!;
    expect(low.provenance).toBe('literature');
    expect(low.source.url).toMatch(/^https:\/\/ntrs\.nasa\.gov\//);
    expect(low.value).toBe(Math.min(...rows.map((r) => r.o2Pct as number)));
    expect(f.factIds).toEqual(expect.arrayContaining(['lit-window-oxygen-low', 'lit-window-oxygen-high', 'lit-window-pressure']));
  });
  it('every flag factId resolves', () => {
    const ids = new Set(b.facts.map((f) => f.id));
    for (const f of b.flags) for (const id of f.factIds) expect(ids.has(id), id).toBe(true);
  });
  it('numbers in flags are Fact values', () => {
    const byId = new Map(b.facts.map((f) => [f.id, String(f.value)]));
    for (const f of b.flags) {
      const allowed = new Set(f.factIds.map((id) => byId.get(id)));
      for (const n of numbersIn(`${f.title} ${f.detail}`)) expect(allowed.has(n), `${f.id}: ${n}`).toBe(true);
    }
  });
  it('aftermath PMMA fire power is 1.5 to 3.2 kW from Saffire VI rows', () => {
    const v = (id: string) => b.aftermath.find((f) => f.id === id)?.value;
    expect(v('aftermath-pmma-power-low')).toBe(1.5);
    expect(v('aftermath-pmma-power-high')).toBe(3.2);
    expect(v('aftermath-toxic-oxygen')).toBe(30); // Saffire VI-3 at 30.3% O2
  });
  it('kapton scatter facts are 20 of 35', () => {
    const v = (id: string) => b.facts.find((f) => f.id === id)?.value;
    expect(v('det-kapton-scatter-low')).toBe(20);
    expect(v('det-kapton-scatter-runs')).toBe(35);
  });
  it('fact ids are lowercase and hyphens only', () => {
    for (const f of b.facts) expect(f.id).toMatch(/^[a-z-]+$/);
  });
});

describe.skipIf(!isReal)('real data: detector facts cite SAME', () => {
  it('det facts use the SAME investigation, not another smoke-detection one', () => {
    const b = buildBrief(PRESETS.artemis, HALO_DATA);
    const f = b.facts.find((x) => x.id === 'det-kapton-scatter-runs');
    expect(f?.source.note).toBe('SAME');
    expect(f?.source.psiId).toBe('PSI-102');
  });
});
