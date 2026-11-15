import { scaledDistance } from '@/lib/engine/distance';
import { detectionFor, sensorWhatIf } from '@/lib/engine/detection';
import { MATERIALS } from '@/lib/engine/materials';
import { PRESETS } from '@/lib/engine/presets';
import type { DetectionResult, HaloData, LiteratureRow, MaterialId, TestPoint } from '@/lib/engine/types';

/**
 * Material screener: one material, one atmosphere, every piece of evidence.
 * The material list is the union of the solid fuels in the PSI rows, the
 * Saffire literature table and the SAME smoke-detector runs.
 */

export interface MaterialDef {
  id: string;
  label: string;
  /** Plain description shown under the name. */
  blurb: string;
  /** Matches a PSI fuel string or a literature material string. */
  match: RegExp;
  /**
   * Matches PSI fuel strings that name the sample by shape only ("1/4\" clear rod");
   * those rows are attributed to the material by inference and say so.
   */
  inferMatch?: RegExp;
  inferNote?: string;
  /** The brief's material id, when the brief can take this material. */
  briefId: MaterialId | null;
}

export const SCREEN_MATERIALS: MaterialDef[] = [
  {
    id: 'pmma',
    label: 'PMMA (acrylic)',
    blurb: 'Clear and black acrylic rods, films, slabs and spheres.',
    match: /\bpmma\b|acrylic/i,
    inferMatch: /\b(clear|black|blac)\b.*\brod\b|\bspherical section\b|\bmicron (pmma )?film\b|\bmm thick film\b|\b200 micron 2 cm wide\b/i,
    inferNote: 'The BASS-II table names these samples by shape (rod, film, sphere); BASS-II burned acrylic, so HALO counts them as PMMA.',
    briefId: 'pmma',
  },
  {
    id: 'cotton',
    label: 'Cotton and SIBAL fabric',
    blurb: 'SIBAL cotton-fiberglass fabric, cotton jersey, and lampwick cotton in the smoke runs.',
    match: /sibal|cotton/i,
    briefId: 'cotton',
  },
  { id: 'nomex', label: 'Nomex', blurb: 'Aramid fabric used in crew clothing.', match: /nomex/i, briefId: 'nomex' },
  { id: 'silicone', label: 'Silicone', blurb: 'Silicone rubber sheet.', match: /silicone/i, briefId: 'silicone' },
  { id: 'kapton', label: 'Kapton', blurb: 'Polyimide film and wire insulation.', match: /kapton/i, briefId: 'kapton' },
  { id: 'teflon', label: 'Teflon', blurb: 'PTFE wire insulation.', match: /teflon|ptfe/i, briefId: 'teflon' },
  { id: 'pyrell', label: 'Pyrell', blurb: 'Polyurethane foam.', match: /pyrell/i, briefId: 'pyrell' },
  { id: 'wax', label: 'Candle wax', blurb: 'Japan wax candle.', match: /\bwax\b/i, briefId: null },
];

export const DEFAULT_MATERIAL = 'pmma';

export const ATMOSPHERE_PRESETS = (['iss', 'artemis', 'moon', 'suit'] as const).map((k) => ({ key: k, ...PRESETS[k] }));

export interface Atmosphere { name: string; o2Pct: number; pressurePsia: number; presetKey: string | null }

const NUM = /^\s*\d+(\.\d+)?\s*$/;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Reads `m`, `o2` and `p` (or `at=<preset>`). Missing values take the Artemis preset silently; bad ones add a notice. */
export function parseScreenParams(sp: Record<string, string | string[] | undefined>): {
  material: MaterialDef;
  atmosphere: Atmosphere;
  notices: string[];
} {
  const notices: string[] = [];
  const mRaw = first(sp.m)?.trim().toLowerCase();
  let material = SCREEN_MATERIALS.find((m) => m.id === DEFAULT_MATERIAL)!;
  if (mRaw) {
    const found = SCREEN_MATERIALS.find((m) => m.id === mRaw);
    if (found) material = found;
    else notices.push(`Unknown material "${mRaw.slice(0, 24)}"; showing ${material.label}.`);
  }

  const fallback = PRESETS.artemis;
  const at = first(sp.at)?.trim().toLowerCase();
  const preset = ATMOSPHERE_PRESETS.find((p) => p.key === at);
  if (at && !preset) notices.push(`Unknown atmosphere "${at.slice(0, 24)}"; using ${fallback.name}.`);
  let o2 = preset?.o2Pct ?? fallback.o2Pct;
  let p = preset?.pressurePsia ?? fallback.pressurePsia;
  let custom = false;

  const read = (key: 'o2' | 'p', label: string, min: number, max: number, unit: string): number | null => {
    const raw = first(sp[key]);
    if (raw === undefined || raw.trim() === '') return null;
    if (!NUM.test(raw)) {
      notices.push(`${label} "${raw.slice(0, 16)}" is not a number; ignored.`);
      return null;
    }
    const v = Number(raw);
    const c = Math.min(max, Math.max(min, v));
    if (c !== v) notices.push(`${label} ${v}${unit} is outside ${min}–${max}${unit}; using ${c}${unit}.`);
    return c;
  };
  const o2In = read('o2', 'O2', 1, 100, '%');
  const pIn = read('p', 'Pressure', 0.5, 20, ' psia');
  if (o2In !== null) { o2 = o2In; custom = true; }
  if (pIn !== null) { p = pIn; custom = true; }

  const match = ATMOSPHERE_PRESETS.find((x) => x.o2Pct === o2 && x.pressurePsia === p);
  const atmosphere: Atmosphere = match
    ? { name: match.name, o2Pct: o2, pressurePsia: p, presetKey: match.key }
    : { name: custom ? 'Custom atmosphere' : (preset?.name ?? fallback.name), o2Pct: o2, pressurePsia: p, presetKey: null };
  return { material, atmosphere, notices };
}

export function screenHref(materialId: string, a: { o2Pct: number; pressurePsia: number }): string {
  return `/materials?m=${materialId}&o2=${a.o2Pct}&p=${a.pressurePsia}`;
}

/** Optional per-row fields another data pass may add (flow, outcome, geometry); read defensively. */
export type RowExtra = Partial<{ flowCmS: number | null; outcome: string | null; geometry: string | null }>;

export interface PsiEvidence { test: TestPoint & RowExtra; d: number; inferredMaterial: boolean }
export interface LitEvidence { row: LiteratureRow; d: number | null }

export interface Nearest { d: number; o2Gap: number; pGap: number; label: string }

export interface Screen {
  psi: PsiEvidence[];
  literature: LitEvidence[];
  nearestPsi: Nearest | null;
  nearestLit: Nearest | null;
  smoke: { result: DetectionResult; whatIf: ReturnType<typeof sensorWhatIf>; sameClass: string } | null;
  investigations: string[];
}

function matchesPsi(m: MaterialDef, fuel: string): { hit: boolean; inferred: boolean } {
  if (m.match.test(fuel)) return { hit: true, inferred: false };
  if (m.inferMatch?.test(fuel)) return { hit: true, inferred: true };
  return { hit: false, inferred: false };
}

export function screenMaterial(m: MaterialDef, a: Atmosphere, data: HaloData): Screen {
  const psi: PsiEvidence[] = [];
  for (const t of data.tests) {
    if (t.fuelClass !== 'solid') continue;
    const { hit, inferred } = matchesPsi(m, t.fuel);
    if (!hit) continue;
    psi.push({ test: t, d: scaledDistance(a.o2Pct, a.pressurePsia, t.o2Pct, t.pressurePsia), inferredMaterial: inferred });
  }
  psi.sort((x, y) => x.d - y.d || x.test.id.localeCompare(y.test.id));

  const literature: LitEvidence[] = data.literature
    .filter((r) => m.match.test(r.material))
    .map((row) => ({
      row,
      d: row.o2Pct !== null && row.pressurePsia !== null ? scaledDistance(a.o2Pct, a.pressurePsia, row.o2Pct, row.pressurePsia) : null,
    }))
    .sort((x, y) => (x.d ?? Infinity) - (y.d ?? Infinity));

  const np = psi[0];
  const nl = literature.find((l) => l.d !== null);
  const nearestPsi: Nearest | null = np
    ? { d: np.d, o2Gap: np.test.o2Pct - a.o2Pct, pGap: np.test.pressurePsia - a.pressurePsia, label: `${np.test.acronym} · ${np.test.fuel}` }
    : null;
  const nearestLit: Nearest | null =
    nl && nl.d !== null
      ? { d: nl.d, o2Gap: (nl.row.o2Pct as number) - a.o2Pct, pGap: (nl.row.pressurePsia as number) - a.pressurePsia, label: `${nl.row.mission} ${nl.row.sampleId}` }
      : null;

  let smoke: Screen['smoke'] = null;
  if (m.briefId && MATERIALS[m.briefId].sameClass) {
    const [result] = detectionFor([m.briefId], ['scatter'], data.detector);
    smoke = { result, whatIf: sensorWhatIf(m.briefId, data.detector), sameClass: MATERIALS[m.briefId].sameClass as string };
  }

  return {
    psi,
    literature,
    nearestPsi,
    nearestLit,
    smoke,
    investigations: [...new Set(psi.map((e) => e.test.psiId))],
  };
}

/** Rounded condition clusters for the plot. */
export function clusterPsi(psi: PsiEvidence[]): Array<{ o2Pct: number; pressurePsia: number; count: number; hollow: boolean }> {
  const map = new Map<string, { o2Pct: number; pressurePsia: number; count: number; hollow: boolean }>();
  for (const { test: t } of psi) {
    const o2 = Number(t.o2Pct.toFixed(1));
    const p = Number(t.pressurePsia.toFixed(1));
    const k = `${o2}|${p}`;
    const measured = t.o2Src === 'measured' && t.pSrc === 'measured';
    const cur = map.get(k);
    if (cur) {
      cur.count++;
      cur.hollow = cur.hollow || !measured;
    } else map.set(k, { o2Pct: o2, pressurePsia: p, count: 1, hollow: !measured });
  }
  return [...map.values()];
}

/** Which materials have any evidence at all (for the picker's counts). */
export function evidenceCounts(data: HaloData): Record<string, number> {
  const a = { name: '', o2Pct: PRESETS.artemis.o2Pct, pressurePsia: PRESETS.artemis.pressurePsia, presetKey: null };
  return Object.fromEntries(
    SCREEN_MATERIALS.map((m) => {
      const s = screenMaterial(m, a, data);
      return [m.id, s.psi.length + s.literature.length + (s.smoke ? s.smoke.result.scatterRuns : 0)];
    }),
  );
}
