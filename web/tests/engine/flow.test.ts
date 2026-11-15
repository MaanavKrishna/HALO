import { describe, it, expect } from 'vitest';
import { loadFixtureData } from '@/lib/data/fixtures';
import { buildBrief } from '@/lib/engine/brief';
import { nearestByClass } from '@/lib/engine/distance';
import { FLOW_GUIDE_MINIMUM, flowCoverage, flowFacts, flowId, literatureFlowPair, nearFlowId } from '@/lib/engine/flow';
import { PRESETS } from '@/lib/engine/presets';
import type { HaloData, Habitat, TestPoint } from '@/lib/engine/types';

const base = loadFixtureData();
const tp = (id: string, o2Pct: number, pressurePsia: number, flowCmS?: number | null, fuelClass: TestPoint['fuelClass'] = 'solid'): TestPoint => ({
  id, psiId: 'PSI-25', acronym: 'BASS-II', fuelClass, fuel: `fuel ${id}`, o2Pct, pressurePsia, o2Src: 'measured', pSrc: 'measured',
  ...(flowCmS === undefined ? {} : { flowCmS, flowSrc: 'measured' as const }),
});
const withTests = (tests: TestPoint[]): HaloData => ({ ...base, tests });
const hab = (flowCmS: number, o2Pct = 30, pressurePsia = 10.2): Habitat => ({ ...PRESETS.moon, o2Pct, pressurePsia, flowCmS });

// Three solid tests tied at one condition (22.2% O2, 14.7 psia) at different flows, one farther away.
const rows = [tp('a', 22.2, 14.7, 0), tp('b', 22.2, 14.7, 5), tp('c', 22.2, 14.7, 10), tp('d', 17, 14.7, 49)];

describe('nearest-test tie-break by air flow', () => {
  it('names the tied test whose flow is closest to the habitat', () => {
    expect(nearestByClass(hab(5), rows).solid.test?.id).toBe('b');
    expect(nearestByClass(hab(10), rows).solid.test?.id).toBe('c');
    expect(nearestByClass(hab(0), rows).solid.test?.id).toBe('a');
  });
  it('keeps the distance unchanged and prefers a recorded flow over none', () => {
    const r5 = nearestByClass(hab(5), rows).solid;
    const r10 = nearestByClass(hab(10), rows).solid;
    expect(r5.d).toBe(r10.d);
    expect(nearestByClass(hab(5), [tp('x', 22.2, 14.7), tp('y', 22.2, 14.7, 30)]).solid.test?.id).toBe('y');
  });
  it('falls back to data order when no test records flow', () => {
    expect(nearestByClass(hab(5), [tp('x', 22.2, 14.7), tp('y', 22.2, 14.7)]).solid.test?.id).toBe('x');
  });
});

describe('flowCoverage', () => {
  it('uses per-row flows when recorded: range, nearest flow, and the tied set', () => {
    const h = hab(5);
    const cov = flowCoverage(h, rows, base.investigations, nearestByClass(h, rows)).solid;
    expect(cov.basis).toBe('rows');
    expect(cov.range).toEqual([0, 49]);
    expect(cov.inside).toBe(true);
    expect(cov.nearestFlow).toBe(5);
    expect(cov.nearestPoint).toEqual({ n: 3, range: [0, 10], src: ['measured', 'measured'] });
  });
  it('flags a habitat flow outside every tested flow', () => {
    const h = hab(60);
    expect(flowCoverage(h, rows, base.investigations, nearestByClass(h, rows)).solid.inside).toBe(false);
  });
  it('falls back to the investigations’ flow ranges when rows carry no flow', () => {
    const plain = [tp('x', 22.2, 14.7)];
    const invs = base.investigations.map((i) => (i.psiId === 'PSI-25' ? { ...i, flowRangeCmS: [1, 12] as [number, number] } : i));
    const h = hab(20);
    const cov = flowCoverage(h, plain, invs, nearestByClass(h, plain)).solid;
    expect(cov.basis).toBe('investigations');
    expect(cov.range).toEqual([1, 12]);
    expect(cov.inside).toBe(false);
    expect(cov.nearestFlow).toBeNull();
    expect(cov.nearestPoint).toBeNull();
  });
  it('reports no range when nothing records flow', () => {
    const plain = [tp('x', 22.2, 14.7)];
    const invs = base.investigations.map((i) => ({ ...i, flowRangeCmS: null }));
    const h = hab(5);
    const cov = flowCoverage(h, plain, invs, nearestByClass(h, plain)).solid;
    expect(cov.range).toBeNull();
    expect(cov.inside).toBeNull();
  });
});

describe('flowFacts', () => {
  it('emits the class range and the nearest-test flow facts with valid ids', () => {
    const data = withTests(rows);
    const h = hab(5);
    const by = nearestByClass(h, rows);
    const facts = flowFacts(flowCoverage(h, rows, data.investigations, by), by, data);
    const v = (id: string) => facts.find((f) => f.id === id)?.value;
    expect(v(flowId('solid', 'min'))).toBe(0);
    expect(v(flowId('solid', 'max'))).toBe(49);
    expect(v(nearFlowId('solid', 'flow'))).toBe(5);
    expect(v(nearFlowId('solid', 'flow-count'))).toBe(3);
    expect(v(nearFlowId('solid', 'flow-low'))).toBe(0);
    expect(v(nearFlowId('solid', 'flow-high'))).toBe(10);
    for (const f of facts) expect(f.id).toMatch(/^[a-z-]+$/);
    expect(facts.find((f) => f.id === nearFlowId('solid', 'flow-count'))?.provenance).toBe('computed');
  });
});

describe('flow provenance follows the row that sets each end (tests.json flowSrc)', () => {
  // The w3-data row shape: flowCmS with flowSrc measured | inferred | assumed.
  const row = (id: string, psiId: string, acronym: string, fuelClass: TestPoint['fuelClass'], o2Pct: number, pressurePsia: number, flowCmS: number, flowSrc: 'measured' | 'inferred' | 'assumed'): TestPoint => ({
    id, psiId, acronym, fuelClass, fuel: `fuel ${id}`, o2Pct, pressurePsia, o2Src: 'measured', pSrc: 'measured', flowCmS, flowSrc,
  });
  const solids = [
    row('bass-0', 'PSI-25', 'BASS-II', 'solid', 22.2, 14.7, 0, 'inferred'),
    row('bass-20', 'PSI-25', 'BASS-II', 'solid', 22.2, 14.7, 20, 'inferred'),
    row('saf-1', 'PSI-98', 'Saffire-I', 'solid', 21, 14.5, 20, 'measured'),
    row('saf-3', 'PSI-100', 'Saffire-III', 'solid', 21, 14.5, 30, 'measured'),
  ];
  const droplets = [row('flex', 'PSI-69', 'FLEX', 'droplet', 21, 14.7, 0, 'assumed'), row('cfi', 'PSI-39', 'CFI', 'droplet', 30, 14.7, 0, 'assumed')];
  const all = [...solids, ...droplets];
  const facts = (tests: TestPoint[], h = hab(10)) => {
    const by = nearestByClass(h, tests);
    return flowFacts(flowCoverage(h, tests, base.investigations, by), by, withTests(tests));
  };
  const prov = (fs: ReturnType<typeof facts>, id: string) => fs.find((f) => f.id === id)?.provenance;

  it('BASS-II inferred 0 cm/s sets the solid minimum: inferred; Saffire-III measured 30 sets the maximum: measured', () => {
    const fs = facts(all);
    expect(fs.find((f) => f.id === flowId('solid', 'min'))?.value).toBe(0);
    expect(prov(fs, flowId('solid', 'min'))).toBe('inferred');
    expect(fs.find((f) => f.id === flowId('solid', 'max'))?.value).toBe(30);
    expect(prov(fs, flowId('solid', 'max'))).toBe('measured');
  });
  it('FLEX and CFI still-air droplets: both ends assumed', () => {
    const fs = facts(all);
    expect(prov(fs, flowId('droplet', 'min'))).toBe('assumed');
    expect(prov(fs, flowId('droplet', 'max'))).toBe('assumed');
  });
  it('on a tie at the max, the weakest source wins (assumed < inferred < measured)', () => {
    const tied = [...solids, row('x', 'PSI-0', 'X', 'solid', 25, 10, 30, 'assumed')];
    expect(prov(facts(tied), flowId('solid', 'max'))).toBe('assumed');
    const tied2 = [...solids, row('y', 'PSI-0', 'Y', 'solid', 25, 10, 30, 'inferred')];
    expect(prov(facts(tied2), flowId('solid', 'max'))).toBe('inferred');
  });
  it('the tied set at the nearest condition takes its ends\' provenance too', () => {
    const fs = facts(solids, hab(10, 22.2, 14.7));
    expect(fs.find((f) => f.id === nearFlowId('solid', 'flow-low'))?.value).toBe(0);
    expect(prov(fs, nearFlowId('solid', 'flow-low'))).toBe('inferred');
    expect(prov(fs, nearFlowId('solid', 'flow-high'))).toBe('inferred');
  });
  it('a range from the investigations’ flowRangeCmS is inferred, not measured', () => {
    const plain = [tp('x', 22.2, 14.7)];
    const invs = base.investigations.map((i) => (i.psiId === 'PSI-25' ? { ...i, flowRangeCmS: [1, 12] as [number, number] } : i));
    const h = hab(5);
    const by = nearestByClass(h, plain);
    const fs = flowFacts(flowCoverage(h, plain, invs, by), by, withTests(plain));
    expect(prov(fs, flowId('solid', 'min'))).toBe('inferred');
    expect(prov(fs, flowId('solid', 'max'))).toBe('inferred');
  });
});

describe('flow in the brief', () => {
  it('Rover (5 cm/s) and Moon (10 cm/s) name different nearest solid tests when rows record flow', () => {
    const data = withTests([...rows, ...base.tests.filter((t) => t.fuelClass !== 'solid')]);
    const rover = buildBrief(PRESETS.rover, data);
    const moon = buildBrief(PRESETS.moon, data);
    expect(rover.flow.solid.nearestFlow).toBe(5);
    expect(moon.flow.solid.nearestFlow).toBe(10);
    expect(rover.byClass.solid.test?.id).not.toBe(moon.byClass.solid.test?.id);
    expect(rover.grade).toEqual(moon.grade);
  });
  it('adds the "flow outside tested range" caution only when the habitat flow is outside every solid flow', () => {
    const data = withTests([...rows, ...base.tests.filter((t) => t.fuelClass !== 'solid')]);
    const out = buildBrief({ ...PRESETS.moon, flowCmS: 60 }, data);
    const flag = out.flags.find((f) => f.id === 'flow-outside-tested');
    expect(flag?.severity).toBe('warning');
    expect(flag?.detail).toContain('0 to 49 cm/s');
    expect(flag?.detail).toContain('60 cm/s');
    expect(flag?.factIds).toEqual([flowId('solid', 'min'), flowId('solid', 'max'), 'habitat-flow']);
    expect(buildBrief(PRESETS.moon, data).flags.some((f) => f.id === 'flow-outside-tested')).toBe(false);
  });
  it('always carries the Researcher’s Guide flow facts', () => {
    const b = buildBrief(PRESETS.rover, base);
    expect(b.facts.find((f) => f.id === FLOW_GUIDE_MINIMUM.id)?.value).toBe(10);
    expect(b.facts.find((f) => f.id === 'flow-guide-upstream')?.provenance).toBe('literature');
  });
});

describe('literatureFlowPair', () => {
  it('picks two runs of one mission and material at different flows, both with a spread rate', () => {
    const data: HaloData = {
      ...base,
      literature: [
        { mission: 'Saffire-II', sampleId: 'II-5', material: 'SIBAL fabric', o2Pct: 21, pressurePsia: 14.5, flowCmS: 20, spreadRateMmS: 2.1, outcome: '', sourceUrl: 'https://ntrs.nasa.gov/citations/1', confidence: 'high' },
        { mission: 'Saffire-II', sampleId: 'II-6', material: 'SIBAL fabric', o2Pct: 21, pressurePsia: 14.5, flowCmS: 25, spreadRateMmS: 2.6, outcome: '', sourceUrl: 'https://ntrs.nasa.gov/citations/1', confidence: 'high' },
        { mission: 'Saffire-IV', sampleId: 'IV-1', material: 'SIBAL fabric', o2Pct: 22, pressurePsia: 14.5, flowCmS: 20, spreadRateMmS: 3.6, outcome: '', sourceUrl: 'https://ntrs.nasa.gov/citations/2', confidence: 'high' },
      ],
    };
    const p = literatureFlowPair(data)!;
    expect(p.low.sampleId).toBe('II-5');
    expect(p.high.sampleId).toBe('II-6');
    expect(p.facts.map((f) => f.value)).toEqual([20, 2.1, 25, 2.6]);
    expect(p.facts.every((f) => f.provenance === 'literature')).toBe(true);
    // Fixture tests carry no Saffire-II rows, so the pair is outside PSI here.
    expect(p.inPsi).toBe(base.tests.some((t) => t.acronym.toLowerCase() === 'saffire-ii'));
  });
  it('calls a PSI mission (Saffire-II is PSI-99) a PSI mission: spread rates from the NASA report, no "not in PSI"', () => {
    const lit = (sampleId: string, flowCmS: number, spreadRateMmS: number) => ({ mission: 'Saffire-II', sampleId, material: 'SIBAL fabric', o2Pct: 21, pressurePsia: 14.5, flowCmS, spreadRateMmS, outcome: '', sourceUrl: 'https://ntrs.nasa.gov/citations/1', confidence: 'high' });
    const saf2: TestPoint = { id: 's2', psiId: 'PSI-99', acronym: 'Saffire-II', fuelClass: 'solid', fuel: 'SIBAL', o2Pct: 21, pressurePsia: 14.5, o2Src: 'measured', pSrc: 'measured' };
    const literature = [lit('II-5', 20, 2.1), lit('II-6', 25, 2.6)];
    const inPsi = literatureFlowPair({ ...base, tests: [...base.tests, saf2], literature })!;
    expect(inPsi.inPsi).toBe(true);
    expect(inPsi.facts[0].source.note).toMatch(/spread rates from the NASA report$/);
    const outside = literatureFlowPair({ ...base, tests: base.tests.filter((t) => t.acronym !== 'Saffire-II'), literature })!;
    expect(outside.inPsi).toBe(false);
    expect(outside.facts[0].source.note).toMatch(/mission not in PSI/);
  });
  it('returns null when no pair exists', () => {
    expect(literatureFlowPair({ ...base, literature: [] })).toBeNull();
  });
});
