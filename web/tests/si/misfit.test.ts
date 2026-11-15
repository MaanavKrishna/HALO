import { describe, expect, it } from 'vitest';
import { briefFromQuery, resolveCitations } from '@/lib/si/explain';

const Q = 'o2=34&p=8.2&f=10&m=kapton,teflon,cotton&d=scatter&l=0&n=Artemis%20Base';

describe('SI citations that pin a number to the wrong fact', () => {
  const brief = briefFromQuery(Q);
  it.each([
    'The best next test is at 33% O2 and 8.5 psia [next-first-oxygen] [next-first-pressure].',
    'Scatter caught 5 of 35 Kapton runs [whatif-kapton-scatter-caught].',
    'After the suggested test the distance drops to 0.4 [next-first-artemis-after].',
  ])('flags a misfit: %s', (text) => {
    expect(resolveCitations(text, brief.facts).misfit).toBe(true);
  });

  it('accepts the right numbers', () => {
    const ok = 'The suggested test is at 30% O2 and 10 psia [next-first-oxygen] [next-first-pressure]; it moves Artemis Base from 2.47 [next-first-artemis-before] to 0.72 [next-first-artemis-after].';
    const r = resolveCitations(ok, brief.facts);
    expect(r.misfit).toBe(false);
    expect(r.factIds).toContain('next-first-artemis-after');
  });

  it('keeps runner-up tests out of the SI facts', () => {
    expect(brief.facts.some((f) => /^next-(second|third|fourth)-/.test(f.id))).toBe(false);
    expect(brief.facts.some((f) => f.id === 'next-first-oxygen')).toBe(true);
  });
});
