import Link from "next/link";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { briefContext } from "@/lib/brief/context";
import { CLASS_ORDER } from "@/lib/brief/pageFacts";
import { HALO_DATA } from "@/lib/data/load";
import { MATERIALS } from "@/lib/engine/materials";
import type { Brief } from "@/lib/engine/types";
import { BriefActions } from "./BriefActions";
import { Eyebrow, Num } from "./parts";

const GRADE_WORD: Record<string, string> = {
  A: "Tested at these conditions",
  B: "Tested close to these conditions",
  C: "Nearest test a moderate step away",
  D: "Extrapolation from distant tests",
  F: "Untested at these conditions",
};

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

export function BriefHeader({ brief }: { brief: Brief }) {
  const h = brief.habitat;
  const g = brief.grade.grade;
  const materials = h.materials.map((m) => MATERIALS[m].label);
  return (
    <header className="brief-header pb-10 pt-8 sm:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5">
          <Eyebrow>Fire Brief</Eyebrow>
          <span aria-hidden="true" className="h-px w-6 bg-rule-strong" />
          <span className="text-[11px] text-muted">Published NASA microgravity test evidence</span>
        </p>
        <Link href="/" prefetch={false} className="no-print text-sm text-flame underline-offset-4 hover:underline">
          ← Build another habitat
        </Link>
      </div>

      {brief.notices.length > 0 && (
        <div role="note" aria-label="Link adjustments" className="mt-5 rounded-md border border-amber/50 bg-amber-soft px-4 py-3 text-sm" data-notices>
          <p className="font-semibold text-amber">Some link values were adjusted</p>
          <ul className="mt-1 list-disc pl-5">
            {brief.notices.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
        <div className="min-w-0">
          <h1 className="wide break-words text-[clamp(2.25rem,7vw,4.25rem)] font-extrabold leading-[0.95] tracking-[-0.015em]">
            {h.name}
          </h1>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 sm:gap-x-8">
            <Readout label={<>Oxygen, O<sub>2</sub></>}>
              <Num brief={brief} id="hab-oxygen" cite={false} />
            </Readout>
            <Readout label="Total pressure">
              <Num brief={brief} id="hab-pressure" cite={false} />
            </Readout>
            <Readout label={<>O<sub>2</sub> partial pressure</>}>
              <Num brief={brief} id="hab-oxygen-partial-pressure" cite={false} />
            </Readout>
            <Readout label="Cabin air flow">
              <Num brief={brief} id="hab-flow" cite={false} />
            </Readout>
          </dl>
          <p className="mt-5 max-w-3xl text-sm text-muted">
            <span className="text-ink">Materials:</span> {materials.length ? materials.join(", ") : "none listed"}
            <span aria-hidden="true" className="mx-2">·</span>
            <span className="text-ink">Detectors:</span> {h.detectors.join(" + ")}
            <span aria-hidden="true" className="mx-2">·</span>
            <span className="text-ink">Liquid fuels:</span> {h.liquids ? "on board" : "none"}
          </p>
        </div>

        <div className="grade-panel flex items-center gap-5 rounded-lg border border-rule bg-surface p-5 lg:max-w-sm" data-grade={g}>
          <GradeBadge grade={g} size="lg" />
          <div className="min-w-0">
            <Eyebrow>Evidence grade</Eyebrow>
            <p className="mt-0.5 font-semibold leading-snug">{GRADE_WORD[g]}</p>
            <p className="mt-1.5 text-sm leading-snug text-muted">{brief.grade.reason}</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <BriefActions download={downloadData(brief)} filename={fileName(h.name)} />
      </div>
    </header>
  );
}

function Readout({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-rule pl-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-xl font-medium tracking-tight sm:text-2xl">{children}</dd>
    </div>
  );
}
