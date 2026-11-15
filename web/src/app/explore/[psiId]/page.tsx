import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink, Chip, Icon, PageHero, Panel, ProvenanceBadge, SiChip, Stat, StatGroup, buttonClass, cx } from "@/components/ui";
import { AtmospherePlot } from "@/components/explore/AtmospherePlot";
import { FuelMark, HardwareGlyph, MissionPatch } from "@/components/explore/Glyphs";
import { downloadHref, investigationCsvRows, testsCsvFile } from "@/components/content/downloads";
import { HALO_DATA } from "@/lib/data/load";
import { investigationRows } from "@/lib/data/schema";
import type { Investigation } from "@/lib/engine/types";
import {
  FUEL_LABEL, HARDWARE_LABEL, HAZARD_LABEL, VARIABLE_KEYS, conditionsByPsi, doiUrl, shownCondition, NO_CONDITIONS, NO_CONDITIONS_HELP, type ShownCondition, hardwareFamily, neighbours, plotPoints, sensorMap, variableLabel,
} from "@/lib/explore";

const PSI_URL = "https://psi.nasa.gov/physci/repo/";

export function generateStaticParams() {
  return HALO_DATA.investigations.map((i) => ({ psiId: i.psiId }));
}

function find(psiId: string) {
  return investigationRows(HALO_DATA).find((i) => i.psiId === psiId);
}

export async function generateMetadata({ params }: PageProps<"/explore/[psiId]">): Promise<Metadata> {
  const { psiId } = await params;
  const inv = find(psiId);
  return {
    title: inv ? `${inv.acronym} (${inv.psiId})` : "Not found",
    alternates: inv ? { canonical: `/explore/${inv.psiId}` } : undefined,
    description: inv ? `${inv.title}. Tested atmospheres, hardware and publications from NASA PSI.` : undefined,
  };
}

function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx("text-accent decoration-accent-line underline underline-offset-4 hover:decoration-current", className)}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-line pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="type-title text-fg">
          {title}
        </h2>
        {aside && <span className="type-label text-fg-3">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Range as a Stat value: "12–34" with the unit in the unit slot, plus its provenance tag when not measured. */
function RangeStat({ label, shown, unit, empty = NO_CONDITIONS }: { label: string; shown: ShownCondition; unit: string; empty?: string }) {
  const r1 = (x: number) => Number(x.toFixed(1));
  if (!shown.range) {
    return <Stat label={label} value={<span title={NO_CONDITIONS_HELP} className="text-lg tracking-normal text-fg-3">{empty}</span>} />;
  }
  const [lo, hi] = shown.range;
  return (
    <Stat
      label={label}
      value={lo === hi ? `${r1(lo)}` : `${r1(lo)}–${r1(hi)}`}
      unit={unit}
      provenance={shown.src ? <ProvenanceBadge provenance={shown.src} /> : undefined}
    />
  );
}

const PUB_FIRST = 10;

function PubList({ pubs, start }: { pubs: Investigation["publications"]; start: number }) {
  return (
    <ol className="flex flex-col" start={start + 1}>
      {pubs.map((p, i) => {
        const idx = start + i;
        const url = p.doi ? doiUrl(p.doi) : null;
        return (
          <li key={`${p.doi ?? p.title}-${idx}`} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-line py-3.5">
            <span aria-hidden="true" className="pt-0.5 font-mono text-xs text-fg-3">{String(idx + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] leading-snug text-fg">{p.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {p.year !== null && <span className="font-mono text-fg-2">{p.year}</span>}
                {url && p.doi ? (
                  <ExternalLink href={url} className="break-all font-mono">
                    {p.doi}
                  </ExternalLink>
                ) : (
                  <span className="text-fg-3">no DOI listed</span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function NeighbourLink({ inv, dir }: { inv: Investigation; dir: "prev" | "next" }) {
  return (
    <Link
      href={`/explore/${inv.psiId}`}
      rel={dir}
      prefetch={false}
      className={cx(
        "group flex min-w-0 flex-1 flex-col gap-1.5 rounded-[var(--radius-lg)] border border-line bg-surface-1 px-5 py-4 shadow-[var(--inner-highlight),var(--elev-1)] transition-[border-color,box-shadow,translate] duration-[var(--dur-base)] ease-out hover:-translate-y-0.5 hover:border-accent-line hover:shadow-[var(--inner-highlight),var(--glow-1)] active:translate-y-0",
        dir === "next" && "items-end text-right",
      )}
    >
      <span className="type-label flex items-center gap-1.5 text-fg-3">
        {dir === "prev" && <Icon name="arrowRight" size={14} className="rotate-180" />}
        {dir === "prev" ? "Previous" : "Next"} · {inv.psiId}
        {dir === "next" && <Icon name="arrowRight" size={14} />}
      </span>
      <span className="type-title truncate text-fg group-hover:text-accent">{inv.acronym}</span>
    </Link>
  );
}

export default async function InvestigationPage({ params }: PageProps<"/explore/[psiId]">) {
  const { psiId } = await params;
  const inv = find(psiId);
  if (!inv) notFound();

  const summary = HALO_DATA.summaries[inv.psiId];
  const si = summary && !summary.needsReview && summary.summary.trim() ? summary : null;
  const points = plotPoints(HALO_DATA.tests, inv.psiId);
  const cond = conditionsByPsi(HALO_DATA.tests)[inv.psiId];
  const o2Shown = shownCondition(inv, cond, "o2");
  const pShown = shownCondition(inv, cond, "pressure");
  const eligible = points.reduce((s, p) => s + p.count, 0);
  const notVaried = VARIABLE_KEYS.filter((k) => !inv.varied.includes(k));
  const dataset = doiUrl(inv.datasetDoi);
  const fam = hardwareFamily(inv.hardware);
  const { prev, next } = neighbours(HALO_DATA.investigations, inv.psiId);
  const dates = [inv.startDate, inv.endDate].filter(Boolean).join(" to ");
  const sensors = sensorMap(HALO_DATA.summaries)[inv.psiId] ?? [];
  const csvRows = investigationCsvRows(inv.psiId);
  const csvFile = testsCsvFile(inv.psiId);

  return (
    <main>
      <PageHero
        titleId="dossier-title"
        visual="rings"
        eyebrow={
          <>
            <span className="font-mono">{inv.psiId}</span>
            <span aria-hidden="true">·</span>
            {HARDWARE_LABEL[fam]}
          </>
        }
        title={inv.acronym}
        lede={inv.title}
        actions={
          <ButtonLink href="/explore" variant="secondary" size="sm" prefetch={false} icon={<Icon name="arrowRight" size={16} className="rotate-180" />}>
            All investigations
          </ButtonLink>
        }
        meta={
          <div className="flex flex-col gap-4">
            <ul className="flex flex-wrap gap-1.5" aria-label="Fuel classes">
              {inv.fuelClasses.length === 0 ? (
                <li>
                  <Chip>Fuel not tabulated</Chip>
                </li>
              ) : (
                inv.fuelClasses.map((f) => (
                  <li key={f}>
                    <Chip className="text-fg">
                      <FuelMark fuel={f} className="text-accent" />
                      {FUEL_LABEL[f]} fuel
                    </Chip>
                  </li>
                ))
              )}
            </ul>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="type-label text-fg-3">Dataset DOI</span>
              {dataset ? (
                <ExternalLink href={dataset} className="break-all font-mono">
                  {inv.datasetDoi}
                </ExternalLink>
              ) : (
                <span className="break-all font-mono text-fg-2">{inv.datasetDoi}</span>
              )}
            </p>
          </div>
        }
      />

      <div className="container-wide grid gap-x-16 gap-y-12 pb-24 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Spec sheet: first on phones (the numbers), sticky on the right from lg. */}
        <aside aria-label="Spec sheet" className="lg:col-start-2 lg:row-start-1">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
            <Panel label="Spec sheet" meta={inv.psiId} bodyClassName="flex flex-col gap-6 p-5">
              <div className="flex items-center gap-4">
                <MissionPatch family={fam} o2Range={o2Shown.range} code={inv.psiId} size={88} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    <HardwareGlyph family={fam} size={16} className="text-fg-2" />
                    {HARDWARE_LABEL[fam]}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-fg-3">{inv.hardware || "No hardware is listed in the PSI record."}</p>
                </div>
              </div>

              {o2Shown.range || pShown.range || inv.flowRangeCmS ? (
                <StatGroup className="grid-cols-1! sm:grid-cols-1! [&>div]:px-4! [&>div]:py-3.5!">
                  <RangeStat label="O₂ range" shown={o2Shown} unit="%" />
                  <RangeStat label="Pressure range" shown={pShown} unit="psia" />
                  <RangeStat label="Flow range" shown={{ range: inv.flowRangeCmS, src: null, basis: inv.flowRangeCmS ? "rows" : "none" }} unit="cm/s" empty="No flow in PSI" />
                </StatGroup>
              ) : null}
              {(o2Shown.basis === "design" || pShown.basis === "design") && (
                <p className="-mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-3">
                  <ProvenanceBadge provenance="inferred" />
                  <span>Ranges from the PSI design matrix; no per-test rows are published.</span>
                </p>
              )}
              {(o2Shown.src === "assumed" || pShown.src === "assumed") && (
                <p className="-mt-3 text-xs text-fg-3">
                  Assumed: the PSI record does not log this condition; the stated assumption (see the data notes) is used for every eligible row.
                </p>
              )}
              {!(o2Shown.range || pShown.range || inv.flowRangeCmS) && (
                <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-4 py-3.5 text-sm text-fg-2" title={NO_CONDITIONS_HELP}>
                  {NO_CONDITIONS}: the dataset has no oxygen, pressure or flow columns for this investigation (for example a model or a smoke table).
                </p>
              )}

              <dl className="grid grid-cols-3 gap-3">
                {[
                  ["Rows", inv.nRows],
                  ["Eligible", eligible],
                  ["Papers", inv.publications.length],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1">
                    <dt className="type-label text-fg-3">{k}</dt>
                    <dd className="font-mono text-lg text-fg">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col gap-2">
                <p className="type-label text-fg-3">Sample geometry</p>
                <p className="text-sm leading-snug text-fg">{inv.geometry ?? "Not tabulated in the PSI record."}</p>
              </div>

              <div className="flex flex-col gap-2.5">
                <p className="type-label flex items-center gap-2 text-fg-3">
                  Sensors <SiChip />
                </p>
                {sensors.length ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label="Sensors listed in the summary">
                    {sensors.map((x) => (
                      <li key={x}>
                        <Chip>{x}</Chip>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-fg-3">No sensors are listed in the summary.</p>
                )}
                <p className="text-xs text-fg-3">Read from the PSI record by the summary step; check the record for the full instrument list.</p>
              </div>

              <div className="flex flex-col gap-2.5">
                <p className="type-label text-fg-3">Hazards studied</p>
                {inv.hazards.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {inv.hazards.map((h) => (
                      <li key={h}>
                        <Chip>{HAZARD_LABEL[h]}</Chip>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-fg-3">None listed.</p>
                )}
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-t border-line pt-5 text-sm">
                {inv.acronymSource === "halo" && (
                  <>
                    <dt className="text-fg-3">Label</dt>
                    <dd className="text-fg">
                      HALO label
                      <span className="block text-xs text-fg-3">The PSI record leaves the acronym blank; HALO names it for display.</span>
                    </dd>
                  </>
                )}
                <dt className="text-fg-3">License</dt>
                <dd className="font-mono text-fg">{inv.license}</dd>
                {dates && (
                  <>
                    <dt className="text-fg-3">Dates</dt>
                    <dd className="font-mono text-fg">
                      {dates}
                      {inv.dateNote && <span className="block font-sans text-xs text-fg-3">{inv.dateNote}</span>}
                    </dd>
                  </>
                )}
              </dl>

              {csvRows > 0 && (
                <div className="flex flex-col gap-2">
                  <a href={downloadHref(csvFile)} download={csvFile} className={buttonClass("secondary", "md", "w-full")}>
                    <Icon name="arrowRight" size={16} className="rotate-90" />
                    Download {csvRows} rows (CSV)
                  </a>
                  <p className="text-xs text-fg-3">
                    This investigation&apos;s eligible rows from <span className="font-mono">tests.csv</span>: fuel, geometry, O₂, pressure, flow, outcome and provenance.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <a href={PSI_URL} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md", "w-full")}>
                  Open in PSI
                  <Icon name="external" size={16} />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <p className="text-xs text-fg-3">
                  NASA Physical Sciences Informatics repository. Search for <span className="font-mono">{inv.psiId}</span>.
                </p>
              </div>
            </Panel>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-12 lg:col-start-1 lg:row-start-1">
          {si && (
            <Section id="summary" title="Summary">
              <p className="type-body-l max-w-[62ch] text-fg">
                {si.summary} <SiChip />
              </p>
              {si.habitatRelevance.trim() && (
                <div className="max-w-[62ch] rounded-[var(--radius-md)] border border-accent-line bg-accent-soft px-5 py-4">
                  <p className="type-label text-accent">Habitat relevance</p>
                  <p className="mt-2 text-fg-2">
                    {si.habitatRelevance} <SiChip />
                  </p>
                </div>
              )}
            </Section>
          )}

          <Section id="objective" title="Objective">
            {inv.objective.trim() ? (
              <p className={cx("max-w-[66ch] whitespace-pre-line", si ? "text-fg-2" : "type-body-l text-fg")}>{inv.objective}</p>
            ) : (
              <p className="text-fg-3">No objective is recorded for this investigation.</p>
            )}
          </Section>

          {inv.researchImpacts.trim() && (
            <Section id="impact" title="Research impact">
              <p className="max-w-[66ch] whitespace-pre-line text-fg-2">{inv.researchImpacts}</p>
            </Section>
          )}

          <Section id="variables" title="Varied and fixed">
            {inv.varied.length === 0 ? (
              <p className="text-fg-3">No varied variables are tabulated for this investigation.</p>
            ) : (
              <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2.5">
                  <dt className="type-label text-fg-3">Varied</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {inv.varied.map((v) => (
                      <Chip key={v} tone="accent">
                        {variableLabel(v)}
                      </Chip>
                    ))}
                  </dd>
                </div>
                <div className="flex flex-col gap-2.5">
                  <dt className="type-label text-fg-3">Not varied in the tabulated rows</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {notVaried.length === 0 ? (
                      <span className="text-sm text-fg-3">none</span>
                    ) : (
                      notVaried.map((v) => <Chip key={v}>{variableLabel(v)}</Chip>)
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </Section>

          <Section id="plot" title="Tested atmospheres" aside={`${eligible} eligible tests · ${points.length} distinct conditions (rounded to 0.1)`}>
            <div className="rounded-[var(--radius-lg)] border border-line bg-surface-1 p-4 shadow-[var(--inner-highlight),var(--elev-1)] sm:p-6">
              <AtmospherePlot points={points} label={`${inv.acronym} tested atmospheres`} />
            </div>
          </Section>

          <Section id="publications" title="Publications" aside={`${inv.publications.length} listed`}>
            {inv.publications.length === 0 ? (
              <p className="text-fg-3">No publications are listed for this investigation.</p>
            ) : (
              <>
                <PubList pubs={inv.publications.slice(0, PUB_FIRST)} start={0} />
                {inv.publications.length > PUB_FIRST && (
                  <details className="group">
                    <summary className={buttonClass("secondary", "sm", "mt-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
                      <span className="group-open:hidden">Show all {inv.publications.length} publications</span>
                      <span className="hidden group-open:inline">Show fewer</span>
                    </summary>
                    <PubList pubs={inv.publications.slice(PUB_FIRST)} start={PUB_FIRST} />
                  </details>
                )}
              </>
            )}
          </Section>

          {(prev || next) && (
            <nav aria-label="Other investigations" className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row">
              {prev ? <NeighbourLink inv={prev} dir="prev" /> : <span className="hidden flex-1 sm:block" />}
              {next ? <NeighbourLink inv={next} dir="next" /> : <span className="hidden flex-1 sm:block" />}
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}
