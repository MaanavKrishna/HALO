import { nearestByClass, O2_UNIT, P_UNIT } from "@/lib/engine/distance";
import { classGrade, GRADE_RINGS } from "@/lib/engine/grade";
import { PRESETS } from "@/lib/engine/presets";
import type { FuelClass, Grade, Habitat, HaloData, TestPoint } from "@/lib/engine/types";

/**
 * Evidence coverage map: for every point of the O2 x pressure plane, the
 * class grade a habitat at that atmosphere would get from one fuel class's
 * tests alone. The grade is the engine's own (nearestByClass + classGrade);
 * this module only samples it on a grid and draws its ring boundaries.
 *
 * Because classGrade grades by the nearest test's evidence distance, the
 * region graded D or better is exactly the union of D-ring ellipses around
 * the tests (10 O2 points ~ 3 psia, so a ring of radius r is an ellipse with
 * half-axes 10r % O2 and 3r psia). The map draws those unions as paths, so
 * the band edges are exact, and samples a grid only to place the letters.
 */

export const COVERAGE_CLASSES: FuelClass[] = ["solid", "solid_surrogate", "droplet", "gas"];

export const COVERAGE_LABEL: Record<FuelClass, { short: string; long: string; alone: string }> = {
  solid: { short: "Real solids", long: "real cabin solids", alone: "real-solid tests alone" },
  solid_surrogate: { short: "Solid surrogate", long: "solid surrogates (gas burners that mimic a burning solid)", alone: "solid-surrogate tests alone" },
  droplet: { short: "Droplets", long: "liquid droplets", alone: "droplet tests alone" },
  gas: { short: "Gas flames", long: "gas flames", alone: "gas-flame tests alone" },
};

/** Display window (axis extents), not data: about 10-45% O2 and 2-16 psia, so every Moon and ISS preset fits. */
export const VIEW = { o2: [10, 45] as const, p: [2, 16] as const };
/** Grid used to place letters and to list grades (0.5 O2 points x 0.25 psia). */
export const GRID = { dO2: 0.5, dP: 0.25 };
/** The Moon window from the challenge: O2 at or above, pressure at or below, the Moon preset. */
export const MOON_WINDOW = { o2Min: PRESETS.moon.o2Pct, pMax: PRESETS.moon.pressurePsia };


const probe = (o2Pct: number, pressurePsia: number): Habitat => ({
  name: "map",
  o2Pct,
  pressurePsia,
  flowCmS: PRESETS.iss.flowCmS,
  materials: [],
  detectors: [],
  liquids: false,
});

/** The class grade at one atmosphere: the engine's nearest test per class, graded by its rings. */
export function gradeAt(h: Habitat, fuelClass: FuelClass, tests: TestPoint[]): Grade {
  return classGrade(nearestByClass(h, tests)[fuelClass]);
}

export interface ZoneLabel {
  grade: Grade;
  o2: number;
  p: number;
}

export interface ClassCoverage {
  fuelClass: FuelClass;
  /** Ring unions in data space (x = O2 %, y = psia): D-ring, C-ring, B-ring. */
  rings: { d: string; c: string; b: string };
  /** Tested conditions as zero-length subpaths (drawn as dots with round caps). */
  dots: string;
  tests: number;
  conditions: number;
  o2Range: [number, number] | null;
  pRange: [number, number] | null;
  /** Tested conditions inside the drawn window. */
  inView: number;
  labels: ZoneLabel[];
  presets: Array<{ key: keyof typeof PRESETS; name: string; grade: Grade }>;
  /** Share of the window's grid points at each grade. */
  share: Record<Grade, number>;
}

const n2 = (x: number) => Number(x.toFixed(2));

const n1 = (x: number) => Number(x.toFixed(1));

/** One ellipse as a closed path (centre rounded to 0.1, half-axes exact: they are ring multiples of the units). */
export function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${n1(cx - rx)} ${n1(cy)}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
}

const GRADES: Grade[] = ["A", "B", "C", "D", "F"];

/** Letter placement: the most interior grid point of each same-grade zone, kept clear of presets. */
function zoneLabels(grid: Grade[][], nx: number, ny: number, x: (i: number) => number, y: (j: number) => number, avoid: Array<[number, number]>, dots: Array<[number, number]>): ZoneLabel[] {
  // Distances in plot fractions so both axes weigh alike on screen.
  const fx = (o2: number) => (o2 - VIEW.o2[0]) / (VIEW.o2[1] - VIEW.o2[0]);
  const fy = (p: number) => (p - VIEW.p[0]) / (VIEW.p[1] - VIEW.p[0]);
  const seen: boolean[][] = grid.map((col) => col.map(() => false));
  const edge: Array<[number, number, Grade]> = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const g = grid[i][j];
      const nb = [grid[i - 1]?.[j], grid[i + 1]?.[j], grid[i]?.[j - 1], grid[i]?.[j + 1]];
      if (nb.some((v) => v !== undefined && v !== g)) edge.push([fx(x(i)), fy(y(j)), g]);
    }
  const out: ZoneLabel[] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      if (seen[i][j]) continue;
      const g = grid[i][j];
      const stack: Array<[number, number]> = [[i, j]];
      seen[i][j] = true;
      let best = { s: -1, i, j };
      while (stack.length) {
        const [a, b] = stack.pop()!;
        const px = fx(x(a));
        const py = fy(y(b));
        let s = Math.min(px, 1 - px, (py - 0) * 0.62, (1 - py) * 0.62);
        for (const [ex, ey, eg] of edge) if (eg !== g) s = Math.min(s, Math.hypot(ex - px, (ey - py) * 0.62));
        for (const [ax, ay] of avoid) s = Math.min(s, Math.hypot(fx(ax) - px, (fy(ay) - py) * 0.62) - 0.02);
        for (const [ax, ay] of dots) s = Math.min(s, Math.hypot(fx(ax) - px, (fy(ay) - py) * 0.62) + 0.01);
        if (s > best.s) best = { s, i: a, j: b };
        for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const c = a + da;
          const d = b + db;
          if (c >= 0 && c < nx && d >= 0 && d < ny && !seen[c][d] && grid[c][d] === g) {
            seen[c][d] = true;
            stack.push([c, d]);
          }
        }
      }
      if (best.s >= 0.035) out.push({ grade: g, o2: n2(x(best.i)), p: n2(y(best.j)) });
    }
  return out;
}

/**
 * Drop ellipses the rest of the same ring already covers (checked on a dense
 * sample of each ellipse's edge and interior), so the union path stays small.
 * Only ellipses whose every sample lies inside another kept ellipse go.
 */
function prune(centers: Array<[number, number]>, r: number): Array<[number, number]> {
  const inside = (o: number, p: number, [co, cp]: [number, number]) => Math.hypot((o - co) / (r * O2_UNIT), (p - cp) / (r * P_UNIT)) <= 1 + 1e-9;
  const samples: Array<[number, number]> = [];
  for (let k = 0; k < 48; k++) samples.push([Math.cos((k / 48) * 2 * Math.PI), Math.sin((k / 48) * 2 * Math.PI)]);
  for (let a = -0.9; a <= 0.9; a += 0.15) for (let b = -0.9; b <= 0.9; b += 0.15) if (a * a + b * b < 1) samples.push([a, b]);
  const kept = [...centers];
  for (let i = kept.length - 1; i >= 0; i--) {
    const [co, cp] = kept[i];
    const others = kept.filter((_, j) => j !== i);
    const covered = samples.every(([u, v]) => {
      const o = co + u * r * O2_UNIT;
      const p = cp + v * r * P_UNIT;
      return others.some((c) => inside(o, p, c));
    });
    if (covered) kept.splice(i, 1);
  }
  return kept;
}

export function classCoverage(data: HaloData, fuelClass: FuelClass): ClassCoverage {
  const rows = data.tests.filter((t) => t.fuelClass === fuelClass);
  const [, , dRing] = GRADE_RINGS;
  const reach = { o2: dRing * O2_UNIT, p: dRing * P_UNIT };
  const uniq = new Map<string, [number, number]>();
  for (const t of rows) uniq.set(`${n2(t.o2Pct)},${n2(t.pressurePsia)}`, [t.o2Pct, t.pressurePsia]);
  const centers = [...uniq.values()];
  // Only conditions whose outer ring reaches the window can colour it.
  const near = centers.filter(([o, p]) => o > VIEW.o2[0] - reach.o2 && o < VIEW.o2[1] + reach.o2 && p > VIEW.p[0] - reach.p && p < VIEW.p[1] + reach.p);
  // Same-size ellipses only contain one another when their centres coincide, so dedupe centres at path precision.
  const drawn = [...new Map(near.map(([o, p]) => [`${n1(o)},${n1(p)}`, [n1(o), n1(p)] as [number, number]])).values()];
  const ring = (r: number) => prune(drawn, r).map(([o, p]) => ellipse(o, p, r * O2_UNIT, r * P_UNIT)).join("");
  const [bR, cR, dR] = GRADE_RINGS;
  const visible = near.filter(([o, p]) => o >= VIEW.o2[0] && o <= VIEW.o2[1] && p >= VIEW.p[0] && p <= VIEW.p[1]);

  const nx = Math.round((VIEW.o2[1] - VIEW.o2[0]) / GRID.dO2) + 1;
  const ny = Math.round((VIEW.p[1] - VIEW.p[0]) / GRID.dP) + 1;
  const x = (i: number) => VIEW.o2[0] + i * GRID.dO2;
  const y = (j: number) => VIEW.p[0] + j * GRID.dP;
  const grid: Grade[][] = [];
  const count: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (let i = 0; i < nx; i++) {
    const col: Grade[] = [];
    for (let j = 0; j < ny; j++) {
      const g = gradeAt(probe(x(i), y(j)), fuelClass, rows);
      col.push(g);
      count[g]++;
    }
    grid.push(col);
  }
  const total = nx * ny;
  const keys = ["iss", "moon", "rover", "artemis", "suit"] as const;
  // Markers and the label space beside them (labels sit about 2-4 O2 points to the side).
  const avoid = keys.flatMap((k) => {
    const [o, p] = [PRESETS[k].o2Pct, PRESETS[k].pressurePsia];
    return [[o, p], [o + 2, p + 0.6], [o + 4, p + 0.6]] as Array<[number, number]>;
  });
  return {
    fuelClass,
    rings: { d: ring(dR), c: ring(cR), b: ring(bR) },
    dots: [...new Set(visible.map(([o, p]) => `M${n1(o)} ${n1(p)}h0`))].join(""),
    tests: rows.length,
    conditions: centers.length,
    o2Range: rows.length ? [Math.min(...rows.map((t) => t.o2Pct)), Math.max(...rows.map((t) => t.o2Pct))] : null,
    pRange: rows.length ? [n2(Math.min(...rows.map((t) => t.pressurePsia))), n2(Math.max(...rows.map((t) => t.pressurePsia)))] : null,
    inView: visible.length,
    labels: zoneLabels(grid, nx, ny, x, y, avoid, visible),
    presets: keys.map((k) => ({ key: k, name: PRESETS[k].name, grade: gradeAt(PRESETS[k], fuelClass, data.tests) })),
    share: Object.fromEntries(GRADES.map((g) => [g, count[g] / total])) as Record<Grade, number>,
  };
}

export function coverageMap(data: HaloData): ClassCoverage[] {
  return COVERAGE_CLASSES.map((c) => classCoverage(data, c));
}
