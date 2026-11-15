import { describe, it, expect } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { buildBrief } from '@/lib/engine/brief';
import { factText } from '@/lib/engine/types';

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
    expect(f.detail).toMatch(/Saffire VI \(NASA reports, literature\) burned SIBAL and PMMA at 30\.3–31\.0% O2 and about 7\.9 psia/);
    const kapton = b.flags.find((x) => x.id === 'detector-miss-kapton')!;
    expect(kapton.detail).toContain('(scatter is a 2.0 V proxy)');
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
    const byId = new Map(b.facts.map((f) => [f.id, factText(f)]));
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
  it('det facts cite the PSI record that holds the SAME/SAME-R results workbook (PSI-101)', () => {
    const b = buildBrief(PRESETS.artemis, HALO_DATA);
    const f = b.facts.find((x) => x.id === 'det-kapton-scatter-runs');
    expect(f?.source.psiId).toBe('PSI-101');
    expect(f?.source.note).toMatch(/SAME and SAME-R/);
  });
});

import { allFacts, archiveId, archiveMissionLabel, NEXT_LITERATURE_DISTANCE } from '@/lib/brief/pageFacts';

describe.skipIf(!isReal)('real data: grade, flow and next-test facts', () => {
  const art = buildBrief(PRESETS.artemis, HALO_DATA);
  const v = (b: typeof art, id: string) => allFacts(b, HALO_DATA).find((f) => f.id === id)?.value;

  it('explains Artemis D in plain words first, then the rule, with every number a fact', () => {
    expect(art.grade.reason).toBe(
      'No real cabin material in PSI was tested anywhere near this atmosphere, so real materials alone would grade F. A stand-in (a gas burner that mimics a burning solid) was tested close by, which lifts the grade one step to D.',
    );
    expect(art.grade.technical).toContain('evidence distance 2.47');
    expect(art.grade.technical).toContain('ACME BRE');
    expect(v(art, 'grade-solid-distance')).toBe(2.47);
    expect(v(art, 'grade-surrogate-distance')).toBe(0);
    expect(v(art, 'grade-solid')).toBe('F');
  });

  it('reports the tested solid flow range and the Researcher’s Guide flow facts', () => {
    expect(v(art, 'flow-solid-min')).toBe(0);
    // BASS-II rows (inferred 0 cm/s) set the minimum; Saffire-III (measured 30 cm/s) sets the maximum.
    expect(v(art, 'flow-solid-max')).toBe(30);
    expect(art.flow.solid.basis).toBe('rows');
    const pv = (id: string) => art.facts.find((f) => f.id === id)?.provenance;
    expect(pv('flow-solid-min')).toBe('inferred');
    expect(pv('flow-solid-max')).toBe('measured');
    // FLEX and CFI droplet flows are assumed (still air), so both ends of the droplet range are assumed.
    expect(pv('flow-droplet-min')).toBe('assumed');
    expect(pv('flow-droplet-max')).toBe('assumed');
    expect(v(art, 'flow-guide-minimum')).toBe(10);
    expect(art.flow.solid.inside).toBe(true);
    // FLEX and CFI droplets burned in still air, so a ventilated cabin is outside the droplet flow range.
    expect(art.flow.droplet.range).toEqual([0, 0]);
    expect(art.flow.droplet.inside).toBe(false);
  });

  it('Rover and Moon differ in flow: habitat flow, and droplet coverage stays outside for both', () => {
    const rover = buildBrief(PRESETS.rover, HALO_DATA);
    const moon = buildBrief(PRESETS.moon, HALO_DATA);
    expect(v(rover, 'habitat-flow')).toBe(5);
    expect(v(moon, 'habitat-flow')).toBe(10);
    expect(rover.flow.solid.habitatFlow).not.toBe(moon.flow.solid.habitatFlow);
    // When tests.json carries per-row flow, the nearest solid test is chosen by flow too.
    if (rover.flow.solid.basis === 'rows') expect(rover.flow.solid.nearestFlow).not.toBe(moon.flow.solid.nearestFlow);
  });

  it('measures the top pick against every Saffire run: Saffire V sits closer than Saffire VI', () => {
    expect(art.nextTests[0]).toMatchObject({ fuelClass: 'solid', o2Pct: 30, pressurePsia: 10 });
    expect(v(art, NEXT_LITERATURE_DISTANCE)).toBe(0.39);
    const f = allFacts(art, HALO_DATA).find((x) => x.id === NEXT_LITERATURE_DISTANCE);
    expect(f?.label).toMatch(/Saffire V, NASA report, mission not in PSI/);
    expect(f?.source.note).toMatch(/Saffire V sample V-2/);
  });

  it('the Saffire-II flow pair is a PSI mission (PSI-99): spread rates from the NASA report, never "not PSI"', () => {
    const lo = art.facts.find((x) => x.id === 'lit-flow-low');
    expect(lo?.label).toMatch(/^Saffire II /);
    expect(lo?.source.note).toMatch(/spread rates from the NASA report$/);
    expect(lo?.source.note).not.toMatch(/not (in )?PSI/);
  });

  it('archiving counts only Saffire IV–VI (Saffire I–III are already PSI-98/99/100) and cites the run it used', () => {
    expect(archiveMissionLabel(HALO_DATA)).toBe('Saffire IV–VI');
    const all = allFacts(art, HALO_DATA);
    const f = (id: string) => all.find((x) => x.id === id)!;
    expect(f(archiveId('artemis', 'after')).label).toMatch(/Saffire IV–VI runs not yet in PSI/);
    for (const id of [archiveId('artemis', 'after'), archiveId('moon', 'after'), 'next-archived-oxygen']) {
      expect(['https://ntrs.nasa.gov/citations/20210011521', 'https://ntrs.nasa.gov/citations/20240002981']).toContain(f(id).source.url);
    }
  });

  it('archiving the Saffire IV–VI runs in PSI would close most of the real-solid gap', () => {
    expect(v(art, archiveId('artemis', 'before'))).toBe(2.47);
    expect(v(art, archiveId('artemis', 'after'))).toBe(0.32);
    expect(v(art, archiveId('moon', 'before'))).toBe(1.69);
    expect(v(art, archiveId('moon', 'after'))).toBe(0.38);
    expect(v(art, 'next-archived-oxygen')).toBe(30);
    expect(v(art, 'next-archived-pressure')).toBe(10);
  });
});
