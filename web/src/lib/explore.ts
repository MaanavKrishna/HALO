import type { ConditionSource, FuelClass, Hazard, Investigation, TestPoint } from '@/lib/engine/types';

/** Helpers for the Explore table: labels, formatting, filtering and sorting. */

export const FUEL_LABEL: Record<FuelClass, string> = {
  solid: 'Solid',
  solid_surrogate: 'Solid surrogate',
  droplet: 'Droplet',
  gas: 'Gas',
};

export const HAZARD_LABEL: Record<Hazard, string> = {
  ignition: 'Ignition',
  spread: 'Flame spread',
  extinction: 'Extinction',
  smoke_detection: 'Smoke detection',
  suppression: 'Suppression',
  toxicity: 'Toxicity',
};

export const FUEL_ORDER: FuelClass[] = ['solid', 'solid_surrogate', 'droplet', 'gas'];
export const HAZARD_ORDER: Hazard[] = ['ignition', 'spread', 'extinction', 'smoke_detection', 'suppression', 'toxicity'];

export type SortKey = 'acronym' | 'hardware' | 'o2' | 'pressure' | 'rows' | 'pubs';
export type SortDir = 'asc' | 'desc';
export interface Filters { hazard: Hazard | 'all'; fuel: FuelClass | 'all' }

const r1 = (x: number) => Number(x.toFixed(1));

export const NO_CONDITIONS = 'No usable O₂/pressure in PSI rows';
export const NO_CONDITIONS_HELP =
  'PSI publishes no oxygen or pressure columns for this investigation (for example a model or a smoke table), so no test conditions can be shown.';

/** "21–40%" style range; a null range means PSI records no test conditions. Pressure keeps a space before its unit. */
export function formatRange(range: [number, number] | null, unit: string): string {
  if (!range) return NO_CONDITIONS;
  const [lo, hi] = range;
  const sep = unit === '%' ? '' : ' ';
  return lo === hi ? `${r1(lo)}${sep}${unit}` : `${r1(lo)}–${r1(hi)}${sep}${unit}`;
}

/** Range of one condition across an investigation's eligible rows, with its weakest provenance. */
export interface ConditionRange { range: [number, number]; src: ConditionSource }
export interface Conditions { n: number; o2: ConditionRange | null; pressure: ConditionRange | null }

const STRENGTH: Record<ConditionSource, number> = { assumed: 0, inferred: 1, measured: 2 };
const weakest = (a: ConditionSource, b: ConditionSource): ConditionSource => (STRENGTH[a] <= STRENGTH[b] ? a : b);

/** Per-investigation O2 and pressure ranges computed from the eligible rows (min-max, weakest provenance). */
export function conditionsByPsi(tests: TestPoint[]): Record<string, Conditions> {
  const out: Record<string, Conditions> = {};
  for (const t of tests) {
    const c = (out[t.psiId] ??= { n: 0, o2: null, pressure: null });
    c.n++;
    const add = (cur: ConditionRange | null, v: number, src: ConditionSource): ConditionRange =>
      cur ? { range: [Math.min(cur.range[0], v), Math.max(cur.range[1], v)], src: weakest(cur.src, src) } : { range: [v, v], src };
    c.o2 = add(c.o2, t.o2Pct, t.o2Src);
    c.pressure = add(c.pressure, t.pressurePsia, t.pSrc);
  }
  return out;
}

export interface ShownCondition {
  range: [number, number] | null;
  /** null for a measured range and when there is no range. 'design' = PSI design matrix (no rows), shown as inferred. */
  src: 'assumed' | 'inferred' | null;
  basis: 'rows' | 'design' | 'none';
}

/** What the Explore list and dossier show for O2 or pressure: the eligible rows' range, else the design matrix, else nothing. */
export function shownCondition(inv: Investigation, cond: Conditions | undefined, which: 'o2' | 'pressure'): ShownCondition {
  const fromRows = cond?.n ? cond[which] : null;
  if (fromRows) return { range: fromRows.range, src: fromRows.src === 'measured' ? null : fromRows.src, basis: 'rows' };
  const design = which === 'o2' ? inv.o2Range : inv.pRangePsia;
  if (design) return { range: design, src: 'inferred', basis: 'design' };
  return { range: null, src: null, basis: 'none' };
}

export function filterInvestigations(list: Investigation[], f: Filters): Investigation[] {
  return list.filter(
    (i) => (f.hazard === 'all' || i.hazards.includes(f.hazard)) && (f.fuel === 'all' || i.fuelClasses.includes(f.fuel)),
  );
}

function sortValue(i: Investigation, key: SortKey, conds: Record<string, Conditions>): string | number | null {
  switch (key) {
    case 'acronym': return i.acronym.toLowerCase();
    case 'hardware': return i.hardware.toLowerCase();
    case 'o2': return shownCondition(i, conds[i.psiId], 'o2').range?.[0] ?? null;
    case 'pressure': return shownCondition(i, conds[i.psiId], 'pressure').range?.[0] ?? null;
    case 'rows': return i.nRows;
    case 'pubs': return i.publications.length;
  }
}

/** Stable sort. Missing values (null ranges) always sort last, in either direction. */
export function sortInvestigations(list: Investigation[], key: SortKey, dir: SortDir, conds: Record<string, Conditions> = {}): Investigation[] {
  const sign = dir === 'asc' ? 1 : -1;
  return list
    .map((inv, idx) => ({ inv, idx, v: sortValue(inv, key, conds) }))
    .sort((a, b) => {
      if (a.v === null && b.v === null) return a.idx - b.idx;
      if (a.v === null) return 1;
      if (b.v === null) return -1;
      const c = a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
      return c !== 0 ? c * sign : a.idx - b.idx;
    })
    .map((x) => x.inv);
}

/** Natural default order: PSI id ascending. */
export function psiNumber(psiId: string): number {
  return Number(psiId.replace('PSI-', ''));
}

export interface PlotPoint { o2Pct: number; pressurePsia: number; count: number; measured: boolean }

/**
 * Distinct (O2, pressure) conditions of an investigation's eligible tests, with
 * both values rounded to 0.1 so near-duplicates (14.696 vs 14.7 psia) merge.
 * `measured` = both values measured for every test at the point.
 */
export function plotPoints(tests: TestPoint[], psiId: string): PlotPoint[] {
  const map = new Map<string, PlotPoint>();
  for (const t of tests) {
    if (t.psiId !== psiId) continue;
    const o2 = r1(t.o2Pct);
    const p = r1(t.pressurePsia);
    const key = `${o2}|${p}`;
    const m = t.o2Src === 'measured' && t.pSrc === 'measured';
    const cur = map.get(key);
    if (cur) {
      cur.count++;
      cur.measured = cur.measured && m;
    } else map.set(key, { o2Pct: o2, pressurePsia: p, count: 1, measured: m });
  }
  return [...map.values()].sort((a, b) => a.o2Pct - b.o2Pct || a.pressurePsia - b.pressurePsia);
}

/** Ranges that exist without per-test rows come from the PSI design matrix, not from logged tests. */
export const fromDesignMatrix = (i: Investigation) => i.nRows === 0 && !!(i.o2Range || i.pRangePsia || i.flowRangeCmS);

const VARIABLES: Record<string, string> = {
  o2: 'Oxygen fraction',
  pressure: 'Pressure',
  flow: 'Flow velocity',
  fuel: 'Fuel',
  diluent: 'Diluent gas',
};
export const VARIABLE_KEYS = Object.keys(VARIABLES);
export const variableLabel = (k: string) => VARIABLES[k] ?? k;

export function doiUrl(doi: string): string | null {
  return /^10\.\d{4,9}\/\S+$/.test(doi) ? `https://doi.org/${encodeURI(doi)}` : null;
}

/** Multi-select hazard filter (any selected hazard matches) plus one fuel class. Empty hazards = all. */
export function filterByHazards(list: Investigation[], hazards: Hazard[], fuel: FuelClass | 'all'): Investigation[] {
  return list.filter(
    (i) => (hazards.length === 0 || hazards.some((h) => i.hazards.includes(h))) && (fuel === 'all' || i.fuelClasses.includes(fuel)),
  );
}

export type HardwareFamily = 'rack' | 'glovebox' | 'vehicle' | 'smoke' | 'lab' | 'none';

export const HARDWARE_LABEL: Record<HardwareFamily, string> = {
  rack: 'Combustion Integrated Rack',
  glovebox: 'Science Glovebox',
  vehicle: 'Cygnus cargo vehicle',
  smoke: 'Smoke diagnostics',
  lab: 'Investigator laboratory',
  none: 'Hardware not tabulated',
};

/** Groups the free-text hardware field into a few families, for the glyph and label. */
export function hardwareFamily(hardware: string): HardwareFamily {
  const h = hardware.toLowerCase();
  if (!h.trim()) return 'none';
  if (/saffire|cygnus/.test(h)) return 'vehicle';
  if (/glovebox|\bmsg\b/.test(h)) return 'glovebox';
  if (/combustion integrated rack|\bcir\b|acme|mdca/.test(h)) return 'rack';
  if (/soot|p-trak/.test(h)) return 'smoke';
  if (/laboratory/.test(h)) return 'lab';
  return 'none';
}

/** Neighbours in PSI-id order, for prev/next navigation. */
export function neighbours(list: Investigation[], psiId: string): { prev: Investigation | null; next: Investigation | null } {
  const sorted = [...list].sort((a, b) => psiNumber(a.psiId) - psiNumber(b.psiId));
  const i = sorted.findIndex((x) => x.psiId === psiId);
  if (i < 0) return { prev: null, next: null };
  return { prev: sorted[i - 1] ?? null, next: sorted[i + 1] ?? null };
}

/** The O2 track the coverage bars draw on (percent of atmosphere). */
export const O2_TRACK: [number, number] = [0, 40];

/** SI-written sensor list of each investigation (summaries.sensors), omitted when the summary needs review. */
export type SensorMap = Record<string, string[]>;

export function sensorMap(summaries: Record<string, { sensors: string[]; needsReview?: boolean }>): SensorMap {
  const out: SensorMap = {};
  for (const [id, s] of Object.entries(summaries)) {
    const list = s.needsReview ? [] : s.sensors.map((x) => x.trim()).filter(Boolean);
    if (list.length) out[id] = list;
  }
  return out;
}

/** Free-text match on sample geometry and sensors ("PMMA", "radiometer"). Case-insensitive; empty query matches all. */
export function matchesSampleOrSensor(inv: Investigation & { geometry?: string }, sensors: SensorMap, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [inv.geometry ?? '', ...(sensors[inv.psiId] ?? [])].join(' \u0000 ').toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}
