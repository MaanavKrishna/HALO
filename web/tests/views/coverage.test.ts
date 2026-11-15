import { describe, expect, it } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { buildBrief } from '@/lib/engine/brief';
import { classGrade, GRADE_RINGS } from '@/lib/engine/grade';
import { scaledDistance } from '@/lib/engine/distance';
import { PRESETS } from '@/lib/engine/presets';
import { COVERAGE_CLASSES, coverageMap, GRID, MOON_WINDOW, VIEW } from '@/lib/coverage';
import { O2_UNIT, P_UNIT } from '@/lib/engine/distance';

const map = coverageMap(HALO_DATA);

describe('evidence coverage map', () => {
  it('grades every preset exactly as its Fire Brief grades that fuel class', () => {
    for (const cov of map) {
      for (const p of cov.presets) {
        const brief = buildBrief(PRESETS[p.key], HALO_DATA);
        expect(p.grade, `${p.name} / ${cov.fuelClass}`).toBe(classGrade(brief.byClass[cov.fuelClass]));
      }
    }
  });

  it('keeps the known real-solid grades: Artemis F, EVA Suit F, ISS covered', () => {
    const solid = map.find((c) => c.fuelClass === 'solid')!;
    const g = Object.fromEntries(solid.presets.map((p) => [p.key, p.grade]));
    expect(g.artemis).toBe('F');
    expect(g.suit).toBe('F');
    expect(['A', 'B']).toContain(g.iss);
  });

  it('places every zone letter where the engine gives that letter', () => {
    for (const cov of map) {
      for (const l of cov.labels) {
        const rows = HALO_DATA.tests.filter((t) => t.fuelClass === cov.fuelClass);
        const d = Math.min(...rows.map((t) => scaledDistance(l.o2, l.p, t.o2Pct, t.pressurePsia)));
        const [b, c, dr] = GRADE_RINGS;
        const band = d <= b ? ['A', 'B'] : d <= c ? ['C'] : d <= dr ? ['D'] : ['F'];
        expect(band, `${cov.fuelClass} ${l.grade} at ${l.o2}, ${l.p}`).toContain(l.grade);
      }
    }
  });

  it('covers all four classes, a sane grid, and the Moon window from the Moon preset', () => {
    expect(map.map((c) => c.fuelClass)).toEqual(COVERAGE_CLASSES);
    expect(MOON_WINDOW).toEqual({ o2Min: PRESETS.moon.o2Pct, pMax: PRESETS.moon.pressurePsia });
    expect((VIEW.o2[1] - VIEW.o2[0]) / GRID.dO2).toBeGreaterThan(40);
    for (const c of map) {
      const total = Object.values(c.share).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 6);
    }
  });

  it('draws every ring as an ellipse whose edge sits at that ring\'s evidence distance from a tested condition', () => {
    const re = /M(-?[\d.]+) (-?[\d.]+)a([\d.]+) ([\d.]+) 0 1 0 ([\d.]+) 0a/g;
    for (const cov of map) {
      const rows = HALO_DATA.tests.filter((t) => t.fuelClass === cov.fuelClass);
      ([['b', 0], ['c', 1], ['d', 2]] as const).forEach(([key, i]) => {
        const r = GRADE_RINGS[i];
        const subs = [...cov.rings[key].matchAll(re)];
        expect(subs.length).toBeGreaterThan(0);
        for (const m of subs) {
          const [x0, cy, rx, ry] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
          expect(rx).toBeCloseTo(r * O2_UNIT, 9);
          expect(ry).toBeCloseTo(r * P_UNIT, 9);
          const cx = x0 + rx;
          // The centre is a tested condition (rounded to path precision).
          expect(rows.some((t) => Math.abs(t.o2Pct - cx) <= 0.051 && Math.abs(t.pressurePsia - cy) <= 0.051)).toBe(true);
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * 2 * Math.PI;
            expect(scaledDistance(cx + rx * Math.cos(a), cy + ry * Math.sin(a), cx, cy)).toBeCloseTo(r, 9);
          }
        }
      });
    }
  });

  it('keeps the drawn ring unions equal to the engine rule on a fine grid (pruning drops nothing visible)', () => {
    const re = /M(-?[\d.]+) (-?[\d.]+)a([\d.]+) ([\d.]+) /g;
    for (const cov of map) {
      const rows = HALO_DATA.tests.filter((t) => t.fuelClass === cov.fuelClass);
      ([['b', 0], ['c', 1], ['d', 2]] as const).forEach(([key, i]) => {
        const r = GRADE_RINGS[i];
        const centres = [...cov.rings[key].matchAll(re)].map((m) => [Number(m[1]) + Number(m[3]), Number(m[2])]);
        for (let o2 = VIEW.o2[0]; o2 <= VIEW.o2[1]; o2 += 0.25) {
          for (let p = VIEW.p[0]; p <= VIEW.p[1]; p += 0.125) {
            const d = Math.min(...rows.map((t) => scaledDistance(o2, p, t.o2Pct, t.pressurePsia)));
            const drawn = centres.some(([co, cp]) => scaledDistance(o2, p, co, cp) <= r);
            // Allow a hair at the edge for centres rounded to 0.1.
            if (d <= r - 0.02) expect(drawn, `${cov.fuelClass} ring ${r} at ${o2}, ${p}`).toBe(true);
            if (d > r + 0.02) expect(drawn, `${cov.fuelClass} ring ${r} at ${o2}, ${p}`).toBe(false);
          }
        }
      });
    }
  });
});
