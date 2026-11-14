import type { Fact, HaloData, Source } from '@/lib/engine/types';

export interface Citation {
  n: number;
  key: string;
  title: string;
  detail: string | null;
  psiId: string | null;
  doi: string | null;
  url: string | null;
  factIds: string[];
}

const doiUrl = (doi: string) => `https://doi.org/${doi}`;

/** Only plain https links are rendered; anything else is shown as text. */
export function safeUrl(u: string | undefined | null): string | null {
  if (!u) return null;
  try {
    const p = new URL(u);
    return p.protocol === 'https:' ? p.toString() : null;
  } catch {
    return null;
  }
}

function sourceKey(s: Source): string {
  return s.doi ? `doi:${s.doi}` : s.url ? `url:${s.url}` : s.psiId ? `psi:${s.psiId}` : `note:${s.note ?? ''}`;
}

function describe(s: Source, data: HaloData): { title: string; detail: string | null } {
  const inv = s.psiId ? data.investigations.find((i) => i.psiId === s.psiId) : undefined;
  if (inv) return { title: `${inv.acronym}: ${inv.title}`, detail: `NASA Physical Sciences Informatics ${inv.psiId}, dataset` };
  if (s.note && s.url) return { title: s.note, detail: null };
  if (s.doi) return { title: s.note ?? 'Published paper', detail: null };
  return { title: s.note ?? 'Source', detail: null };
}

/**
 * Number every distinct source in first-use order. A fact's citation number is
 * looked up by its source key, so facts that share a source share a number.
 */
export type CiteEntry = { id: string | null; source: Source };

export function buildCitations(
  facts: Fact[],
  data: HaloData,
  extra: Source[] = [],
): { list: Citation[]; byFact: Map<string, number>; bySource: (s: Source) => number | undefined } {
  return numberSources(
    [...facts.map((f) => ({ id: f.id, source: f.source })), ...extra.map((source) => ({ id: null, source }))],
    data,
  );
}

/** Number sources in the order the entries are given (a fact id may appear once). */
export function numberSources(
  entries: CiteEntry[],
  data: HaloData,
): { list: Citation[]; byFact: Map<string, number>; bySource: (s: Source) => number | undefined } {
  const list: Citation[] = [];
  const byKey = new Map<string, Citation>();
  const byFact = new Map<string, number>();
  for (const f of entries) {
    const key = sourceKey(f.source);
    let c = byKey.get(key);
    if (!c) {
      const { title, detail } = describe(f.source, data);
      // Long notes (row dumps) are kept in the downloaded data, not the citation title.
      const shortTitle = title.length > 140 ? `${title.slice(0, 137)}…` : title;
      c = {
        n: list.length + 1,
        key,
        title: shortTitle,
        detail,
        psiId: f.source.psiId ?? null,
        doi: f.source.doi ?? null,
        url: safeUrl(f.source.doi ? doiUrl(f.source.doi) : f.source.url),
        factIds: [],
      };
      byKey.set(key, c);
      list.push(c);
    }
    if (f.id && !byFact.has(f.id)) {
      c.factIds.push(f.id);
      byFact.set(f.id, c.n);
    }
  }
  return { list, byFact, bySource: (s: Source) => byKey.get(sourceKey(s))?.n };
}

export { doiUrl };
