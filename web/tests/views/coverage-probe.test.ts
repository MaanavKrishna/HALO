import { describe, expect, it } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { COVERAGE_CLASSES, VIEW, classCoverage, gradeAt, probePoints, probeReadout, probeTests } from '@/lib/coverage';
import { nearestByClass } from '@/lib/engine/distance';
import { PRESETS } from '@/lib/engine/presets';
import { queryToHabitat } from '@/lib/engine/url';

const PP = probePoints(HALO_DATA);
const TESTS = probeTests(PP);

describe('habitat probe', () => {
  it('grades every preset exactly as the map chips do, for every fuel class', () => {
    for (const c of COVERAGE_CLASSES) {
      for (const chip of classCoverage(HALO_DATA, c).presets) {
        const h = PRESETS[chip.key];
        expect(probeReadout(h.o2Pct, h.pressurePsia, c, TESTS).grade, `${chip.key} on ${c}`).toBe(chip.grade);
      }
    }
  });

  it('matches the full-data grade, nearest condition, gaps and distance across the window', () => {
    for (let o2 = VIEW.o2[0]; o2 <= VIEW.o2[1]; o2 += 2.5) {
      for (let p = VIEW.p[0]; p <= VIEW.p[1]; p += 0.7) {
        const h = { ...PRESETS.iss, o2Pct: o2, pressurePsia: p };
        const full = nearestByClass(h, HALO_DATA.tests);
        for (const c of COVERAGE_CLASSES) {
          const r = probeReadout(o2, p, c, TESTS);
          expect(r.grade).toBe(gradeAt(h, c, HALO_DATA.tests));
          expect(r.nearest.d).toBeCloseTo(full[c].d!, 12);
          expect(r.nearest.o2Gap).toBeCloseTo(full[c].o2Gap!, 12);
          expect(r.nearest.pGap).toBeCloseTo(full[c].pGap!, 12);
        }
      }
    }
  });

  it('names the same investigation as the engine at each preset', () => {
    for (const c of COVERAGE_CLASSES) {
      for (const key of ['iss', 'artemis', 'moon'] as const) {
        const h = PRESETS[key];
        expect(probeReadout(h.o2Pct, h.pressurePsia, c, TESTS).nearest.test?.acronym).toBe(nearestByClass(h, HALO_DATA.tests)[c].test?.acronym);
      }
    }
  });

  it('ships only distinct conditions to the client', () => {
    expect(TESTS.length).toBeLessThan(HALO_DATA.tests.length);
    expect(JSON.stringify(PP).length).toBeLessThan(8000);
  });

  it('builds a brief link the brief parses back to the probe atmosphere', () => {
    const q = new URLSearchParams({ o2: '27.5', p: '9.3' });
    const { habitat, notices } = queryToHabitat(q);
    expect(notices).toEqual([]);
    expect([habitat.o2Pct, habitat.pressurePsia]).toEqual([27.5, 9.3]);
  });
});
