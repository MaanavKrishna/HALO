"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SiChip } from "@/components/ui/SiChip";
import { SliderField } from "@/components/ui/SliderField";
import { cx } from "@/components/ui/cx";
import type { RankWeights } from "@/lib/engine/types";
import { BriefIcon } from "./icons";

export interface RankedItem {
  psiId: string;
  acronym: string;
  title: string;
  parts: RankWeights;
  why: string[];
  text: string;
  textIsSi: boolean;
  datasetUrl: string | null;
  datasetDoi: string;
  cite: number | null;
  papers: Array<{ title: string; year: number | null; url: string | null }>;
  paperCount: number;
  /** Sensors and measurement types (SI-extracted). */
  sensors: string[];
  /** Fuel and sample labels from the PSI test rows. */
  fuels: string[];
  fuelTotal: number;
}

/** Rows printed on paper; the rest are named as "more in the online brief". */
const PRINT_SHOWN = 5;
/** Rows shown before the reader opens the full list. */
const TOP_SHOWN = 3;

const KEYS: Array<{ k: keyof RankWeights; label: string; help: string }> = [
  { k: "proximity", label: "Closeness", help: "How near its tests sit to your atmosphere" },
  { k: "fuel", label: "Fuel match", help: "Its fuels match your materials, liquids or detectors" },
  { k: "hazard", label: "Hazards", help: "Spread, extinction, detection and toxicity covered" },
  { k: "richness", label: "Evidence size", help: "Rows and publications" },
];

const score = (p: RankWeights, w: RankWeights) => w.proximity * p.proximity + w.fuel * p.fuel + w.hazard * p.hazard + w.richness * p.richness;

/** The four weighted score parts side by side, with the same numbers spoken. */
function Meter({ parts, w, max }: { parts: RankWeights; w: RankWeights; max: number }) {
  return (
    <>
      <p className="sr-only">
        Score parts: {KEYS.map(({ k, label }) => `${label.toLowerCase()} ${(w[k] * parts[k]).toFixed(2)}`).join(", ")}.
      </p>
      <div aria-hidden="true" className="relevance-meter flex h-2 w-full gap-px overflow-hidden rounded-full bg-surface-2">
        {KEYS.map(({ k }, j) => {
          const part = (w[k] * parts[k]) / max;
          return part > 0 ? (
            <span key={k} className={cx("h-full transition-[width] duration-[var(--dur-base)] ease-[var(--ease-out)]", `score-seg-${j}`)} style={{ width: `${part * 100}%` }} />
          ) : null;
        })}
      </div>
    </>
  );
}

const Rank = ({ i }: { i: number }) => (
  <span className="num mb-1.5 pt-0.5 font-mono text-sm text-fg-3 sm:mb-0">
    <span className="sr-only">Rank </span>
    {String(i + 1).padStart(2, "0")}
  </span>
);

/**
 * Ranked investigations with an optional re-weighting. The top few show as
 * one-line rows; a native disclosure (no script needed) opens the full list
 * with summaries, sensors and sources, and paper always prints the full rows. The score is a
 * weighted sum of four parts the engine already computed, so re-ranking in
 * the browser gives the same order the engine would. Each row's bar shows
 * the four weighted parts side by side.
 */
export function RankedListClient({ items, shown, defaults }: { items: RankedItem[]; shown: number; defaults: RankWeights }) {
  const [w, setW] = useState<RankWeights>(defaults);
  const custom = KEYS.some(({ k }) => w[k] !== defaults[k]);

  const ranked = useMemo(() => {
    const scored = items.map((it) => ({ it, s: score(it.parts, w) }));
    scored.sort((a, b) => b.s - a.s || (a.it.psiId < b.it.psiId ? -1 : a.it.psiId > b.it.psiId ? 1 : 0));
    return scored.slice(0, shown);
  }, [items, w, shown]);
  const max = Math.max(1e-9, ...ranked.map((r) => r.s));

  return (
    <div className="ranked-wrap">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8125rem] text-fg-2" aria-hidden="true">
          <span className="type-label text-fg-3">Score parts</span>
          {KEYS.map(({ k, label }, i) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={cx("inline-block h-2 w-3.5 rounded-[2px]", `score-seg-${i}`)} />
              {label}
            </span>
          ))}
        </p>
      </div>

      <details className="weights no-print group mb-6 rounded-[var(--radius-md)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 20 20" className="size-4 text-fg-3 transition-transform duration-[var(--dur-fast)] group-open:rotate-90" aria-hidden="true">
            <path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Adjust ranking weights
          {custom && <Chip tone="accent" className="ml-1">custom</Chip>}
        </summary>
        <div className="grid gap-x-8 gap-y-5 border-t border-line px-4 pb-5 pt-4 sm:grid-cols-2">
          {KEYS.map(({ k, label, help }) => (
            <SliderField
              key={k}
              label={label}
              hint={help}
              min={0}
              max={1}
              step={0.05}
              value={w[k]}
              format={(v) => v.toFixed(2)}
              onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
            />
          ))}
          <div className="sm:col-span-2">
            <Button variant="secondary" size="sm" onClick={() => setW(defaults)} disabled={!custom}>
              Reset to default weights
            </Button>
          </div>
        </div>
      </details>

      <ol
        className="ranked-top flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]"
        data-ranked-top
      >
        {ranked.slice(0, TOP_SHOWN).map(({ it }, i) => (
          <li key={it.psiId} className="grid grid-cols-1 gap-x-3 border-t border-line px-4 py-4 first:border-t-0 sm:grid-cols-[3rem_minmax(0,1fr)] sm:px-6">
            <Rank i={i} />
            <div className="flex min-w-0 flex-col gap-2.5 md:grid md:grid-cols-[minmax(0,1fr)_11rem] md:items-start md:gap-6">
              <div className="min-w-0">
                <h3 className="text-[1.0625rem] font-semibold leading-snug text-fg">{it.acronym}</h3>
                {it.why[0] && <p className="mt-1 text-pretty text-[0.875rem] leading-snug text-fg-2">{it.why[0]}</p>}
              </div>
              <div className="md:pt-2">
                <Meter parts={it.parts} w={w} max={max} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <details className="ranked-all group/all mt-3" data-ranked-all>
        <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-1 px-4 py-2.5 text-sm font-medium text-fg transition-colors duration-[var(--dur-fast)] hover:border-line-strong [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 20 20" className="size-4 text-fg-3 transition-transform duration-[var(--dur-fast)] group-open/all:rotate-90" aria-hidden="true">
            <path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="group-open/all:hidden">
            {ranked.length > TOP_SHOWN ? (
              <>
                Show all <span className="num">{ranked.length}</span> and details
              </>
            ) : (
              "Show details"
            )}
          </span>
          <span className="hidden group-open/all:inline">
            {ranked.length > TOP_SHOWN ? (
              <>
                Show only the top <span className="num">{TOP_SHOWN}</span>
              </>
            ) : (
              "Hide details"
            )}
          </span>
        </summary>
      <ol className="mt-3 flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]" data-ranked>
        {ranked.map(({ it, s }, i) => (
          <li
            key={it.psiId}
            className={cx(
              "ranked-item grid grid-cols-1 gap-x-3 border-t border-line px-4 py-5 first:border-t-0 sm:grid-cols-[3rem_minmax(0,1fr)] sm:px-6 sm:py-6",
              i >= PRINT_SHOWN && "print-hide",
            )}
          >
            <Rank i={i} />
            <div className="min-w-0">
              <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_11rem] md:items-start md:gap-6">
                <h3 className="text-[1.0625rem] font-semibold leading-snug text-fg">
                  {it.acronym}
                  {it.title !== it.acronym && <span className="mt-0.5 block text-[0.9375rem] font-normal text-fg-2">{it.title}</span>}
                </h3>
                <div className="md:pt-1.5">
                  <Meter parts={it.parts} w={w} max={max} />
                </div>
              </div>
              {it.why.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {it.why.map((y) => (
                    <li key={y} className="max-w-full">
                      <span className="inline-flex min-h-6 max-w-full items-center rounded-[var(--radius-pill)] border border-accent-line bg-accent-soft px-2.5 py-0.5 text-[0.75rem] font-medium leading-snug text-fg">
                        {y}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="print-clamp mt-3 max-w-[68ch] text-pretty text-[0.9375rem] leading-relaxed text-fg-2">
                {it.textIsSi && <SiChip className="mr-1.5" />}
                {it.text}
              </p>
              {(it.fuels.length > 0 || it.sensors.length > 0) && (
                <dl className="mt-3 grid max-w-[68ch] gap-x-3 gap-y-1.5 text-[0.8125rem] leading-snug sm:grid-cols-[7.5rem_minmax(0,1fr)]" data-ranked-meta>
                  {it.fuels.length > 0 && (
                    <>
                      <dt className="type-label pt-px text-fg-3">Fuel · sample</dt>
                      <dd className="text-fg-2" data-ranked-fuels>
                        {it.fuels.join("; ")}
                        {it.fuelTotal > it.fuels.length && (
                          <span className="text-fg-3">
                            {" "}
                            and <span className="num">{it.fuelTotal - it.fuels.length}</span> more
                          </span>
                        )}
                      </dd>
                    </>
                  )}
                  {it.sensors.length > 0 && (
                    <>
                      <dt className="type-label pt-px text-fg-3">Sensors</dt>
                      <dd className="text-fg-2" data-ranked-sensors>
                        <SiChip className="mr-1.5" />
                        {it.sensors.join(", ")}
                      </dd>
                    </>
                  )}
                </dl>
              )}
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8125rem]">
                {it.datasetUrl ? (
                  <a
                    href={it.datasetUrl}
                    className="inline-flex items-center gap-1 font-medium text-accent underline-offset-4 hover:underline"
                    rel="noopener noreferrer"
                  >
                    <span className="num font-mono">doi:{it.datasetDoi}</span>
                    <BriefIcon name="external" size={13} />
                    <span className="sr-only">(dataset {it.psiId})</span>
                  </a>
                ) : (
                  <span className="font-mono text-fg-2">Dataset {it.psiId}</span>
                )}
                <span className="font-mono text-fg-3">{it.psiId}</span>
                {it.cite && (
                  <a href={`#cite-${it.cite}`} className="num font-mono text-fg-3 hover:text-fg hover:underline" aria-label={`source ${it.cite}`}>
                    [{it.cite}]
                  </a>
                )}
                {it.papers.map((p) =>
                  p.url ? (
                    <a
                      key={p.url}
                      href={p.url}
                      title={p.title}
                      className="paper-link max-w-[18rem] truncate text-fg-2 underline-offset-4 hover:text-fg hover:underline"
                      rel="noopener noreferrer"
                    >
                      {p.year ? `${p.year}: ` : ""}
                      {p.title}
                    </a>
                  ) : null,
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
      </details>
      {ranked.length > PRINT_SHOWN && (
        <p className="print-only mt-2 hidden text-sm text-fg-2">
          <span className="num">{ranked.length - PRINT_SHOWN}</span> more in the online brief.
        </p>
      )}
    </div>
  );
}
