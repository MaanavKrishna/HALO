import { describe, it, expect } from 'vitest';
import { extractNumbers, factNumbers, factTextTokens, numberMatches, validateNumbers } from '@/lib/si/validateNumbers';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { buildBrief } from '@/lib/engine/brief';
import { allFacts } from '@/lib/brief/pageFacts';
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
  it('matches by written precision only, with no relative tolerance', () => {
    expect(validateNumbers('21 of 35 runs', facts)).toEqual({ ok: false, offending: [21] });
    expect(validateNumbers('27 runs', [fact('det-cotton-scatter-runs', 26)])).toEqual({ ok: false, offending: [27] });
    expect(validateNumbers('about 35.5', facts).ok).toBe(false);
    const v = [fact('det-reading', 0.248, 'V')];
    expect(validateNumbers('0.29 V', v)).toEqual({ ok: false, offending: [0.29] });
    expect(validateNumbers('0.25 V', v).ok).toBe(true);
    expect(validateNumbers('0.2 V', v).ok).toBe(true);
    expect(validateNumbers('0.248 V', v).ok).toBe(true);
    expect(validateNumbers('1,280 rows', [fact('rows', 1225)])).toEqual({ ok: false, offending: [1280] });
    expect(validateNumbers('92%', [fact('p', 92.3)]).ok).toBe(true);
    expect(validateNumbers('1.50 kW', [fact('p', 1.5)]).ok).toBe(true);
    expect(validateNumbers('0.04', [fact('x', 0)]).ok).toBe(false);
  });
  it('accepts numbers written in fact labels', () => {
    expect(validateNumbers('the lower 95% bound', [fact('ext-probability-lo', 3)]).ok).toBe(false);
    const labelled: Fact = { ...fact('ext-probability-lo', 3), label: 'Lower 95% bound of that chance' };
    expect(validateNumbers('the lower 95% bound is 3%', [labelled]).ok).toBe(true);
  });
  it('rejects non-ASCII digits and number words', () => {
    for (const t of ['burns at ２７%', 'twenty-seven percent', 'Two runs', 'a thousand rows', 'x²', '٣ runs', 'half of ninety']) {
      expect(validateNumbers(t, facts).ok, t).toBe(false);
    }
    // "one" is allowed so that "one of the runs" still passes.
    expect(validateNumbers('one of the runs [det-kapton-scatter-low]', facts).ok).toBe(true);
    expect(validateNumbers('Someone attended; network often', facts).ok).toBe(true);
  });
  it('accepts numbers that appear inside text facts', () => {
    const text = [fact('flex-cool-flame', 'cool flame at ~500–800 K')];
    expect(validateNumbers('a 500 to 800 K cool flame', text).ok).toBe(true);
    expect(validateNumbers('a 900 K cool flame', text)).toEqual({ ok: false, offending: [900] });
  });
  it('reports number words and foreign digits with ok false even when every ASCII number matches', () => {
    expect(validateNumbers('34% and twenty-seven percent', facts)).toEqual({ ok: false, offending: [] });
  });
  it('reports each offending number once', () => {
    expect(validateNumbers('27 and 27 and 99', facts).offending).toEqual([27, 99]);
  });
  it('passes text with no numbers', () => {
    expect(validateNumbers('No real cabin material was tested here.', []).ok).toBe(true);
  });
});

describe('fixed-decimal display values', () => {
  it('"2.0 V" and "31.0%" match facts of 2 and 31 written to one decimal', () => {
    const facts = [
      { id: 'det-scatter-threshold', label: 'Scatter alarm proxy', value: 2, unit: 'V', decimals: 1, provenance: 'assumed' as const, source: { note: 'SAME' } },
      { id: 'lit-window-oxygen-high', label: 'Highest O2', value: 31, unit: '%', decimals: 1, provenance: 'literature' as const, source: { note: 'Saffire VI' } },
    ];
    expect(validateNumbers('The scatter proxy is 2.0 V and Saffire VI burned at 31.0% O2.', facts).ok).toBe(true);
    expect(validateNumbers('The scatter proxy is 2.1 V.', facts).ok).toBe(false);
  });
});

describe('allowlist ignores ids, standard numbers and years in fact text', () => {
  it('sample ids, standard numbers, letter-glued names and years never vouch for a number', () => {
    const fs: Fact[] = [
      { ...fact('lit-flow-low', 20), label: 'Saffire II SIBAL sample II-5: air flow' },
      { ...fact('aftermath-toxic-oxygen', 31), label: 'O2 where CO exceeded the limit (NASA-STD-3001)' },
      { ...fact('vehicle-fm', 'Flammability of Materials on the Moon (FM2), flown in 2025'), label: 'FM2' },
      { ...fact('bass-test-one', 'NASA-STD-6001 Test 1 is not conservative') },
    ];
    for (const n of ['5', '3001', '2', '2025', '6001', '1']) expect(validateNumbers(`${n} cm/s`, fs).ok, n).toBe(false);
    expect(validateNumbers('20 cm/s at 31% O2', fs).ok).toBe(true);
    expect(factNumbers(fs).sort((a, b) => a - b)).toEqual([20, 31]);
  });
  it('keeps real quantities in labels ("95% bound", "24-hour limit")', () => {
    expect(factTextTokens('Upper 95% bound; the 24-hour crew limit').map((t) => t.value)).toEqual([95, 24]);
  });
});

describe('regression: text-valued facts hold no number that is not a numeric fact', () => {
  it('every number in a text fact’s text equals some numeric fact value, for every preset', () => {
    for (const k of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
      const fs = allFacts(buildBrief(PRESETS[k], HALO_DATA), HALO_DATA);
      const nums = fs.filter((f) => typeof f.value === 'number').map((f) => f.value as number);
      for (const f of fs) {
        if (typeof f.value !== 'string') continue;
        const bad = factTextTokens(f.value).filter((t) => !nums.some((v) => numberMatches(t, v)));
        expect(bad.map((t) => t.value), `${k} ${f.id}: ${f.value}`).toEqual([]);
      }
    }
  });
});
