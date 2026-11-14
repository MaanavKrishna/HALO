import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MiniPlot } from "@/components/explore/MiniPlot";
import { SiChip } from "@/components/ui/SiChip";
import { HALO_DATA } from "@/lib/data/load";
import {
  FUEL_LABEL, HAZARD_LABEL, VARIABLE_KEYS, doiUrl, formatRange, plotPoints, variableLabel,
} from "@/lib/explore";

const PSI_URL = "https://psi.nasa.gov/physci/repo/";

export function generateStaticParams() {
  return HALO_DATA.investigations.map((i) => ({ psiId: i.psiId }));
}

function find(psiId: string) {
  return HALO_DATA.investigations.find((i) => i.psiId === psiId);
}

export async function generateMetadata({ params }: PageProps<"/explore/[psiId]">): Promise<Metadata> {
  const { psiId } = await params;
  const inv = find(psiId);
  return { title: inv ? `${inv.acronym} (${inv.psiId}) | HALO` : "Not found | HALO" };
}

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-flame underline underline-offset-2 hover:no-underline">
    {children}
    <span className="sr-only"> (opens in a new tab)</span>
  </a>
);

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-rule pt-6">
      <h2 id={id} className="wide text-lg font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function InvestigationPage({ params }: PageProps<"/explore/[psiId]">) {
  const { psiId } = await params;
  const inv = find(psiId);
  if (!inv) notFound();

  const summary = HALO_DATA.summaries[inv.psiId];
  const si = summary && !summary.needsReview && summary.summary.trim() ? summary : null;
  const points = plotPoints(HALO_DATA.tests, inv.psiId);
  const notVaried = VARIABLE_KEYS.filter((k) => !inv.varied.includes(k));
  const dataset = doiUrl(inv.datasetDoi);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/explore" className="text-flame underline-offset-2 hover:underline">← All investigations</Link>
      </nav>

      <header className="mt-5">
        <p className="num font-mono text-sm text-muted">{inv.psiId}</p>
        <h1 className="wide mt-1 text-[clamp(1.75rem,4vw,2.6rem)] font-extrabold leading-tight">{inv.acronym}</h1>
        <p className="mt-2 max-w-[46rem] text-lg leading-snug text-muted">{inv.title}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {inv.fuelClasses.map((f) => (
            <li key={f} className="rounded-sm border border-rule-strong bg-surface px-2 py-0.5 text-sm">{FUEL_LABEL[f]} fuel</li>
          ))}
          {inv.hazards.map((h) => (
            <li key={h} className="rounded-sm border border-rule bg-flame-soft px-2 py-0.5 text-sm">{HAZARD_LABEL[h]}</li>
          ))}
        </ul>
      </header>

      <div className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
        <div className="flex flex-col gap-8">
          {si && (
            <Section id="summary" title="Summary">
              <p className="max-w-[46rem] leading-relaxed">{si.summary} <SiChip /></p>
              {si.habitatRelevance.trim() && (
                <p className="mt-3 max-w-[46rem] leading-relaxed text-muted">{si.habitatRelevance} <SiChip /></p>
              )}
            </Section>
          )}

          <Section id="objective" title="Objective">
            {inv.objective.trim() ? (
              <p className="max-w-[46rem] whitespace-pre-line leading-relaxed">{inv.objective}</p>
            ) : (
              <p className="text-muted">No objective is recorded for this investigation.</p>
            )}
            {inv.researchImpacts.trim() && (
              <p className="mt-4 max-w-[46rem] leading-relaxed text-muted">
                <span className="font-semibold text-ink">Research impact. </span>
                {inv.researchImpacts}
              </p>
            )}
          </Section>

          <Section id="variables" title="Varied and fixed variables">
            {inv.varied.length === 0 ? (
              <p className="text-muted">No varied variables are tabulated for this investigation.</p>
            ) : (
              <dl className="grid max-w-[40rem] gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-semibold">Varied</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {inv.varied.map((v) => (
                      <span key={v} className="rounded-sm border border-flame bg-flame-soft px-2 py-0.5 text-sm">{variableLabel(v)}</span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold">Not varied in the tabulated rows</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {notVaried.length === 0 ? (
                      <span className="text-sm text-muted">none</span>
                    ) : (
                      notVaried.map((v) => (
                        <span key={v} className="rounded-sm border border-rule px-2 py-0.5 text-sm text-muted">{variableLabel(v)}</span>
                      ))
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </Section>

          <Section id="publications" title={`Publications (${inv.publications.length})`}>
            {inv.publications.length === 0 ? (
              <p className="text-muted">No publications are listed for this investigation.</p>
            ) : (
              <ol className="max-w-[46rem] list-decimal space-y-2 pl-5 marker:text-muted">
                {inv.publications.map((p, idx) => {
                  const url = p.doi ? doiUrl(p.doi) : null;
                  return (
                    <li key={`${p.doi ?? p.title}-${idx}`} className="leading-snug">
                      {p.title}
                      {p.year !== null && <span className="num text-muted"> ({p.year})</span>}
                      {url && p.doi ? (
                        <>
                          {" "}
                          <ExternalLink href={url}><span className="num font-mono text-sm">{p.doi}</span></ExternalLink>
                        </>
                      ) : (
                        <span className="text-muted"> (no DOI listed)</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>
        </div>

        <aside className="flex flex-col gap-8 lg:border-l lg:border-rule lg:pl-8">
          <Section id="plot" title="Tested atmospheres">
            <MiniPlot points={points} label={`${inv.acronym} tested atmospheres`} />
          </Section>

          <Section id="facts" title="At a glance">
            <dl className="num grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
              <dt className="text-muted">Hardware</dt><dd className="font-sans">{inv.hardware || "not tabulated"}</dd>
              <dt className="text-muted">Rows</dt><dd>{inv.nRows}</dd>
              <dt className="text-muted">Eligible tests</dt><dd>{points.reduce((s, p) => s + p.count, 0)}</dd>
              <dt className="text-muted">O₂ range</dt><dd>{formatRange(inv.o2Range, "%")}</dd>
              <dt className="text-muted">Pressure range</dt><dd>{formatRange(inv.pRangePsia, "psia")}</dd>
              <dt className="text-muted">Flow range</dt><dd>{formatRange(inv.flowRangeCmS, "cm/s")}</dd>
              {(inv.startDate || inv.endDate) && (
                <>
                  <dt className="text-muted">Dates</dt>
                  <dd>{[inv.startDate, inv.endDate].filter(Boolean).join(" to ")}{inv.dateNote ? ` (${inv.dateNote})` : ""}</dd>
                </>
              )}
            </dl>
          </Section>

          <Section id="data" title="Dataset">
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
              <dt className="text-muted">Dataset DOI</dt>
              <dd className="break-all">
                {dataset ? <ExternalLink href={dataset}><span className="num font-mono">{inv.datasetDoi}</span></ExternalLink> : <span className="num font-mono">{inv.datasetDoi}</span>}
              </dd>
              <dt className="text-muted">License</dt><dd>{inv.license}</dd>
            </dl>
            <p className="mt-4">
              <ExternalLink href={PSI_URL}>Open in PSI</ExternalLink>
              <span className="block text-xs text-muted">NASA Physical Sciences Informatics repository. Search for {inv.psiId}.</span>
            </p>
          </Section>
        </aside>
      </div>
    </main>
  );
}
