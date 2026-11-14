import type { DetectionResult, DetectorData, DetectorId, DetectorRun, MaterialId } from './types';
import { MATERIALS } from './materials';

function runsFor(material: MaterialId, det: DetectorData): DetectorRun[] {
  const cls = MATERIALS[material].sameClass;
  if (!cls) return [];
  const want = cls.toLowerCase();
  return det.runs.filter((r) => r.material.toLowerCase() === want);
}

function channel(run: DetectorRun, id: DetectorId): number | null {
  return id === 'scatter' ? run.scatterV : run.ionizationDV;
}

function threshold(id: DetectorId, det: DetectorData): number {
  return id === 'scatter' ? det.thresholds.scatterV : det.thresholds.ionizationDV;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Runs where every channel in `combo` is non-null, and how many of those any channel catches. */
function caughtCount(runs: DetectorRun[], combo: DetectorId[], det: DetectorData): { caught: number; n: number } {
  if (combo.length === 0) return { caught: 0, n: 0 };
  let caught = 0;
  let n = 0;
  for (const r of runs) {
    const vals = combo.map((id) => channel(r, id));
    if (vals.some((v) => v === null)) continue;
    n++;
    if (combo.some((id, i) => (vals[i] as number) >= threshold(id, det))) caught++;
  }
  return { caught, n };
}

export function detectionFor(materials: MaterialId[], detectors: DetectorId[], det: DetectorData): DetectionResult[] {
  return materials.map((material) => {
    const runs = runsFor(material, det);
    const noSameAnalog = MATERIALS[material].sameClass === null;
    const scatter = runs.map((r) => r.scatterV).filter((v): v is number => v !== null);
    const scatterLow = scatter.filter((v) => v < det.thresholds.scatterV).length;
    const { caught, n } = caughtCount(runs, detectors, det);
    return {
      material,
      scatterRuns: scatter.length,
      scatterLow,
      scatterLowPct: scatter.length ? (scatterLow / scatter.length) * 100 : null,
      cmdUm: median(runs.map((r) => r.cmdUm).filter((v): v is number => v !== null)),
      ionizationMedianDV: median(runs.map((r) => r.ionizationDV).filter((v): v is number => v !== null)),
      caughtPct: n ? (caught / n) * 100 : null,
      caughtRuns: n,
      noSameAnalog,
    };
  });
}

const COMBOS: DetectorId[][] = [['scatter'], ['scatter', 'ionization']];

export function sensorWhatIf(
  material: MaterialId,
  det: DetectorData,
): Array<{ combo: DetectorId[]; caught: number; runs: number; caughtPct: number }> {
  const runs = runsFor(material, det);
  return COMBOS.map((combo) => {
    const { caught, n } = caughtCount(runs, combo, det);
    return { combo, caught, runs: n, caughtPct: n ? (caught / n) * 100 : 0 };
  });
}
