import type { ExtinctionData, ExtinctionResult, Habitat } from './types';

const PSI_PER_ATM = 14.696;
const PRESSURE_TOL = 0.005;
const CURVE_MIN = 10;
const CURVE_MAX = 45;
const CURVE_STEP = 0.5;

function logistic(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/** Linear-interpolated percentile (q in 0..1) of an ascending-sorted array. */
function percentile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function bands(ext: ExtinctionData, o2: number, pAtm: number) {
  const lnD0 = Math.log(ext.d0Mm);
  const lnP = Math.log(pAtm);
  const ps = ext.coefs
    .map((c) => logistic(c[0] + c[1] * o2 + c[2] * lnD0 + c[3] * lnP))
    .sort((a, b) => a - b);
  return { p50: percentile(ps, 0.5), lo: percentile(ps, 0.025), hi: percentile(ps, 0.975) };
}

/**
 * Probability that a droplet flame goes out on its own at the habitat's O2.
 * Pressure is clamped to the tested range; the flag says when that happened.
 */
export function extinctionAt(h: Habitat, ext: ExtinctionData): ExtinctionResult {
  const [pMin, pMax] = ext.pRangeAtm;
  const pAtm = h.pressurePsia / PSI_PER_ATM;
  const pAtmUsed = Math.min(pMax, Math.max(pMin, pAtm));
  // 14.7 psia is 1.0003 atm; allow a 0.005 atm rounding tolerance so sea-level air is not flagged.
  const extrapolatedPressure = pAtm < pMin - PRESSURE_TOL || pAtm > pMax + PRESSURE_TOL;
  const extrapolatedO2 = h.o2Pct < ext.o2RangePct[0] || h.o2Pct > ext.o2RangePct[1];

  const curve: ExtinctionResult['curve'] = [];
  const steps = Math.round((CURVE_MAX - CURVE_MIN) / CURVE_STEP);
  for (let i = 0; i <= steps; i++) {
    const o2 = CURVE_MIN + i * CURVE_STEP;
    curve.push({ o2, ...bands(ext, o2, pAtmUsed) });
  }
  const here = bands(ext, h.o2Pct, pAtmUsed);
  return { o2Pct: h.o2Pct, pAtmUsed, ...here, extrapolatedPressure, extrapolatedO2, curve };
}
