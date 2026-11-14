import { cache } from 'react';
import { HALO_DATA } from '@/lib/data/load';
import type { Brief, Fact, Source } from '@/lib/engine/types';
import { buildCitations, type Citation } from './citations';
import { allFacts } from './pageFacts';

/** Number of ranked investigations the brief shows. */
export const RANKED_SHOWN = 8;

export interface BriefContext {
  facts: Fact[];
  fact: (id: string) => Fact | undefined;
  cite: (id: string) => number | undefined;
  citeSource: (s: Source) => number | undefined;
  citations: Citation[];
}

/**
 * Derived, per-request view of a brief: every displayable fact and the
 * citation numbering. Cached per brief object so each card can call it with
 * just `{ brief }` and they all agree on the numbers.
 */
export const briefContext = cache((brief: Brief): BriefContext => {
  const facts = allFacts(brief, HALO_DATA);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const datasets: Source[] = brief.ranked
    .slice(0, RANKED_SHOWN)
    .map((r) => ({ psiId: r.inv.psiId, doi: r.inv.datasetDoi }));
  const { list, byFact, bySource } = buildCitations(facts, HALO_DATA, datasets);
  return {
    facts,
    fact: (id) => byId.get(id),
    cite: (id) => byFact.get(id),
    citeSource: bySource,
    citations: list,
  };
});
