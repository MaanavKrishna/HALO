import type { HaloData, Investigation, TestPoint } from '@/lib/engine/types';
import {
  FUEL_LABEL, HARDWARE_LABEL, HAZARD_LABEL, VARIABLE_KEYS, formatRange, hardwareFamily, plotPoints, psiNumber, variableLabel,
} from '@/lib/explore';

/** Investigation-vs-investigation comparison: URL selection and the attribute matrix. */

export const MIN_IDS = 2;
export const MAX_IDS = 4;
/** BASS-II, Saffire-II, FLEX and ACME BRE: one solid in a glovebox, one solid on a cargo vehicle, droplets, the surrogate burner. */
export const DEFAULT_IDS = ['PSI-25', 'PSI-99', 'PSI-69', 'PSI-20'] as const;

/** "25", "psi-25", " PSI-25 " -> "PSI-25"; anything else -> null. */
export function normalizeId(raw: string): string | null {
  const m = /^\s*(?:psi[-\s]?)?(\d{1,4})\s*$/i.exec(raw);
  return m ? `PSI-${Number(m[1])}` : null;
}

/**
 * Reads `?ids=PSI-25,PSI-99` (also repeated `ids` params, as a GET form sends
 * checkboxes). Unknown ids are dropped with a notice; duplicates are merged;
 * more than four keep the first four; fewer than two fall back to the defaults.
 */
export function parseIds(
  raw: string | string[] | undefined,
  known: readonly string[],
): { ids: string[]; notices: string[]; usedDefault: boolean } {
  const parts = (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).flatMap((v) => v.split(','));
  const notices: string[] = [];
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const p of parts) {
    if (!p.trim()) continue;
    const id = normalizeId(p);
    if (!id || !known.includes(id)) {
      unknown.push(p.trim().slice(0, 16));
      continue;
    }
    if (!ids.includes(id)) ids.push(id);
  }
  if (unknown.length) notices.push(`Unknown investigation${unknown.length > 1 ? 's' : ''} ignored: ${unknown.join(', ')}.`);
  if (ids.length > MAX_IDS) {
    notices.push(`Up to ${MAX_IDS} investigations compare at once; showing the first ${MAX_IDS}.`);
    ids.length = MAX_IDS;
  }
  if (ids.length < MIN_IDS) {
    if (ids.length === 0) {
      if (parts.some((p) => p.trim())) notices.push(`Pick at least ${MIN_IDS} investigations; showing the default set.`);
      return { ids: [...DEFAULT_IDS], notices, usedDefault: true };
    }
    // Keep what was asked for and pad with defaults up to the minimum.
    const pad = DEFAULT_IDS.filter((d) => !ids.includes(d)).slice(0, MIN_IDS - ids.length);
    notices.push(`Pick at least ${MIN_IDS} investigations; added ${pad.join(', ')} to compare against.`);
    return { ids: [...ids, ...pad], notices, usedDefault: false };
  }
  return { ids, notices, usedDefault: false };
}

export function compareHref(ids: readonly string[]): string {
  return `/investigations/compare?ids=${ids.join(',')}`;
}

/** Link target for a picker chip: add the id (if room) or remove it (if at least two remain). Null = not actionable. */
export function toggleHref(ids: readonly string[], id: string): string | null {
  if (ids.includes(id)) {
    const rest = ids.filter((x) => x !== id);
    return rest.length >= MIN_IDS ? compareHref(rest) : null;
  }
  return ids.length < MAX_IDS ? compareHref([...ids, id]) : null;
}

// ---- the matrix ----

/** One cell: plain text, or a set of items (shared items and items unique to this column are told apart). */
export type Cell = { kind: 'text'; text: string; missing?: boolean } | { kind: 'set'; items: string[]; missing?: string };

export interface MatrixRow {
  key: string;
  label: string;
  cells: Cell[];
  /** Every column has the same value (set rows: the same items). */
  same: boolean;
  /** For set rows: items every column has. */
  shared: string[];
  /** Sensors are SI-extracted from the PSI record. */
  si?: boolean;
  /** Ids of the columns whose sensors are hidden because the summary is flagged for review. */
  note?: string;
}

/** Optional per-investigation fields another data pass may add; read defensively. */
type MaybeExtra = Partial<Record<'geometry' | 'sampleGeometry' | 'platform', string | null>>;

function eligibleTests(tests: TestPoint[], psiId: string) {
  return tests.filter((t) => t.psiId === psiId);
}

/** Distinct fuels in an investigation's eligible rows, most-tested first. */
export function fuelsOf(tests: TestPoint[], psiId: string): Array<{ fuel: string; n: number }> {
  const m = new Map<string, number>();
  for (const t of eligibleTests(tests, psiId)) {
    const f = t.fuel.trim();
    if (!f || /see previous row/i.test(f)) continue;
    m.set(f, (m.get(f) ?? 0) + 1);
  }
  return [...m.entries()].map(([fuel, n]) => ({ fuel, n })).sort((a, b) => b.n - a.n || a.fuel.localeCompare(b.fuel));
}

const text = (t: string, missing = false): Cell => ({ kind: 'text', text: t, missing });

function setRow(key: string, label: string, sets: (string[] | null)[], missingText: string, extra: Partial<MatrixRow> = {}): MatrixRow {
  const present = sets.filter((s): s is string[] => s !== null);
  const shared = present.length === sets.length && present.length > 0 ? present[0].filter((x) => present.every((s) => s.includes(x))) : [];
  const norm = (s: string[] | null) => (s === null ? '\u0000' : [...s].sort().join('|'));
  return {
    key,
    label,
    cells: sets.map((s) => (s === null || s.length === 0 ? { kind: 'set', items: [], missing: missingText } : { kind: 'set', items: s })),
    same: sets.every((s) => s !== null && s.length > 0) && sets.every((s) => norm(s) === norm(sets[0])),
    shared,
    ...extra,
  };
}

/** A cell with no tabulated value: two gaps are not a similarity. */
export const isMissing = (c: Cell) => (c.kind === 'text' ? !!c.missing : c.items.length === 0);

function textRow(key: string, label: string, cells: Cell[], extra: Partial<MatrixRow> = {}): MatrixRow {
  const v = (c: Cell) => (c.kind === 'text' ? c.text : c.items.join('|'));
  return { key, label, cells, same: !cells.some(isMissing) && cells.every((c) => v(c) === v(cells[0])), shared: [], ...extra };
}

export function compareMatrix(invs: Investigation[], data: HaloData): MatrixRow[] {
  const fuels = invs.map((i) => fuelsOf(data.tests, i.psiId));
  const sensors = invs.map((i) => {
    const s = data.summaries[i.psiId];
    return s && !s.needsReview && s.sensors.length ? s.sensors : null;
  });
  const eligible = invs.map((i) => eligibleTests(data.tests, i.psiId).length);
  const geometry = invs.map((i) => {
    const x = i as Investigation & MaybeExtra;
    return (x.geometry ?? x.sampleGeometry ?? '').trim();
  });
  const fuelText = (f: Array<{ fuel: string; n: number }>) => {
    if (f.length === 0) return text('Not tabulated in eligible rows', true);
    const head = f.slice(0, 3).map((x) => x.fuel).join('; ');
    return text(f.length > 3 ? `${head}; and ${f.length - 3} more` : head);
  };

  const rows: MatrixRow[] = [
    textRow('hardware', 'Hardware family', invs.map((i) => text(HARDWARE_LABEL[hardwareFamily(i.hardware)]))),
    setRow('fuelClass', 'Fuel class', invs.map((i) => (i.fuelClasses.length ? i.fuelClasses.map((f) => FUEL_LABEL[f]) : null)), 'Not tabulated'),
    textRow('fuel', 'Fuels tested', fuels.map(fuelText)),
  ];
  if (geometry.some(Boolean)) {
    rows.push(textRow('geometry', 'Sample geometry', geometry.map((g) => (g ? text(g) : text('Not tabulated', true)))));
  }
  rows.push(
    textRow('o2', 'O₂ range', invs.map((i) => text(formatRange(i.o2Range, '%'), !i.o2Range))),
    textRow('p', 'Pressure range', invs.map((i) => text(formatRange(i.pRangePsia, 'psia'), !i.pRangePsia))),
    textRow('flow', 'Flow range', invs.map((i) => text(formatRange(i.flowRangeCmS, 'cm/s'), !i.flowRangeCmS))),
    setRow('varied', 'Varied', invs.map((i) => (i.varied.length ? i.varied.map(variableLabel) : null)), 'None tabulated'),
    setRow(
      'fixed',
      'Not varied',
      invs.map((i) => (i.varied.length ? VARIABLE_KEYS.filter((k) => !i.varied.includes(k)).map(variableLabel) : null)),
      'Not tabulated',
    ),
    setRow('hazards', 'Hazards studied', invs.map((i) => (i.hazards.length ? i.hazards.map((h) => HAZARD_LABEL[h]) : null)), 'None listed'),
    setRow('sensors', 'Sensors', sensors, 'Not extracted', { si: true }),
    textRow('rows', 'Test rows', invs.map((i, k) => text(`${i.nRows} rows · ${eligible[k]} with a known atmosphere`))),
    textRow('pubs', 'Publications', invs.map((i) => text(`${i.publications.length} listed`))),
    textRow('doi', 'Dataset DOI', invs.map((i) => text(i.datasetDoi))),
  );
  return rows;
}

/** Plain-language similarities and differences, all derived from the matrix. */
export function compareSummary(rows: MatrixRow[]): {
  same: string[];
  differ: string[];
  untabulated: string[];
  sharedItems: Array<{ label: string; items: string[] }>;
} {
  const skip = new Set(['doi', 'rows', 'pubs']);
  const considered = rows.filter((r) => !skip.has(r.key));
  const allMissing = (r: MatrixRow) => r.cells.every(isMissing);
  return {
    same: considered.filter((r) => r.same).map((r) => r.label),
    differ: considered.filter((r) => !r.same && !allMissing(r)).map((r) => r.label),
    untabulated: considered.filter(allMissing).map((r) => r.label),
    sharedItems: considered
      .filter((r) => !r.same && r.shared.length > 0 && r.key !== 'fixed')
      .map((r) => ({ label: r.label, items: r.shared })),
  };
}

export function sortedIds(list: Investigation[]): string[] {
  return [...list].sort((a, b) => psiNumber(a.psiId) - psiNumber(b.psiId)).map((i) => i.psiId);
}

export { plotPoints };
