import { Suspense } from "react";
import { ButtonLink, Callout, Icon, PageHero, Panel } from "@/components/ui";
import { CompareMatrix } from "@/components/views/CompareMatrix";
import { EvidencePlot, SERIES_STYLES, SeriesSwatch, type PlotSeries } from "@/components/views/EvidencePlot";
import { LinkChips } from "@/components/views/LinkChips";
import { StreamFallback } from "@/components/views/StreamFallback";
import {
  MAX_IDS, MIN_IDS, compareMatrix, compareSummary, parseIds, plotPoints, sortedIds, toggleHref,
} from "@/components/views/compareInvestigations";
import { HALO_DATA } from "@/lib/data/load";
import { PRESETS } from "@/lib/engine/presets";
import type { Investigation } from "@/lib/engine/types";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Compare investigations",
  description:
    "Two to four NASA PSI combustion investigations side by side: hardware, fuels, oxygen, pressure and flow ranges, what varied, hazards, sensors and the atmospheres each one tested.",
  path: "/investigations/compare",
});

function joinNames(names: string[]): string {
  return names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

const r1 = (x: number) => Number(x.toFixed(1));

async function Comparison({ searchParams }: { searchParams: PageProps<"/investigations/compare">["searchParams"] }) {
  const sp = await searchParams;
  const byId = new Map(HALO_DATA.investigations.map((i) => [i.psiId, i]));
  const all = sortedIds(HALO_DATA.investigations);
  const { ids, notices } = parseIds(sp.ids, all);
  const invs = ids.map((id) => byId.get(id)).filter((i): i is Investigation => !!i);
  const rows = compareMatrix(invs, HALO_DATA);
  const summary = compareSummary(rows);

  const series: PlotSeries[] = invs.map((inv, i) => ({
    key: inv.psiId,
    label: inv.acronym,
    ...SERIES_STYLES[i],
    points: plotPoints(HALO_DATA.tests, inv.psiId).map((p) => ({ o2Pct: p.o2Pct, pressurePsia: p.pressurePsia, count: p.count })),
  }));
  const plotted = series.filter((s) => s.points.length > 0);
  const unplotted = series.filter((s) => s.points.length === 0);
  const refs = [PRESETS.iss, PRESETS.artemis].map((h) => ({ label: h.name, o2Pct: h.o2Pct, pressurePsia: h.pressurePsia }));

  const chips = all.map((id) => {
    const inv = byId.get(id)!;
    const selected = ids.includes(id);
    const href = toggleHref(ids, id);
    return {
      key: id,
      label: inv.acronym,
      detail: id,
      selected,
      href,
      ariaLabel: selected
        ? href
          ? `Remove ${inv.acronym} (${id}) from the comparison`
          : `${inv.acronym} (${id}), selected; at least ${MIN_IDS} are needed`
        : href
          ? `Add ${inv.acronym} (${id}) to the comparison`
          : `${inv.acronym} (${id}); remove one first, up to ${MAX_IDS} compare at once`,
    };
  });

  return (
    <>
      <PageHero
        titleId="compare-inv-title"
        visual="rings"
        eyebrow="Compare investigations"
        title={joinNames(invs.map((i) => i.acronym))}
        lede="Side by side: what each investigation burned, the atmospheres it ran in, what it varied and what it measured. Rows that differ are marked."
        actions={
          <ButtonLink href="/explore" variant="secondary" size="sm" prefetch={false} icon={<Icon name="arrowRight" size={16} className="rotate-180" />}>
            All investigations
          </ButtonLink>
        }
        meta={
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {[
              ["Comparing", `${invs.length} of ${all.length}`],
              ["Attributes that differ", `${summary.differ.length} of ${summary.same.length + summary.differ.length}`],
              ["Eligible tests plotted", String(plotted.reduce((s, x) => s + x.points.reduce((n, p) => n + (p.count ?? 1), 0), 0))],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <dt className="type-label text-fg-3">{k}</dt>
                <dd className="font-mono text-xl tracking-[-0.02em] text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        }
      />

      <div className="container-wide flex flex-col gap-12 pb-24 pt-10 sm:pt-12">
        {notices.length > 0 && (
          <div role="note" aria-label="Notices" className="max-w-[48rem]">
            <Callout tone="info" title="Some of the link could not be read.">
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {notices.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Callout>
          </div>
        )}

        <Panel label="Choose investigations" meta={`${MIN_IDS} to ${MAX_IDS}`} bodyClassName="flex flex-col gap-4 p-5">
          <p className="text-sm text-fg-2">
            Select {MIN_IDS} to {MAX_IDS}. Each chip is a link, so the selection lives in the address and can be shared.
          </p>
          <LinkChips label="Investigations" chips={chips} multi />
        </Panel>

        <section aria-labelledby="similar" className="grid gap-5 md:grid-cols-2">
          <h2 id="similar" className="sr-only">
            Similarities and differences
          </h2>
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface-1 p-5 shadow-[var(--inner-highlight),var(--elev-1)]">
            <p className="type-label text-fg-3">Same in all {invs.length}</p>
            {summary.same.length || summary.sharedItems.length ? (
              <ul className="mt-3 flex flex-col gap-2 text-[0.9375rem] text-fg">
                {summary.same.map((l) => (
                  <li key={l} className="flex gap-2">
                    <span aria-hidden="true" className="mt-[0.6em] h-px w-3 shrink-0 bg-fg-3" />
                    {l}
                  </li>
                ))}
                {summary.sharedItems.map((s) => (
                  <li key={s.label} className="flex gap-2">
                    <span aria-hidden="true" className="mt-[0.6em] h-px w-3 shrink-0 bg-fg-3" />
                    <span>
                      {s.label}: <span className="text-fg-2">{s.items.join(", ")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-fg-2">Nothing: every attribute differs.</p>
            )}
          </div>
          <div className="rounded-[var(--radius-lg)] border border-accent-line bg-surface-1 p-5 shadow-[var(--inner-highlight),var(--elev-1)]">
            <p className="type-label text-accent">Differs</p>
            {summary.differ.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {summary.differ.map((l) => (
                  <li key={l} className="inline-flex min-h-6 items-center gap-1 rounded-[var(--radius-pill)] border border-accent-line bg-accent-soft px-2.5 text-[0.8125rem] font-medium text-accent">
                    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                      <path d="M4 0.5L7.5 4L4 7.5L0.5 4Z" fill="currentColor" />
                    </svg>
                    {l}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-fg-2">No attribute differs.</p>
            )}
            <p className="mt-4 text-xs text-fg-3">Shared items stay grey in the matrix; items only some have are marked with a diamond.</p>
          </div>
        </section>

        <section aria-labelledby="matrix" className="flex flex-col gap-4">
          <h2 id="matrix" className="type-headline text-fg">
            Side by side
          </h2>
          <CompareMatrix invs={invs} rows={rows} />
          <p className="max-w-[70ch] text-xs text-fg-3">
            Ranges and varied variables come from each PSI record&apos;s tabulated rows; &ldquo;not tabulated&rdquo; means the record does not
            list them. Sensors are extracted from the PSI record text by SI and marked so; ones still awaiting review are not shown.
          </p>
        </section>

        <section aria-labelledby="atmos" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="atmos" className="type-headline text-fg">
              Tested atmospheres, overlaid
            </h2>
            <span className="type-label text-fg-3">Eligible tests · rounded to 0.1</span>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface-1 p-4 shadow-[var(--inner-highlight),var(--elev-1)] sm:p-6">
            {plotted.length ? (
              <EvidencePlot
                series={plotted}
                refs={refs}
                label={`Oxygen and pressure of the eligible tests of ${joinNames(plotted.map((s) => s.label))}, with the Moon envelope and the ISS and Artemis Base habitats for reference. A data table follows.`}
                legend={
                  <>
                    {plotted.map((s) => (
                      <span key={s.key} className="inline-flex items-center gap-1.5 text-fg-2">
                        <SeriesSwatch shape={s.shape} tone={s.tone} hollow={s.hollow} />
                        {s.label}
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1.5">
                      <svg width="14" height="12" aria-hidden="true">
                        <path d="M7 1v10M2 6h10" stroke="var(--text-2)" strokeWidth="1.25" strokeLinecap="round" />
                      </svg>
                      Reference habitat
                    </span>
                    <span>Larger marks merge more tests.</span>
                  </>
                }
              />
            ) : (
              <p className="text-sm text-fg-2">None of these investigations has eligible rows with both oxygen and pressure, so there is nothing to plot.</p>
            )}
            {unplotted.length > 0 && (
              <p className="mt-4 border-t border-line pt-4 text-sm text-fg-2">
                Not plotted: {joinNames(unplotted.map((s) => s.label))}. No rows with both oxygen and pressure count toward habitat coverage.
              </p>
            )}
          </div>
          {plotted.length > 0 && (
            <details className="group rounded-[var(--radius-lg)] border border-line bg-surface-1">
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <Icon name="plus" size={16} className="group-open:hidden" />
                  <Icon name="minus" size={16} className="hidden group-open:block" />
                  Show the plotted conditions as a table
                </span>
              </summary>
              <div className="relative max-h-[28rem] overflow-auto border-t border-line">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">Distinct oxygen and pressure conditions per investigation</caption>
                  <thead className="glass-chrome sticky top-0">
                    <tr>
                      <th scope="col" className="type-label px-4 py-3 text-left font-medium text-fg-3">Investigation</th>
                      <th scope="col" className="type-label px-4 py-3 text-right font-medium text-fg-3">O₂ (%)</th>
                      <th scope="col" className="type-label px-4 py-3 text-right font-medium text-fg-3">Pressure (psia)</th>
                      <th scope="col" className="type-label px-4 py-3 text-right font-medium text-fg-3">Tests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plotted.flatMap((s) =>
                      s.points.map((p) => (
                        <tr key={`${s.key}-${p.o2Pct}-${p.pressurePsia}`} className="border-t border-line">
                          <td className="px-4 py-2 text-fg-2">{s.label}</td>
                          <td className="px-4 py-2 text-right font-mono text-fg">{r1(p.o2Pct)}</td>
                          <td className="px-4 py-2 text-right font-mono text-fg">{r1(p.pressurePsia)}</td>
                          <td className="px-4 py-2 text-right font-mono text-fg">{p.count}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </section>

        <nav aria-label="Related tools" className="flex flex-wrap gap-3 border-t border-line pt-8">
          {invs.map((inv) => (
            <ButtonLink key={inv.psiId} href={`/explore/${inv.psiId}`} variant="ghost" size="sm" prefetch={false} iconEnd={<Icon name="arrowRight" size={16} />}>
              {inv.acronym} dossier
            </ButtonLink>
          ))}
          <ButtonLink href="/materials" variant="secondary" size="sm" prefetch={false}>
            Look up a material
          </ButtonLink>
        </nav>
      </div>
    </>
  );
}

export default function CompareInvestigationsPage(props: PageProps<"/investigations/compare">) {
  return (
    <main>
      <Suspense fallback={<StreamFallback label="Loading comparison…" />}>
        <Comparison searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
