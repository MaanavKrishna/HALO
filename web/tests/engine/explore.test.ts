import { describe, expect, it } from 'vitest';
import { doiUrl, filterInvestigations, conditionsByPsi, formatRange, plotPoints, shownCondition, sortInvestigations } from '@/lib/explore';
import type { Investigation, TestPoint } from '@/lib/engine/types';
import { HALO_DATA } from '@/lib/data/load';

const inv = (o: Partial<Investigation>): Investigation => ({
  psiId: 'PSI-1', acronym: 'A', title: '', hardware: 'h', fuelClasses: ['solid'], hazards: ['spread'], objective: '',
  researchImpacts: '', nRows: 0, o2Range: null, pRangePsia: null, flowRangeCmS: null, varied: [], publications: [],
  datasetDoi: '10.1/x', license: 'CC0-1.0', startDate: null, endDate: null, dateNote: null, ...o,
});

const list = [
  inv({ psiId: 'PSI-1', acronym: 'Bravo', nRows: 5, o2Range: [30, 40] }),
  inv({ psiId: 'PSI-2', acronym: 'alpha', nRows: 9, o2Range: null, fuelClasses: ['gas'], hazards: ['extinction'] }),
  inv({ psiId: 'PSI-3', acronym: 'Charlie', nRows: 1, o2Range: [12, 20], hazards: ['spread', 'extinction'] }),
];

describe('explore helpers', () => {
  it('filters by hazard and fuel class', () => {
    expect(filterInvestigations(list, { hazard: 'all', fuel: 'all' })).toHaveLength(3);
    expect(filterInvestigations(list, { hazard: 'extinction', fuel: 'all' }).map((i) => i.psiId)).toEqual(['PSI-2', 'PSI-3']);
    expect(filterInvestigations(list, { hazard: 'extinction', fuel: 'gas' }).map((i) => i.psiId)).toEqual(['PSI-2']);
  });
  it('sorts text case-insensitively', () => {
    expect(sortInvestigations(list, 'acronym', 'asc').map((i) => i.acronym)).toEqual(['alpha', 'Bravo', 'Charlie']);
    expect(sortInvestigations(list, 'acronym', 'desc').map((i) => i.acronym)).toEqual(['Charlie', 'Bravo', 'alpha']);
  });
  it('sorts numbers and keeps missing ranges last in both directions', () => {
    expect(sortInvestigations(list, 'o2', 'asc').map((i) => i.psiId)).toEqual(['PSI-3', 'PSI-1', 'PSI-2']);
    expect(sortInvestigations(list, 'o2', 'desc').map((i) => i.psiId)).toEqual(['PSI-1', 'PSI-3', 'PSI-2']);
    expect(sortInvestigations(list, 'rows', 'desc').map((i) => i.nRows)).toEqual([9, 5, 1]);
  });
  it('does not mutate its input', () => {
    const copy = [...list];
    sortInvestigations(list, 'rows', 'asc');
    expect(list).toEqual(copy);
  });
  it('formats ranges', () => {
    expect(formatRange(null, '%')).toBe('No usable O₂/pressure in PSI rows');
    expect(formatRange([21, 40], '%')).toBe('21–40%');
    expect(formatRange([14.696, 14.696], 'psia')).toBe('14.7 psia');
  });
  it('builds DOI links only for well-formed DOIs', () => {
    expect(doiUrl('10.60555/mbq8-0451')).toBe('https://doi.org/10.60555/mbq8-0451');
    expect(doiUrl('javascript:alert(1)')).toBeNull();
  });
  it('dedupes plot points and tracks measured', () => {
    const t = (id: string, o2: number, p: number, src: TestPoint['o2Src']): TestPoint => ({
      id, psiId: 'PSI-1', acronym: 'A', fuelClass: 'solid', fuel: 'x', o2Pct: o2, pressurePsia: p, o2Src: src, pSrc: 'measured',
    });
    const pts = plotPoints([t('a', 21, 14.7, 'measured'), t('b', 21, 14.7, 'inferred'), t('c', 30, 10, 'measured')], 'PSI-1');
    expect(pts).toEqual([
      { o2Pct: 21, pressurePsia: 14.7, count: 2, measured: false },
      { o2Pct: 30, pressurePsia: 10, count: 1, measured: true },
    ]);
  });
});

describe('shown O2 and pressure conditions (real data)', () => {
  const conds = conditionsByPsi(HALO_DATA.tests as TestPoint[]);
  const find = (id: string) => (HALO_DATA.investigations as Investigation[]).find((i) => i.psiId === id)!;
  const text = (id: string, which: 'o2' | 'pressure') => {
    const s = shownCondition(find(id), conds[id], which);
    return { text: formatRange(s.range, which === 'o2' ? '%' : 'psia'), src: s.src };
  };
  it('CLD (PSI-21) shows 21% with assumed provenance', () => {
    expect(text('PSI-21', 'o2')).toEqual({ text: '21%', src: 'assumed' });
    expect(text('PSI-21', 'pressure')).toEqual({ text: '14.7 psia', src: 'assumed' });
  });
  it('SAME (PSI-102) has no test conditions', () => {
    expect(shownCondition(find('PSI-102'), conds['PSI-102'], 'o2').basis).toBe('none');
    expect(text('PSI-102', 'o2').text).toBe('No usable O₂/pressure in PSI rows');
  });
  it('FLEX (PSI-69) shows its measured range, untagged', () => {
    expect(text('PSI-69', 'o2')).toEqual({ text: '12–34%', src: null });
    expect(text('PSI-69', 'pressure').src).toBeNull();
  });
  it('sorts by the shown range, with no-condition rows last', () => {
    const rows = ['PSI-102', 'PSI-69', 'PSI-21'].map(find);
    expect(sortInvestigations(rows, 'o2', 'asc', conds).map((i) => i.psiId)).toEqual(['PSI-69', 'PSI-21', 'PSI-102']);
    expect(sortInvestigations(rows, 'o2', 'desc', conds).map((i) => i.psiId)).toEqual(['PSI-21', 'PSI-69', 'PSI-102']);
  });
});
