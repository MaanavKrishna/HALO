import Link from "next/link";
import { Callout } from "@/components/ui/Callout";
import { Chip } from "@/components/ui/Chip";
import { GridLines } from "@/components/ui/Divider";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { RingsGraphic } from "@/components/ui/RingsGraphic";
import { Stat, StatGroup } from "@/components/ui/Stat";
import { StatusLight } from "@/components/ui/StatusLight";
import { briefContext } from "@/lib/brief/context";
import { CLASS_ORDER } from "@/lib/brief/pageFacts";
import { HALO_DATA } from "@/lib/data/load";
import { MATERIALS } from "@/lib/engine/materials";
import type { Brief, Grade } from "@/lib/engine/types";
import { BriefActions, BriefActionsProvider, BriefStickyBar } from "./BriefActions";
import { BriefIcon } from "./icons";
import { Num } from "./parts";

const GRADE_WORD: Record<Grade, string> = {
  A: "Tested at these conditions",
  B: "Tested close to these conditions",
  C: "Nearest test a moderate step away",
  D: "Extrapolation from distant tests",
  F: "Untested at these conditions",
};

/** Ring (0 = innermost) lit on the hero dial: the closer the evidence, the tighter the ring. */
const GRADE_RING: Record<Grade, number> = { A: 1, B: 1, C: 2, D: 3, F: 4 };

const DETECTOR_LABEL: Record<string, string> = { scatter: "Scatter", ionization: "Ionization" };

/** The JSON offered by "Download data": every fact plus the rows they cite. */
function downloadData(brief: Brief) {
  const ctx = briefContext(brief);
  const sameClasses = new Set(
    brief.habitat.materials.map((m) => MATERIALS[m].sameClass?.toLowerCase()).filter(Boolean),
  );
  return {
    product: "HALO Fire Brief",
    disclaimer: "HALO summarizes published NASA test evidence. It is not a safety certification.",
    dataBuiltAt: HALO_DATA.manifest.builtAt,
    habitat: brief.habitat,
    grade: brief.grade,
    flags: brief.flags,
    facts: ctx.facts,
    citations: ctx.citations.map(({ n, title, psiId, doi, url, factIds }) => ({ n, title, psiId, doi, url, factIds })),
    citedRows: {
      nearestTests: CLASS_ORDER.map((c) => brief.byClass[c].test).filter(Boolean),
      detectorRuns: HALO_DATA.detector.runs.filter((r) => sameClasses.has(r.material.toLowerCase())),
      saffireVI: HALO_DATA.literature.filter((r) => /^saffire[-\s]?vi$/i.test(r.mission.trim())),
    },
  };
}

function fileName(name: string) {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "habitat";
  return `halo-fire-brief-${s}.json`;
}

/** One atmosphere readout: a fact value, its unit and its provenance. */
function Readout({ brief, id, label }: { brief: Brief; id: string; label: React.ReactNode }) {
  const f = briefContext(brief).fact(id);
  return (
    <Stat
      label={label}
      value={<Num brief={brief} id={id} unit={false} cite={false} />}
      unit={f?.unit}
      provenance={f ? <ProvenanceBadge provenance={f.provenance} /> : undefined}
    />
  );
}

/**
 * The brief's opener: a theater well with the habitat, its atmosphere
 * readouts and the evidence grade at the centre of the halo dial. A glass
 * sub-bar takes over the name, grade and actions once this scrolls away.
 */
export function BriefHeader({ brief }: { brief: Brief }) {
  const h = brief.habitat;
  const g = brief.grade.grade;
  const materials = h.materials.map((m) => MATERIALS[m].label);
  const crit = brief.flags.filter((f) => f.severity === "critical").length;
  const warn = brief.flags.filter((f) => f.severity === "warning").length;

  return (
    <BriefActionsProvider download={downloadData(brief)} filename={fileName(h.name)}>
      <header
        id="brief-hero"
        className="brief-header brief-hero theater-well relative isolate overflow-hidden border-b border-line text-fg"
      >
        <GridLines corners />
        <div className="container-page relative flex flex-col gap-6 pb-12 pt-10 sm:pb-16 sm:pt-14 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14 lg:pb-20 lg:pt-16">
          {/* Phones: name, then the grade, then the readouts (display: contents lets the grade slot in). */}
          <div className="contents min-w-0 lg:flex lg:flex-col lg:gap-6">
            <div className="order-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 lg:order-none">
              <p className="type-label text-accent">
                Fire Brief
                <span className="ml-3 text-fg-3">Data built {HALO_DATA.manifest.builtAt.slice(0, 10)}</span>
              </p>
              <Link
                href="/"
                prefetch={false}
                className="no-print inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] text-sm text-fg-2 transition-colors duration-[var(--dur-fast)] hover:text-fg"
              >
                <BriefIcon name="arrowLeft" size={16} />
                Build another habitat
              </Link>
            </div>

            <h1 className="order-2 type-display-l max-w-[18ch] break-words text-fg lg:order-none">{h.name}</h1>

            {brief.notices.length > 0 && (
              <div data-notices aria-label="Link adjustments" className="order-3 lg:order-none">
                <Callout tone="info" title="Some link values were adjusted">
                  <ul className="list-disc pl-5">
                    {brief.notices.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </Callout>
              </div>
            )}

            <StatGroup className="order-5 lg:order-none lg:grid-cols-2 xl:grid-cols-4 [&>div]:p-4 sm:[&>div]:p-5">
              <Readout brief={brief} id="habitat-oxygen" label={<>Oxygen O<sub>2</sub></>} />
              <Readout brief={brief} id="habitat-pressure" label="Pressure" />
              <Readout brief={brief} id="habitat-oxygen-partial-pressure" label={<>ppO<sub>2</sub></>} />
              <Readout brief={brief} id="habitat-flow" label="Air flow" />
            </StatGroup>

            <dl className="order-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm lg:order-none">
              <div className="flex flex-wrap items-center gap-2">
                <dt className="type-label text-fg-3">Materials</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {materials.length ? materials.map((m) => <Chip key={m}>{m}</Chip>) : <span className="text-fg-2">none listed</span>}
                </dd>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <dt className="type-label text-fg-3">Detectors</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {h.detectors.map((d) => (
                    <Chip key={d}>{DETECTOR_LABEL[d] ?? d}</Chip>
                  ))}
                </dd>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <dt className="type-label text-fg-3">Liquid fuels</dt>
                <dd>
                  <Chip>{h.liquids ? "On board" : "None"}</Chip>
                </dd>
              </div>
            </dl>

            <div className="order-7 pt-2 lg:order-none">
              <BriefActions />
            </div>
          </div>

          {/* The grade at the centre of the halo dial. */}
          <div className="grade-panel order-4 flex flex-col items-center gap-5 py-2 text-center lg:order-none lg:py-0 lg:pt-2" data-grade={g}>
            <div className="relative grid w-full max-w-[13rem] place-items-center sm:max-w-[17rem] lg:max-w-[19rem]">
              <RingsGraphic rings={5} active={GRADE_RING[g]} drawIn maskInner={0.3} className="col-start-1 row-start-1" />
              <div className="brief-grade-glow col-start-1 row-start-1 grid place-items-center" style={{ zoom: 1.55 }}>
                <GradeBadge grade={g} size="lg" />
              </div>
            </div>
            <div className="flex max-w-[22rem] flex-col items-center gap-2">
              <p className="type-label text-fg-3">Evidence grade</p>
              <p className="type-title text-fg">{GRADE_WORD[g]}</p>
              <p className="type-body-s text-pretty text-fg-2" data-grade-reason data-fact="grade-reason">{brief.grade.reason}</p>
              <details className="grade-rule group w-full text-left">
                <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-[var(--radius-sm)] text-[0.8125rem] font-medium text-accent [&::-webkit-details-marker]:hidden">
                  <svg viewBox="0 0 20 20" className="size-3.5 transition-transform duration-[var(--dur-fast)] group-open:rotate-90" aria-hidden="true">
                    <path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  How the grade is set
                </summary>
                <p className="mt-2 text-pretty text-[0.8125rem] leading-relaxed text-fg-3" data-grade-technical>
                  {brief.grade.technical}
                </p>
              </details>
            </div>
            <a
              href="#flags"
              className="no-print inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-[var(--radius-pill)] border border-line bg-surface-1 px-4 py-2 transition-colors duration-[var(--dur-fast)] hover:border-line-strong"
            >
              {crit > 0 ? (
                <StatusLight status="crit" pulse label={`${crit} critical ${crit === 1 ? "finding" : "findings"}`} />
              ) : (
                <StatusLight status="idle" label="No critical findings" />
              )}
              {warn > 0 && <StatusLight status="warn" label={`${warn} caution${warn === 1 ? "" : "s"}`} />}
            </a>
          </div>
        </div>
      </header>
      <BriefStickyBar name={h.name} grade={g} watch="brief-hero" />
    </BriefActionsProvider>
  );
}
