import { scaledDistance } from './distance';
import { PRESETS } from './presets';
import type { FuelClass, NextTestCandidate, TestPoint } from './types';

export const PRESET_PRIORITY = { artemis: 3, moon: 3, rover: 2, iss: 1, suit: 1 } as const;

const GRID_CLASSES: FuelClass[] = ['solid', 'droplet', 'gas'];
const CLASS_WEIGHT: Record<string, number> = { solid: 2, droplet: 1, gas: 1 };
const DIST_CAP = 3;
const MIN_O2_GAP = 3;
const MIN_P_GAP = 1.5;

type PresetKey = keyof typeof PRESET_PRIORITY;
const PRESET_KEYS = Object.keys(PRESET_PRIORITY) as PresetKey[];

function differs(a: NextTestCandidate, b: NextTestCandidate): boolean {
  return (
    a.fuelClass !== b.fuelClass ||
    Math.abs(a.o2Pct - b.o2Pct) >= MIN_O2_GAP ||
    Math.abs(a.pressurePsia - b.pressurePsia) >= MIN_P_GAP
  );
}

/**
 * Rank candidate tests by how much they would close the evidence gap for the
 * habitat presets. Each candidate is scored as if it were a measured test of
 * its own fuel class; distances are capped before differencing.
 */
export function nextTests(tests: TestPoint[], k = 4): NextTestCandidate[] {
  // Nearest existing distance per class per preset, computed once.
  const before = {} as Record<string, Record<PresetKey, number>>;
  for (const fc of GRID_CLASSES) {
    const subset = tests.filter((t) => t.fuelClass === fc);
    const row = {} as Record<PresetKey, number>;
    for (const key of PRESET_KEYS) {
      const h = PRESETS[key];
      let best = Infinity;
      for (const t of subset) best = Math.min(best, scaledDistance(h.o2Pct, h.pressurePsia, t.o2Pct, t.pressurePsia));
      row[key] = Math.min(DIST_CAP, best);
    }
    before[fc] = row;
  }

  const all: NextTestCandidate[] = [];
  for (const fc of GRID_CLASSES) {
    for (let o2 = 25; o2 <= 40; o2 += 1) {
      for (let p = 4; p <= 15; p += 0.5) {
        const gains: NextTestCandidate['gains'] = [];
        let score = 0;
        for (const key of PRESET_KEYS) {
          const h = PRESETS[key];
          const b = before[fc][key];
          const a = Math.min(b, scaledDistance(h.o2Pct, h.pressurePsia, o2, p), DIST_CAP);
          gains.push({ preset: key, before: b, after: a });
          score += CLASS_WEIGHT[fc] * PRESET_PRIORITY[key] * (b - a);
        }
        all.push({ fuelClass: fc, o2Pct: o2, pressurePsia: p, score, gains });
      }
    }
  }
  all.sort((x, y) => y.score - x.score || x.o2Pct - y.o2Pct || x.pressurePsia - y.pressurePsia);

  const picked: NextTestCandidate[] = [];
  for (const c of all) {
    if (picked.length >= k) break;
    if (picked.every((p) => differs(c, p))) picked.push(c);
  }
  return picked;
}
