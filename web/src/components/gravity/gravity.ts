import { PRESETS } from '@/lib/engine/presets';
import type { HaloData } from '@/lib/engine/types';
import { SCREEN_MATERIALS, screenMaterial } from '@/components/materials/screener';
import { PSI99_CSV } from './psi99Table';

/** Partial-gravity bounding: what exists at each end of the gravity axis, per material. */

export const FACT_SHEET_URL = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/';
/** Surface gravity in m/s², as NASA's Planetary Fact Sheet lists it. */
export const SURFACE_GRAVITY = { earth: 9.8, moon: 1.6, mars: 3.7 } as const;

export const gFraction = (ms2: number) => ms2 / SURFACE_GRAVITY.earth;

export const LEVELS = [
  { key: 'micro', label: 'Microgravity', short: 'µg', g: 0, note: 'ISS, Cygnus, drop towers' },
  { key: 'moon', label: 'Moon', short: 'Moon', g: gFraction(SURFACE_GRAVITY.moon), note: 'Untested in PSI' },
  { key: 'mars', label: 'Mars', short: 'Mars', g: gFraction(SURFACE_GRAVITY.mars), note: 'Untested in PSI' },
  { key: 'earth', label: 'Earth', short: '1 g', g: 1, note: 'Ground tests' },
] as const;

export const CHALLENGE_URL = 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/';
export const LUCI_URL = 'https://ntrs.nasa.gov/citations/20250010653';
export const FM2_URL =
  'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/';

// ---- Saffire-II: microgravity next to 1 g ----

export type BurnClass = 'complete' | 'partial' | 'none' | 'mixed' | 'unknown';
const RANK: Record<'none' | 'partial' | 'complete', number> = { none: 0, partial: 1, complete: 2 };

export interface SaffirePair {
  sample: string;
  material: string;
  thickness: string;
  flowDirection: string;
  o2: string;
  flow: string;
  sampleLength: string;
  microBurn: string;
  microSpread: string;
  oneGBurn: string;
  oneGSpread: string;
  micro: BurnClass;
  oneG: BurnClass;
  /** Which gravity burned further; null when either side is mixed or unknown. */
  further: 'micro' | 'oneG' | 'same' | null;
}

/** Splits one CSV line (the PSI-99 table has no quoted fields, but quotes are honoured anyway). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const lengthCm = (s: string) => {
  const m = /(\d+(?:\.\d+)?)\s*cm/.exec(s);
  return m ? Number(m[1]) : null;
};

/** Burn-length text -> class. "Complete" or the full sample length is complete; "~ 0" is none. */
export function classifyBurn(text: string, sampleLength: string): BurnClass {
  const t = text.trim();
  if (!t || /^n\/?a$/i.test(t)) return 'unknown';
  if (/&/.test(t)) return 'mixed';
  if (/complete/i.test(t)) return 'complete';
  if (/^~?\s*0(\s|$|\()/.test(t)) return 'none';
  const v = lengthCm(t);
  const full = lengthCm(sampleLength);
  if (v !== null) return full !== null && v >= full ? 'complete' : 'partial';
  return 'unknown';
}

export function parseSaffireII(csv: string = PSI99_CSV): SaffirePair[] {
  const lines = csv.split(/\r?\n/);
  const out: SaffirePair[] = [];
  let lastMaterial = '';
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line);
    if (!/^\d+-\d+$/.test(c[0] ?? '')) continue;
    const material = c[1] || lastMaterial;
    lastMaterial = material;
    const micro = classifyBurn(c[11] ?? '', c[3] ?? '');
    const oneG = classifyBurn(c[13] ?? '', c[3] ?? '');
    let further: SaffirePair['further'] = null;
    if (micro in RANK && oneG in RANK) {
      const a = RANK[micro as keyof typeof RANK];
      const b = RANK[oneG as keyof typeof RANK];
      further = a === b ? 'same' : a > b ? 'micro' : 'oneG';
    }
    out.push({
      sample: c[0],
      material,
      thickness: c[2] ?? '',
      sampleLength: c[3] ?? '',
      flow: c[5] ?? '',
      o2: c[6] ?? '',
      flowDirection: c[10] ?? '',
      microBurn: c[11] ?? '',
      microSpread: c[12] ?? '',
      oneGBurn: c[13] ?? '',
      oneGSpread: c[14] ?? '',
      micro,
      oneG,
      further,
    });
  }
  return out;
}

export function pairTally(pairs: SaffirePair[]) {
  const comparable = pairs.filter((p) => p.further !== null);
  return {
    total: pairs.length,
    comparable: comparable.length,
    oneGFurther: comparable.filter((p) => p.further === 'oneG').length,
    same: comparable.filter((p) => p.further === 'same').length,
    microFurther: comparable.filter((p) => p.further === 'micro').length,
    oneGComplete: pairs.filter((p) => p.oneG === 'complete').length,
    microComplete: pairs.filter((p) => p.micro === 'complete').length,
  };
}

// ---- per-material bounds ----

export interface MaterialBound {
  id: string;
  label: string;
  psiRows: number;
  psiO2: [number, number] | null;
  litPoints: number;
  litO2: [number, number] | null;
  oneG: SaffirePair[];
  /** NTRS reports LUCI burned this material in simulated lunar gravity (results outside PSI). */
  luci: boolean;
  /** NASA lists this material among FM2's planned samples on the Moon. */
  fm2: boolean;
}

/** LUCI burned a cotton-fiberglass fabric and an acrylic rod; FM2 plans SIBAL fabric and acrylic rods (NTRS 20250010653; Glenn FM2 page). */
const LUNAR_VEHICLE_MATERIALS = new Set(['cotton', 'pmma']);

const range = (xs: number[]): [number, number] | null => (xs.length ? [Math.min(...xs), Math.max(...xs)] : null);

export function materialBounds(data: HaloData, pairs: SaffirePair[] = parseSaffireII()): MaterialBound[] {
  const at = { name: '', o2Pct: PRESETS.iss.o2Pct, pressurePsia: PRESETS.iss.pressurePsia, presetKey: null };
  return SCREEN_MATERIALS.flatMap((m) => {
    const s = screenMaterial(m, at, data);
    const oneG = pairs.filter((p) => m.match.test(p.material));
    if (s.psi.length === 0 && s.literature.length === 0 && oneG.length === 0) return [];
    const lit = s.literature.map((l) => l.row.o2Pct).filter((v): v is number => v !== null);
    return [
      {
        id: m.id,
        label: m.label,
        psiRows: s.psi.length,
        psiO2: range(s.psi.map((e) => e.test.o2Pct)),
        litPoints: s.literature.length,
        litO2: range(lit),
        oneG,
        luci: LUNAR_VEHICLE_MATERIALS.has(m.id),
        fm2: LUNAR_VEHICLE_MATERIALS.has(m.id),
      },
    ];
  });
}

export const BURN_LABEL: Record<BurnClass, string> = {
  complete: 'Burned fully',
  partial: 'Burned partly',
  none: 'No sustained burn',
  mixed: 'Mixed',
  unknown: 'Not reported',
};
