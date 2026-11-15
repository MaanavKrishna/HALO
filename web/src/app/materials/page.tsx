import { Suspense } from "react";
import { Button, ButtonLink, Callout, Icon, NumberField, PageHero, Panel, ProvenanceBadge, Stat, StatGroup } from "@/components/ui";
import { Cond, ExternalLink, SectionHead, ringText, signed } from "@/components/materials/parts";
import {
  ATMOSPHERE_PRESETS, SCREEN_MATERIALS, clusterPsi, evidenceCounts, parseScreenParams, screenHref, screenMaterial,
} from "@/components/materials/screener";
import { EvidencePlot, SeriesSwatch } from "@/components/views/EvidencePlot";
import { LinkChips } from "@/components/views/LinkChips";
import { StreamFallback } from "@/components/views/StreamFallback";
import { HALO_DATA } from "@/lib/data/load";
import { BASS_FACT } from "@/lib/engine/facts";
import { PRESETS } from "@/lib/engine/presets";
import { habitatToQuery } from "@/lib/engine/url";
import { doiUrl } from "@/lib/explore";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Material screener",
  description:
    "Pick a cabin material and an atmosphere: every NASA PSI test row, Saffire flight result and SAME smoke-detector run for it, and how far the nearest evidence sits from your atmosphere.",
  path: "/materials",
});

const ATM_SHORT: Record<string, string> = { iss: "ISS", artemis: "Artemis", moon: "Moon", suit: "EVA suit" };
const atm = (x: number) => Number((x / 14.696).toFixed(1));

async function Screener({ searchParams }: { searchParams: PageProps<"/materials">["searchParams"] }) {
  const sp = await searchParams;
  const { material, atmosphere: a, notices } = parseScreenParams(sp);
  const s = screenMaterial(material, a, HALO_DATA);
  const counts = evidenceCounts(HALO_DATA);
  const byPsi = new Map(HALO_DATA.investigations.map((i) => [i.psiId, i]));
  const amb = HALO_DATA.detector.ambient;
  const thr = HALO_DATA.detector.thresholds;
  const litPlot = s.literature.filter((l) => l.row.o2Pct !== null && l.row.pressurePsia !== null);
  const litNoP = s.literature.length - litPlot.length;
  const inferredRows = s.psi.filter((e) => e.inferredMaterial).length;
  const anyFlow = s.psi.some((e) => e.test.flowCmS != null);
  const anyOutcome = s.psi.some((e) => !!e.test.outcome);

  const briefHref = material.briefId
    ? `/brief?${habitatToQuery({
        ...PRESETS.artemis,
        name: `${material.label} at ${a.name}`.slice(0, 60),
        o2Pct: a.o2Pct,
        pressurePsia: a.pressurePsia,
        materials: [material.briefId],
      })}`
    : null;

  const materialChips = SCREEN_MATERIALS.map((m) => ({
    key: m.id,
    label: m.label,
    detail: String(counts[m.id]),
    selected: m.id === material.id,
    href: screenHref(m.id, a),
    ariaLabel: `${m.label}, ${counts[m.id]} evidence points`,
  }));
  const atmChips = ATMOSPHERE_PRESETS.map((p) => ({
    key: p.key,
    label: ATM_SHORT[p.key],
    detail: `${p.o2Pct}% · ${p.pressurePsia}`,
    selected: a.presetKey === p.key,
    href: screenHref(material.id, p),
    ariaLabel: `${p.name}, ${p.o2Pct}% O2 at ${p.pressurePsia} psia`,
  }));

  return (
    <>
      <PageHero
        titleId="materials-title"
        visual="rings"
        eyebrow="Material screener"
        title={
          <>
            {material.label}
            <span className="type-headline mt-3 block text-fg-2">
              at {a.name}, <span className="font-mono">{a.o2Pct}%</span> O₂ and <span className="font-mono">{a.pressurePsia}</span> psia
            </span>
          </>
        }
        lede="Every piece of NASA evidence for one material, measured against the atmosphere you pick. HALO reports how close the tests came, not whether the material passes."
        actions={
          briefHref ? (
            <ButtonLink href={briefHref} prefetch={false} iconEnd={<Icon name="arrowRight" size={16} />}>
              Build a brief with this material
            </ButtonLink>
          ) : (
            <p className="text-sm text-fg-3">The brief has no slot for {material.label.toLowerCase()} yet.</p>
          )
        }
        meta={
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {[
              ["PSI test rows", String(s.psi.length)],
              ["Saffire flight points", String(s.literature.length)],
              ["Smoke-detector runs", s.smoke ? String(s.smoke.result.scatterRuns) : "none"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <dt className="type-label text-fg-3">{k}</dt>
                <dd className="font-mono text-xl tracking-[-0.02em] text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        }
      />

      <div className="container-wide flex flex-col gap-14 pb-24 pt-10 sm:pt-12">
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

        <Panel label="Choose a material and an atmosphere" meta="Shareable link" bodyClassName="grid gap-8 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <p className="type-label text-fg-3">Material · evidence points</p>
            <LinkChips label="Material" chips={materialChips} />
            <p className="text-sm text-fg-2">{material.blurb}</p>
          </div>
          <div className="flex flex-col gap-3">
            <p className="type-label text-fg-3">Atmosphere · O₂ % · psia</p>
            <LinkChips label="Atmosphere preset" chips={atmChips} />
            <form method="get" action="/materials" className="mt-2 grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]" aria-label="Custom atmosphere">
              <input type="hidden" name="m" value={material.id} />
              <NumberField label="O₂" unit="%" name="o2" min={1} max={100} step="any" defaultValue={a.o2Pct} required />
              <NumberField label="Pressure" unit="psia" name="p" min={0.5} max={20} step="any" defaultValue={a.pressurePsia} required />
              <Button type="submit" variant="secondary" className="col-span-2 sm:col-span-1">
                Screen
              </Button>
            </form>
          </div>
        </Panel>

        <section aria-labelledby="distance" className="flex flex-col gap-5">
          <SectionHead
            id="distance"
            title="How close the evidence comes"
            lede="Evidence distance treats 10 O₂ percentage points as equal to 3 psia, the same scale every Fire Brief uses. Zero means a test ran at exactly your atmosphere."
          />
          <StatGroup>
            <Stat
              label="Nearest PSI test"
              value={s.nearestPsi ? s.nearestPsi.d.toFixed(2) : "none"}
              detail={s.nearestPsi ? s.nearestPsi.label : "No PSI row for this material"}
            />
            <Stat label="O₂ gap" value={s.nearestPsi ? signed(s.nearestPsi.o2Gap) : "—"} unit={s.nearestPsi ? "points" : undefined} detail="Test minus your atmosphere" />
            <Stat label="Pressure gap" value={s.nearestPsi ? signed(s.nearestPsi.pGap) : "—"} unit={s.nearestPsi ? "psia" : undefined} detail="Test minus your atmosphere" />
            <Stat
              label="Nearest Saffire point"
              value={s.nearestLit ? s.nearestLit.d.toFixed(2) : "none"}
              detail={s.nearestLit ? s.nearestLit.label : "No flight point with both O₂ and pressure"}
              provenance={s.nearestLit ? <ProvenanceBadge provenance="literature" /> : undefined}
            />
          </StatGroup>
          {s.nearestPsi && (
            <p className="max-w-[70ch] text-fg-2">
              The nearest PSI test of {material.label} sits at distance <span className="font-mono text-fg">{s.nearestPsi.d.toFixed(2)}</span>,{" "}
              {ringText(s.nearestPsi.d)}.
              {s.nearestLit && (
                <>
                  {" "}
                  The nearest Saffire flight point (literature, outside PSI) sits at <span className="font-mono text-fg">{s.nearestLit.d.toFixed(2)}</span>,{" "}
                  {ringText(s.nearestLit.d)}.
                </>
              )}
            </p>
          )}
        </section>

        {(s.psi.length > 0 || litPlot.length > 0) && (
          <section aria-labelledby="map" className="flex flex-col gap-4">
            <SectionHead id="map" title="Where it was tested" aside="O₂ × pressure · rounded to 0.1" />
            <div className="rounded-[var(--radius-lg)] border border-line bg-surface-1 p-4 shadow-[var(--inner-highlight),var(--elev-1)] sm:p-6">
              <EvidencePlot
                series={[
                  { key: "psi", label: "PSI rows", shape: "circle", tone: "accent", points: clusterPsi(s.psi) },
                  {
                    key: "lit",
                    label: "Saffire flight points",
                    shape: "square",
                    tone: "ink",
                    points: litPlot.map((l) => ({ o2Pct: l.row.o2Pct as number, pressurePsia: l.row.pressurePsia as number })),
                  },
                ]}
                refs={[{ label: a.name, o2Pct: a.o2Pct, pressurePsia: a.pressurePsia, primary: true }]}
                label={`${material.label}: ${s.psi.length} PSI test rows and ${litPlot.length} Saffire flight points by oxygen and pressure, with your atmosphere (${a.o2Pct}% O2, ${a.pressurePsia} psia) marked. Tables follow.`}
                legend={
                  <>
                    <span className="inline-flex items-center gap-1.5 text-fg-2">
                      <SeriesSwatch shape="circle" tone="accent" /> PSI rows, both measured
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-fg-2">
                      <SeriesSwatch shape="circle" tone="accent" hollow /> PSI rows, a condition inferred or assumed
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-fg-2">
                      <SeriesSwatch shape="square" tone="ink" /> Saffire flight point (literature)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-fg-2">
                      <svg width="16" height="16" aria-hidden="true">
                        <circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--accent)" strokeWidth="1.25" />
                        <path d="M8 3.5v9M3.5 8h9" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Your atmosphere
                    </span>
                  </>
                }
              />
            </div>
          </section>
        )}

        <section aria-labelledby="psi-rows" className="flex flex-col gap-4">
          <SectionHead
            id="psi-rows"
            title="PSI test rows"
            aside={`${s.psi.length} rows · nearest first`}
            lede={
              s.psi.length
                ? `Rows from ${s.investigations.map((id) => byPsi.get(id)?.acronym ?? id).join(", ")} whose fuel is ${material.label}. Only rows with both oxygen and pressure known are listed.`
                : `No PSI row with a known atmosphere names ${material.label}.${s.smoke ? " Its only microgravity evidence is the smoke-detector runs below." : ""}`
            }
          />
          {inferredRows > 0 && material.inferNote && (
            <p className="flex max-w-[70ch] flex-wrap items-center gap-2 text-sm text-fg-2">
              <ProvenanceBadge provenance="inferred" />
              <span>
                {inferredRows} of {s.psi.length} rows. {material.inferNote}
              </span>
            </p>
          )}
          {s.psi.length > 0 && (
            <div className="relative max-h-[32rem] overflow-auto rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]" tabIndex={0} role="region" aria-label="PSI test rows table">
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <caption className="sr-only">PSI test rows for {material.label}, nearest to your atmosphere first</caption>
                <thead className="glass-chrome sticky top-0 z-[1]">
                  <tr>
                    {["Investigation", "Sample", "O₂ (%)", "Pressure (psia)", "Flow (cm/s)", "Outcome", "Distance"].map((h, i) => (
                      <th key={h} scope="col" className={`type-label px-4 py-3 font-medium text-fg-3 ${i >= 2 && i !== 5 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.psi.map(({ test: t, d, inferredMaterial }) => {
                    const inv = byPsi.get(t.psiId);
                    const doi = inv ? doiUrl(inv.datasetDoi) : null;
                    return (
                      <tr key={t.id} className="border-t border-line align-top">
                        <td className="px-4 py-2.5">
                          <span className="block text-fg">{t.acronym}</span>
                          {doi ? (
                            <ExternalLink href={doi} className="font-mono text-xs">
                              {t.psiId} dataset
                            </ExternalLink>
                          ) : (
                            <span className="font-mono text-xs text-fg-3">{t.psiId}</span>
                          )}
                        </td>
                        <td className="max-w-[16rem] px-4 py-2.5 text-fg-2">
                          {t.fuel}
                          {inferredMaterial && <span className="mt-0.5 block text-xs text-fg-3">material inferred from the sample name</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Cond value={t.o2Pct} src={t.o2Src} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Cond value={t.pressurePsia} src={t.pSrc} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {t.flowCmS != null ? <span className="text-fg">{t.flowCmS}</span> : <span className="font-sans text-xs text-fg-3">not tabulated</span>}
                        </td>
                        <td className="max-w-[14rem] px-4 py-2.5 text-fg-2">{t.outcome ? t.outcome : <span className="text-xs text-fg-3">not tabulated</span>}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-fg">{d.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {s.psi.length > 0 && (!anyFlow || !anyOutcome) && (
            <p className="max-w-[70ch] text-xs text-fg-3">
              {[!anyFlow && "per-row flow", !anyOutcome && "per-row outcome"].filter(Boolean).join(" and ")} {!anyFlow && !anyOutcome ? "are" : "is"} not
              in HALO&apos;s test table yet; the investigation&apos;s flow range is on its dossier.
            </p>
          )}
        </section>

        <section aria-labelledby="lit" className="flex flex-col gap-4">
          <SectionHead
            id="lit"
            title="Saffire flight results"
            aside={<span className="inline-flex items-center gap-2">{s.literature.length} points <ProvenanceBadge provenance="literature" /></span>}
            lede={
              s.literature.length
                ? "Large-scale burns on Cygnus cargo vehicles, read from NASA technical reports. These are literature values, not PSI rows, and do not count toward a brief's coverage grade."
                : `No Saffire report in HALO's literature table names ${material.label}.`
            }
          />
          {s.literature.length > 0 && (
            <ol className="grid gap-4 md:grid-cols-2">
              {s.literature.map(({ row: r, d }) => (
                <li key={`${r.mission}-${r.sampleId}`} className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-1 p-5 shadow-[var(--inner-highlight),var(--elev-1)]">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="type-title text-fg">
                      {r.mission} <span className="font-mono text-fg-3">{r.sampleId}</span>
                    </p>
                    <span className="font-mono text-sm text-fg-2">{d === null ? "distance needs pressure" : `distance ${d.toFixed(2)}`}</span>
                  </div>
                  <p className="text-sm text-fg-2">{r.material}</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    {[
                      ["O₂", r.o2Pct, "%"],
                      ["Pressure", r.pressurePsia, "psia"],
                      ["Flow", r.flowCmS, "cm/s"],
                      ["Spread", r.spreadRateMmS, "mm/s"],
                    ].map(([k, v, u]) => (
                      <div key={k as string} className="flex flex-col gap-0.5">
                        <dt className="type-label text-fg-3">{k}</dt>
                        <dd className="font-mono text-fg">{v === null ? <span className="font-sans text-xs text-fg-3">not reported</span> : `${v} ${u}`}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-sm leading-relaxed text-fg-2">{r.outcome}</p>
                  <ExternalLink href={r.sourceUrl} className="self-start text-xs">
                    NASA technical report
                  </ExternalLink>
                </li>
              ))}
            </ol>
          )}
          {litNoP > 0 && <p className="text-xs text-fg-3">{litNoP} of these points report no cabin pressure, so they have no distance and are not plotted.</p>}
        </section>

        <section aria-labelledby="smoke" className="flex flex-col gap-4">
          <SectionHead
            id="smoke"
            title="Smoke-detector runs"
            lede={
              s.smoke
                ? `SAME and SAME-R heated ${s.smoke.sameClass} samples in orbit and logged what each detector read. Alarm proxies: forward scatter at ${thr.scatterV} V, ionization at ${thr.ionizationDV.toFixed(3)} ΔV.`
                : `SAME and SAME-R did not test ${material.label}, so there is no smoke-detector evidence for it.`
            }
          />
          {s.smoke && (
            <>
              <StatGroup>
                <Stat
                  label="Below the scatter alarm"
                  value={`${s.smoke.result.scatterLow}/${s.smoke.result.scatterRuns}`}
                  detail={s.smoke.result.scatterLowPct !== null ? `${Math.round(s.smoke.result.scatterLowPct)}% of runs with a scatter reading` : undefined}
                  provenance={<ProvenanceBadge provenance="measured" />}
                />
                {s.smoke.whatIf.map((w) => (
                  <Stat
                    key={w.combo.join("+")}
                    label={w.combo.length === 1 ? "Caught by scatter alone" : "Caught by scatter + ionization"}
                    value={`${w.caught}/${w.runs}`}
                    detail={`${Math.round(w.caughtPct)}% of runs with every channel read`}
                    provenance={<ProvenanceBadge provenance="measured" />}
                  />
                ))}
              </StatGroup>
              <Callout tone="info" title="Smoke data is from ISS air only">
                SAME ran at ISS air ({amb.o2Pct}% O₂, {atm(amb.pressurePsia)} atm); smoke behavior at habitat atmosphere is untested.
              </Callout>
            </>
          )}
        </section>

        {(
          <section aria-labelledby="standard" className="flex flex-col gap-4">
            <SectionHead id="standard" title="The standard flammability test" />
            <Callout tone="info" title="NASA-STD-6001 Test 1 screens materials at Earth gravity">
              <p>
                The BASS investigation&apos;s finding, as NASA&apos;s guide reports it: &ldquo;{BASS_FACT.value}.&rdquo; A material that passes the
                standard upward-burn test on the ground is not shown to resist burning in orbit.
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <ProvenanceBadge provenance="literature" />
                {BASS_FACT.source.url && <ExternalLink href={BASS_FACT.source.url}>{BASS_FACT.source.note}</ExternalLink>}
              </p>
            </Callout>
          </section>
        )}

        <nav aria-label="Related tools" className="flex flex-wrap gap-3 border-t border-line pt-8">
          {briefHref && (
            <ButtonLink href={briefHref} prefetch={false} iconEnd={<Icon name="arrowRight" size={16} />}>
              Build a brief with this material
            </ButtonLink>
          )}
          <ButtonLink href="/gravity" variant="secondary" prefetch={false}>
            Partial-gravity bounds
          </ButtonLink>
          <ButtonLink href={`/investigations/compare?ids=${(s.investigations.length >= 2 ? s.investigations : ["PSI-25", "PSI-99"]).slice(0, 4).join(",")}`} variant="ghost" prefetch={false}>
            Compare its investigations
          </ButtonLink>
        </nav>
      </div>
    </>
  );
}

export default function MaterialsPage(props: PageProps<"/materials">) {
  return (
    <main>
      <Suspense fallback={<StreamFallback label="Loading material evidence…" />}>
        <Screener searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
