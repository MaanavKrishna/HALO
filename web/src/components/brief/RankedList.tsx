import { briefContext, RANKED_SHOWN } from "@/lib/brief/context";
import { doiUrl, safeUrl } from "@/lib/brief/citations";
import { HALO_DATA } from "@/lib/data/load";
import { DEFAULT_WEIGHTS } from "@/lib/engine/rank";
import type { Brief } from "@/lib/engine/types";
import { RankedListClient, type RankedItem } from "./RankedListClient";
import { Section } from "./parts";

/** Distinct fuel / sample labels an investigation's eligible test rows record, most frequent first. */
function fuelsFor(psiId: string, max = 3): { shown: string[]; total: number } {
  const counts = new Map<string, number>();
  for (const t of HALO_DATA.tests) if (t.psiId === psiId && t.fuel.trim()) counts.set(t.fuel, (counts.get(t.fuel) ?? 0) + 1);
  const all = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([f]) => f);
  return { shown: all.slice(0, max), total: all.length };
}

/** First sentences of an objective, cut at a word boundary. */
function excerpt(text: string, max = 260): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = cut.lastIndexOf(". ");
  if (stop > max * 0.5) return cut.slice(0, stop + 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function RankedList({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const items: RankedItem[] = brief.ranked.map((r) => {
    const s = HALO_DATA.summaries[r.inv.psiId];
    // SI summaries flagged for review are never shown as SI text.
    const si = s && !s.needsReview && s.summary.trim() ? s.summary.trim() : null;
    return {
      psiId: r.inv.psiId,
      acronym: r.inv.acronym,
      title: r.inv.title,
      parts: r.parts,
      why: r.why,
      text: si ?? excerpt(r.inv.objective),
      textIsSi: si !== null,
      datasetUrl: safeUrl(doiUrl(r.inv.datasetDoi)),
      datasetDoi: r.inv.datasetDoi,
      cite: ctx.citeSource({ psiId: r.inv.psiId, doi: r.inv.datasetDoi }) ?? null,
      papers: r.inv.publications
        .filter((p) => p.doi)
        .slice(0, 3)
        .map((p) => ({ title: p.title, year: p.year, url: safeUrl(doiUrl(p.doi as string)) })),
      paperCount: r.inv.publications.length,
      // Sensors are SI-extracted from the PSI record; a summary flagged for review hides them too.
      sensors: s && !s.needsReview ? s.sensors.filter((x) => x.trim()) : [],
      fuels: fuelsFor(r.inv.psiId).shown,
      fuelTotal: fuelsFor(r.inv.psiId).total,
    };
  });

  return (
    <Section
      id="ranked"
      title="Most relevant investigations"
      kicker="Ranked for this habitat by a transparent weighted score: closeness to your atmosphere, fuel match, hazards covered and size of the evidence base."
    >
      <RankedListClient items={items} shown={RANKED_SHOWN} defaults={DEFAULT_WEIGHTS} />
    </Section>
  );
}
