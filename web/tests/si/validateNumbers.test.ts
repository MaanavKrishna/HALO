import { describe, it, expect } from 'vitest';
import { extractNumbers, validateNumbers } from '@/lib/si/validateNumbers';
import type { Fact } from '@/lib/engine/types';

const fact = (id: string, value: number | string, unit?: string): Fact => ({
  id, label: id, value, unit, provenance: 'measured', source: {},
});

describe('extractNumbers', () => {
  it('reads a kW range with an en dash as two positive numbers', () => {
    expect(extractNumbers('Saffire VI fires ran at 1.5–3.2 kW.')).toEqual([1.5, 3.2]);
  });
  it('reads micrometre decimals', () => {
    expect(extractNumbers('Median particle size 0.118 µm.')).toEqual([0.118]);
  });
  it('reads "x/y" and "x of y" as two numbers', () => {
    expect(extractNumbers('20/35 runs')).toEqual([20, 35]);
    expect(extractNumbers('in 20 of 35 runs')).toEqual([20, 35]);
  });
  it('strips [fact-id] citations before reading numbers', () => {
    expect(extractNumbers('Grade D at 34% O2 [cov-solid-oxygen].')).toEqual([34]);
    expect(extractNumbers('[det-kapton-scatter-low][det-kapton-scatter-runs]')).toEqual([]);
  });
  it('ignores gas formulas such as O2, CO2 and H2O', () => {
    expect(extractNumbers('O2 and CO2 rose; H2O condensed.')).toEqual([]);
  });
  it('counts digits glued to other letters (x2, FLEX2) so they must be facts', () => {
    expect(extractNumbers('FLEX2 ran x2')).toEqual([2, 2]);
  });
  it('reads thousands separators and leading-dot decimals', () => {
    expect(extractNumbers('1,967 rows and .5 mm')).toEqual([1967, 0.5]);
  });
  it('drops minus signs (ranges are not negatives)', () => {
    expect(extractNumbers('range 5-10')).toEqual([5, 10]);
  });
});

describe('validateNumbers', () => {
  const facts = [fact('cov-solid-oxygen', 34, '%'), fact('det-kapton-scatter-low', 20), fact('det-kapton-scatter-runs', 35)];

  it('passes when every number is a fact value', () => {
    expect(validateNumbers('Grade D at 34% O2', facts)).toEqual({ ok: true, offending: [] });
    expect(validateNumbers('missed in 20 of 35 runs [det-kapton-scatter-low]', facts).ok).toBe(true);
  });
  it('flags an invented number', () => {
    expect(validateNumbers('burns at 27%', facts)).toEqual({ ok: false, offending: [27] });
  });
  it('allows 5% relative or 0.05 absolute tolerance', () => {
    expect(validateNumbers('about 35.5', facts).ok).toBe(true); // within 5% of 34 or 35
    expect(validateNumbers('0.04', [fact('x', 0)]).ok).toBe(true); // 0.05 absolute
    expect(validateNumbers('0.2', [fact('x', 0)]).ok).toBe(false);
    expect(validateNumbers('40', facts, 0).ok).toBe(false);
  });
  it('accepts numbers that appear inside text facts', () => {
    const text = [fact('flex-cool-flame', 'cool flame at ~500–800 K')];
    expect(validateNumbers('a 500 to 800 K cool flame', text).ok).toBe(true);
    expect(validateNumbers('a 900 K cool flame', text)).toEqual({ ok: false, offending: [900] });
  });
  it('reports each offending number once', () => {
    expect(validateNumbers('27 and 27 and 99', facts).offending).toEqual([27, 99]);
  });
  it('passes text with no numbers', () => {
    expect(validateNumbers('No real cabin material was tested here.', []).ok).toBe(true);
  });
});
