import { briefContext, RANKED_SHOWN } from "@/lib/brief/context";
import { listWords, lowRankedSmokeEvidence, rankedFuels } from "@/lib/brief/notes";
import { doiUrl, safeUrl } from "@/lib/brief/citations";
import { HALO_DATA } from "@/lib/data/load";
import { DEFAULT_WEIGHTS } from "@/lib/engine/rank";
import type { Brief } from "@/lib/engine/types";
import { RankedListClient, type RankedItem } from "./RankedListClient";
import { Section } from "./parts";

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
    const fuels = rankedFuels(HALO_DATA.tests, r.inv.psiId);
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
      fuels: fuels.shown,
      fuelTotal: fuels.total,
    };
  });

  const smoke = lowRankedSmokeEvidence(brief.ranked.slice(0, RANKED_SHOWN));

  return (
    <Section
      id="ranked"
      title="Most relevant investigations"
      kicker="Ranked for this habitat by a transparent weighted score: closeness to your atmosphere, fuel match, hazards covered and size of the evidence base."
    >
      <p className="mb-5 max-w-[68ch] text-pretty text-[0.9375rem] leading-relaxed text-fg-2" data-ranking-note>
        Ranked mainly by how close each test&rsquo;s atmosphere is to yours
        {smoke.length > 1 ? (
          <>; {listWords(smoke)} rank low because they only ran in ISS air, even though they hold the flight smoke-detector data.</>
        ) : smoke.length === 1 ? (
          <>; {smoke[0]} ranks low because it only ran in ISS air, even though it holds the flight smoke-detector data.</>
        ) : (
          "."
        )}
      </p>
      <RankedListClient items={items} shown={RANKED_SHOWN} defaults={DEFAULT_WEIGHTS} />
    </Section>
  );
}
