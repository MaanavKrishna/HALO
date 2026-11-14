import { nearestForInvestigation, scaledDistance } from './distance';
import type { FuelClass, Habitat, HaloData, Hazard, Investigation, RankedInvestigation, RankWeights } from './types';

export type { RankWeights, RankedInvestigation };

export const DEFAULT_WEIGHTS: RankWeights = { proximity: 0.4, fuel: 0.3, hazard: 0.2, richness: 0.1 };

const TRACKED: Hazard[] = ['spread', 'extinction', 'smoke_detection', 'toxicity'];
const DETECTION_O2 = 21;
const DETECTION_P = 14.7;
const STRONG = 0.5;

const isDetection = (inv: Investigation) => inv.hazards.includes('smoke_detection');

function fuelPart(h: Habitat, inv: Investigation): { value: number; matched: FuelClass | null } {
  if (isDetection(inv)) return { value: h.detectors.length > 0 ? 1 : 0, matched: null };
  let value = 0;
  let matched: FuelClass | null = null;
  for (const c of inv.fuelClasses) {
    let v = 0;
    if ((c === 'solid' || c === 'solid_surrogate') && h.materials.length > 0) v = 1;
    else if (c === 'droplet' && h.liquids) v = 1;
    else if (c === 'gas') v = 0.5;
    if (v > value) { value = v; matched = c; }
  }
  return { value, matched };
}

function richnessRaw(inv: Investigation): number {
  return Math.log10(1 + inv.nRows + 5 * inv.publications.length);
}

/**
 * Rank investigations for a habitat. Score is a transparent weighted sum of four
 * 0..1 parts (proximity, fuel, hazard, richness); ties break by psiId ascending.
 */
export function rankInvestigations(
  h: Habitat,
  data: HaloData,
  w: RankWeights = DEFAULT_WEIGHTS,
): RankedInvestigation[] {
  const maxRaw = Math.max(0, ...data.investigations.map(richnessRaw));
  const out: RankedInvestigation[] = data.investigations.map((inv) => {
    const why: string[] = [];

    let proximity = 0;
    if (isDetection(inv)) {
      const d = scaledDistance(h.o2Pct, h.pressurePsia, DETECTION_O2, DETECTION_P);
      proximity = 1 / (1 + d);
      why.push(`Smoke detection evidence at ${DETECTION_O2}% O2, ${DETECTION_P} psia (ambient air)`);
    } else {
      const { d, test } = nearestForInvestigation(h, data.tests, inv.psiId);
      if (d !== null && test) {
        proximity = 1 / (1 + d);
        if (proximity >= STRONG) {
          const src = test.o2Src === 'measured' && test.pSrc === 'measured' ? 'measured' : 'inferred or assumed conditions';
          why.push(`Tested at ${test.o2Pct}% O2, ${test.pressurePsia} psia (${src})`);
        }
      }
    }

    const fuel = fuelPart(h, inv);
    if (fuel.value >= 1) {
      if (isDetection(inv)) why.push(`Habitat has ${h.detectors.join(' and ')} detector${h.detectors.length > 1 ? 's' : ''}`);
      else if (fuel.matched === 'droplet') why.push('Liquid fuels are present in the habitat');
      else why.push(`Fuel class ${fuel.matched?.replace('_', ' ')} matches habitat materials`);
    }

    const hz = inv.hazards.filter((x) => TRACKED.includes(x));
    const hazard = hz.length / TRACKED.length;
    if (hazard >= STRONG) why.push(`Covers ${hz.map((x) => x.replace('_', ' ')).join(', ')}`);

    const raw = richnessRaw(inv);
    const richness = maxRaw > 0 ? raw / maxRaw : 0;
    if (richness >= 0.8) why.push(`Large evidence base (${inv.nRows} rows, ${inv.publications.length} publications)`);

    if (why.length === 0) {
      why.push(`${inv.acronym}: ${inv.nRows} rows, ${inv.publications.length} publications`);
    }

    const parts: RankWeights = { proximity, fuel: fuel.value, hazard, richness };
    const score = w.proximity * proximity + w.fuel * fuel.value + w.hazard * hazard + w.richness * richness;
    return { inv, score, parts, why };
  });

  return out.sort((a, b) => b.score - a.score || (a.inv.psiId < b.inv.psiId ? -1 : a.inv.psiId > b.inv.psiId ? 1 : 0));
}
