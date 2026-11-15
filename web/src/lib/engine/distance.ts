import type { FuelClass, Habitat, Nearest, TestPoint } from './types';

/** Evidence distance: 10 O2 percentage points are treated as equivalent to 3 psia. */
export function scaledDistance(o2a: number, pa: number, o2b: number, pb: number): number {
  return Math.hypot((o2a - o2b) / 10, (pa - pb) / 3);
}

const CLASSES: FuelClass[] = ['solid', 'solid_surrogate', 'droplet', 'gas'];

function dist(h: Habitat, t: TestPoint): number {
  return scaledDistance(h.o2Pct, h.pressurePsia, t.o2Pct, t.pressurePsia);
}

/** Two distances closer than this are the same test condition. */
export const TIE_EPS = 1e-9;

/** Flow mismatch with the habitat; tests without a recorded flow rank last. */
const flowGap = (h: Habitat, t: TestPoint) =>
  typeof t.flowCmS === 'number' ? Math.abs(t.flowCmS - h.flowCmS) : Infinity;

/**
 * Nearest test by O2 and pressure. Ties at the same condition are broken by
 * air flow (the test whose flow is closest to the habitat's wins), then by
 * data order, so the named test is the most comparable one.
 */
function closest(h: Habitat, tests: TestPoint[]): { d: number; test: TestPoint } | null {
  let best: { d: number; test: TestPoint } | null = null;
  for (const t of tests) {
    const d = dist(h, t);
    if (best === null || d < best.d - TIE_EPS || (Math.abs(d - best.d) <= TIE_EPS && flowGap(h, t) < flowGap(h, best.test))) {
      best = { d, test: t };
    }
  }
  return best;
}

/** Nearest eligible test per fuel class. Gaps are test minus habitat. */
export function nearestByClass(h: Habitat, tests: TestPoint[]): Record<FuelClass, Nearest> {
  const out = {} as Record<FuelClass, Nearest>;
  for (const fuelClass of CLASSES) {
    const best = closest(h, tests.filter((t) => t.fuelClass === fuelClass));
    out[fuelClass] = best
      ? {
          fuelClass,
          d: best.d,
          test: best.test,
          o2Gap: best.test.o2Pct - h.o2Pct,
          pGap: best.test.pressurePsia - h.pressurePsia,
          measuredBoth: best.test.o2Src === 'measured' && best.test.pSrc === 'measured',
        }
      : { fuelClass, d: null, test: null, o2Gap: null, pGap: null, measuredBoth: false };
  }
  return out;
}

export function nearestForInvestigation(
  h: Habitat,
  tests: TestPoint[],
  psiId: string,
): { d: number | null; test: TestPoint | null } {
  const best = closest(h, tests.filter((t) => t.psiId === psiId));
  return best ? { d: best.d, test: best.test } : { d: null, test: null };
}
