import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink, Callout, PageHero } from "@/components/ui";
import { DeltaRail } from "@/components/compare/DeltaRail";
import { MissionCard } from "@/components/compare/MissionCard";
import { PresetPicker, type PickerOption } from "@/components/compare/PresetPicker";
import { DEFAULT_A, DEFAULT_B, compareDelta, compareHref, habitatFromParam, presetKey } from "@/lib/compare";
import { HALO_DATA } from "@/lib/data/load";
import { buildBrief } from "@/lib/engine/brief";
import { PRESETS } from "@/lib/engine/presets";
import type { Habitat } from "@/lib/engine/types";

export const metadata: Metadata = {
  title: "Compare habitats | HALO",
  description: "Two habitat atmospheres side by side: evidence grade, flags and smoke detection.",
};

const SHORT: Record<keyof typeof PRESETS, string> = {
  iss: "ISS",
  artemis: "Artemis",
  moon: "Moon",
  rover: "Rover",
  suit: "EVA suit",
};
const KEYS = Object.keys(PRESETS) as Array<keyof typeof PRESETS>;

function pickerOptions(side: "a" | "b", a: Habitat, b: Habitat): { options: PickerOption[]; value: string } {
  const current = side === "a" ? a : b;
  const key = presetKey(current);
  const options: PickerOption[] = KEYS.map((k) => ({
    value: k,
    label: SHORT[k],
    href: side === "a" ? compareHref(PRESETS[k], b) : compareHref(a, PRESETS[k]),
  }));
  if (!key) options.push({ value: "custom", label: "Custom", href: compareHref(a, b) });
  return { options, value: key ?? "custom" };
}

// Without JS, React never swaps the streamed comparison in (it waits in a hidden div at the end of <body>).
// This no-JS-only stylesheet shows it in place of the fallback, above the footer, so the plain-link
// pickers give a complete page without scripts.
const NO_JS_CSS =
  "[data-compare-fallback]{display:none}" +
  // In the base layer: Tailwind's preflight hides [hidden] with a layered !important, which an unlayered rule cannot beat.
  "@layer base{body>div[hidden][id^='S:']{display:flex!important;flex-direction:column;order:1}}" +
  "body>footer{order:2}";

function HeroFallback() {
  return (
    <section data-compare-fallback="" data-theme="dark" aria-busy="true" className="relative border-b border-line bg-canvas-deep">
      <noscript>
        <style>{NO_JS_CSS}</style>
      </noscript>
      <div className="container-wide min-h-[22rem] pb-16 pt-20 sm:pt-28">
        <p className="type-body-l text-fg-2">Loading comparison…</p>
      </div>
    </section>
  );
}

async function Comparison({ searchParams }: { searchParams: PageProps<"/compare">["searchParams"] }) {
  const sp = await searchParams;
  const { habitat: a, notices: na } = habitatFromParam(sp.a, DEFAULT_A, "a");
  const { habitat: b, notices: nb } = habitatFromParam(sp.b, DEFAULT_B, "b");
  const notices = [...na, ...nb];
  const briefA = buildBrief(a, HALO_DATA);
  const briefB = buildBrief(b, HALO_DATA);
  const delta = compareDelta(briefA, briefB);
  const pickA = pickerOptions("a", a, b);
  const pickB = pickerOptions("b", a, b);
  const idsA = new Set(briefA.flags.map((f) => f.id));
  const idsB = new Set(briefB.flags.map((f) => f.id));
  const onlyA = new Set([...idsA].filter((id) => !idsB.has(id)));
  const onlyB = new Set([...idsB].filter((id) => !idsA.has(id)));
  const amb = HALO_DATA.detector.ambient;
  const detectorNote = `SAME ran at ISS air (${amb.o2Pct}% O₂, ${amb.pressurePsia} psia); smoke behavior at the habitat atmosphere is untested.`;

  return (
    <>
      <PageHero
        titleId="compare-title"
        visual="rings"
        eyebrow="Compare habitats"
        title={
          <>
            <span className="type-headline block text-fg-2">What changes when you move from</span>{" "}
            <span className="mt-2 block">
              {a.name} <span className="text-fg-3">to</span> {b.name}
            </span>
          </>
        }
        lede="Same materials, same evidence rules. Evidence grades describe how close the nearest NASA test is, not the habitat itself."
        actions={
          <ButtonLink href={compareHref(b, a)} prefetch={false} scroll={false} variant="secondary" size="sm" icon={<SwapIcon />}>
            Swap sides
          </ButtonLink>
        }
      />

      <div className="container-wide flex flex-col gap-8 pb-24 pt-10 sm:pt-12">
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

        <section
          aria-label="Choose habitats"
          className="grid gap-5 rounded-[var(--radius-lg)] border border-line bg-surface-1 p-5 shadow-[var(--inner-highlight),var(--elev-1)] md:grid-cols-2 lg:grid-cols-[1fr_20rem_1fr] lg:items-end"
        >
          <PresetPicker label="From" options={pickA.options} value={pickA.value} />
          <p className="hidden text-center text-xs text-fg-3 lg:block">Pick a preset on each side, or open a brief and compare from there.</p>
          <div className="lg:justify-self-end">
            <PresetPicker label="To" options={pickB.options} value={pickB.value} />
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:col-start-2 lg:row-start-1">
            <DeltaRail a={a} b={b} delta={delta} sameAmbient={amb} />
          </div>
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <MissionCard brief={briefA} side="From" headingId="col-a" uniqueFlagIds={onlyA} detectorNote={detectorNote} />
          </div>
          <div className="min-w-0 lg:col-start-3 lg:row-start-1">
            <MissionCard brief={briefB} side="To" headingId="col-b" uniqueFlagIds={onlyB} detectorNote={detectorNote} />
          </div>
        </div>
      </div>
    </>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h11M12 4l3 3-3 3M16 13H5M8 10l-3 3 3 3" />
    </svg>
  );
}

export default function ComparePage(props: PageProps<"/compare">) {
  return (
    <main>
      <Suspense fallback={<HeroFallback />}>
        <Comparison searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
