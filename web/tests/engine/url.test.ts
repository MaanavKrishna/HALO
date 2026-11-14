import { describe, it, expect } from 'vitest';
import { PRESETS } from '@/lib/engine/presets';
import { habitatToQuery, queryToHabitat } from '@/lib/engine/url';

const q = (s: string) => queryToHabitat(new URLSearchParams(s));

describe('URL codec', () => {
  it('round-trips every preset', () => {
    for (const h of Object.values(PRESETS)) {
      const r = queryToHabitat(new URLSearchParams(habitatToQuery(h)));
      expect(r.habitat).toEqual(h);
      expect(r.notices).toEqual([]);
    }
  });

  it('round-trips liquids and two detectors', () => {
    const h = { ...PRESETS.rover, liquids: true, detectors: ['scatter', 'ionization'] as const, materials: [] };
    const r = queryToHabitat(new URLSearchParams(habitatToQuery({ ...h, detectors: [...h.detectors] })));
    expect(r.habitat).toEqual({ ...h, detectors: [...h.detectors] });
  });

  it('Review Focus 1: o2=abc&p=0&m=plutonium', () => {
    let r: ReturnType<typeof q> | undefined;
    expect(() => { r = q('o2=abc&p=0&m=plutonium'); }).not.toThrow();
    expect(r!.habitat.o2Pct).toBe(34);
    expect(r!.habitat.pressurePsia).toBe(0.5);
    expect(r!.habitat.materials).toEqual([]);
    expect(r!.notices).toHaveLength(3);
  });

  it('missing parameters default silently to the Artemis preset values', () => {
    const r = q('');
    expect(r.notices).toEqual([]);
    expect(r.habitat.o2Pct).toBe(34);
    expect(r.habitat.pressurePsia).toBe(8.2);
    expect(r.habitat.flowCmS).toBe(10);
    expect(r.habitat.materials).toEqual(['kapton', 'teflon', 'cotton']);
    expect(r.habitat.detectors).toEqual(['scatter']);
    expect(r.habitat.liquids).toBe(false);
  });

  it('clamps with one notice per parameter', () => {
    const r = q('o2=150&p=99&f=-3');
    expect(r.habitat).toMatchObject({ o2Pct: 100, pressurePsia: 20, flowCmS: 0 });
    expect(r.notices).toHaveLength(3);
  });

  it('drops unknown materials and detectors with one notice each', () => {
    const r = q('m=kapton,foo,bar&d=laser,ionization,zap');
    expect(r.habitat.materials).toEqual(['kapton']);
    expect(r.habitat.detectors).toEqual(['ionization']);
    expect(r.notices).toHaveLength(2);
  });

  it('empty d defaults to scatter; all-unknown d also falls back to scatter', () => {
    expect(q('d=').habitat.detectors).toEqual(['scatter']);
    expect(q('d=').notices).toEqual([]);
    const r = q('d=zap');
    expect(r.habitat.detectors).toEqual(['scatter']);
    expect(r.notices).toHaveLength(1);
  });

  it('empty m means no materials, silently', () => {
    expect(q('m=')).toEqual({ habitat: expect.objectContaining({ materials: [] }), notices: [] });
  });

  it('invalid l gives one notice and defaults to false', () => {
    const r = q('l=maybe');
    expect(r.habitat.liquids).toBe(false);
    expect(r.notices).toHaveLength(1);
    expect(q('l=1').habitat.liquids).toBe(true);
  });

  it('sanitises the name', () => {
    const r = q(`n=${encodeURIComponent('  <script>alert(1)</script>' + 'x'.repeat(80) + '  ')}`);
    expect(r.habitat.name).not.toMatch(/[<>]/);
    expect(r.habitat.name.length).toBeLessThanOrEqual(60);
    expect(r.habitat.name.startsWith('script')).toBe(true);
  });

  it('rejects non-finite numbers', () => {
    const r = q('o2=Infinity&p=1e999&f=NaN');
    expect(r.habitat).toMatchObject({ o2Pct: 34, pressurePsia: 8.2, flowCmS: 10 });
    expect(r.notices).toHaveLength(3);
  });
});
