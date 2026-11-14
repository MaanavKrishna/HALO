import type { FuelClass, Hazard, Investigation, TestPoint } from '@/lib/engine/types';

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

/** "21–40 %" style range; null ranges are not in the tabulated data. */
export function formatRange(range: [number, number] | null, unit: string): string {
  if (!range) return 'not tabulated';
  const [lo, hi] = range;
  return lo === hi ? `${r1(lo)} ${unit}` : `${r1(lo)}–${r1(hi)} ${unit}`;
}

export function filterInvestigations(list: Investigation[], f: Filters): Investigation[] {
  return list.filter(
    (i) => (f.hazard === 'all' || i.hazards.includes(f.hazard)) && (f.fuel === 'all' || i.fuelClasses.includes(f.fuel)),
  );
}

function sortValue(i: Investigation, key: SortKey): string | number | null {
  switch (key) {
    case 'acronym': return i.acronym.toLowerCase();
    case 'hardware': return i.hardware.toLowerCase();
    case 'o2': return i.o2Range ? i.o2Range[0] : null;
    case 'pressure': return i.pRangePsia ? i.pRangePsia[0] : null;
    case 'rows': return i.nRows;
    case 'pubs': return i.publications.length;
  }
}

/** Stable sort. Missing values (null ranges) always sort last, in either direction. */
export function sortInvestigations(list: Investigation[], key: SortKey, dir: SortDir): Investigation[] {
  const sign = dir === 'asc' ? 1 : -1;
  return list
    .map((inv, idx) => ({ inv, idx, v: sortValue(inv, key) }))
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

/** Unique (O2, pressure) points of an investigation's eligible tests. `measured` = both values measured for every test at the point. */
export function plotPoints(tests: TestPoint[], psiId: string): PlotPoint[] {
  const map = new Map<string, PlotPoint>();
  for (const t of tests) {
    if (t.psiId !== psiId) continue;
    const key = `${t.o2Pct}|${t.pressurePsia}`;
    const m = t.o2Src === 'measured' && t.pSrc === 'measured';
    const cur = map.get(key);
    if (cur) {
      cur.count++;
      cur.measured = cur.measured && m;
    } else map.set(key, { o2Pct: t.o2Pct, pressurePsia: t.pressurePsia, count: 1, measured: m });
  }
  return [...map.values()].sort((a, b) => a.o2Pct - b.o2Pct || a.pressurePsia - b.pressurePsia);
}

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
