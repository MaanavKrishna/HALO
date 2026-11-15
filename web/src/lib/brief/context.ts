import { cache } from 'react';
import { HALO_DATA } from '@/lib/data/load';
import type { Brief, Fact, Source } from '@/lib/engine/types';
import { numberSources, type CiteEntry, type Citation } from './citations';
import { allFacts, archiveId, CLASS_ORDER, gainId, nearId, nextId, whatIfId } from './pageFacts';
import { flowId, nearFlowId } from '@/lib/engine/flow';

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
 * Fact ids and sources in the order the page first shows them, so citation
 * numbers rise down the page. Facts not listed (only in the fact table and
 * the download) are numbered after these.
 */
export function appearanceOrder(brief: Brief, datasets: Source[]): Array<string | Source> {
  const h = brief.habitat;
  const out: Array<string | Source> = [];
  for (const f of brief.flags) out.push(...f.factIds);
  for (const c of CLASS_ORDER) out.push(nearId(c, 'distance'), nearId(c, 'oxygen'), nearId(c, 'pressure'), nearId(c, 'gap'), flowId(c, 'min'), flowId(c, 'max'), nearFlowId(c, 'flow'));
  out.push('flow-guide-minimum', 'flow-guide-upstream', 'lit-flow-low-spread', 'lit-flow-low', 'lit-flow-high-spread', 'lit-flow-high', nearFlowId('solid', 'flow-high'));
  out.push('bass-test-one', ...datasets);
  for (const m of h.materials) for (const combo of [['scatter'], ['scatter', 'ionization']]) out.push(whatIfId(m, combo, 'runs'), whatIfId(m, combo, 'caught'));
  out.push('det-ambient-oxygen', 'det-ambient-pressure', 'det-scatter-threshold', 'det-ionization-threshold');
  out.push('ext-probability', 'ext-probability-lo', 'ext-probability-hi', 'ext-droplet-size', 'ext-pressure-used', 'ext-pressure-min', 'ext-pressure-max');
  out.push(...brief.aftermath.map((f) => f.id));
  if (brief.coolFlame) out.push(brief.coolFlame.id);
  brief.nextTests.forEach((t, i) => {
    out.push(nextId(i, 'oxygen'), nextId(i, 'pressure'));
    if (i === 0) out.push('next-first-literature-distance');
    for (const g of t.gains) out.push(gainId(i, g.preset, 'before'), gainId(i, g.preset, 'after'));
    if (i === 0) {
      for (const g of brief.archiveGains) out.push(archiveId(g.preset, 'before'), archiveId(g.preset, 'after'));
      out.push('next-archived-oxygen', 'next-archived-pressure', 'vehicle-luci', 'vehicle-fm');
    }
  });
  out.push(...brief.earth.map((f) => f.id));
  return out;
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
  const entries: CiteEntry[] = [];
  for (const x of appearanceOrder(brief, datasets)) {
    if (typeof x === 'string') {
      const f = byId.get(x);
      if (f) entries.push({ id: f.id, source: f.source });
    } else entries.push({ id: null, source: x });
  }
  for (const f of facts) entries.push({ id: f.id, source: f.source });
  const { list, byFact, bySource } = numberSources(entries, HALO_DATA);
  return {
    facts,
    fact: (id) => byId.get(id),
    cite: (id) => byFact.get(id),
    citeSource: bySource,
    citations: list,
  };
});
