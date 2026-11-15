"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, Chip, Icon, ProvenanceBadge, Segmented, SiChip, TBody, Td, Th, ToggleChip, Tr, cx } from "@/components/ui";
import type { InvestigationRow } from "@/lib/data/schema";
import { PRESETS } from "@/lib/engine/presets";
import type { FuelClass, Hazard, Investigation } from "@/lib/engine/types";
import {
  FUEL_LABEL, HARDWARE_LABEL, HAZARD_LABEL, HAZARD_ORDER, O2_TRACK, filterByHazards, formatRange, NO_CONDITIONS, NO_CONDITIONS_HELP, shownCondition, type Conditions, type ShownCondition, hardwareFamily,
  matchesSampleOrSensor, sortInvestigations, type SensorMap, type SortDir, type SortKey,
} from "@/lib/explore";
import { CoverageBar, FuelMark, HardwareGlyph, MissionPatch } from "./Glyphs";

type View = "list" | "patches";
type Fuel = FuelClass | "all";

const COLUMNS: Array<{ key: SortKey | null; label: string; numeric?: boolean; className?: string }> = [
  { key: "acronym", label: "Investigation", className: "w-[13%]" },
  { key: null, label: "Fuel", className: "w-[9%]" },
  { key: "hardware", label: "Hardware", className: "w-[15%]" },
  { key: null, label: "Sample · sensors", className: "w-[20%]" },
  { key: null, label: "Hazards", className: "w-[11%]" },
  { key: "o2", label: "O₂ coverage", className: "w-[14%]" },
  { key: "pressure", label: "Pressure", numeric: true },
  { key: "rows", label: "Rows", numeric: true },
  { key: "pubs", label: "Pubs", numeric: true },
];

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "acronym", label: "Investigation" },
  { key: "hardware", label: "Hardware" },
  { key: "o2", label: "O₂ (lowest tested)" },
  { key: "pressure", label: "Pressure (lowest tested)" },
  { key: "rows", label: "Rows" },
  { key: "pubs", label: "Publications" },
];

const FUEL_OPTIONS = [
  { value: "all", label: "All" },
  { value: "solid", label: "Solid" },
  { value: "solid_surrogate", label: "Surrogate" },
  { value: "droplet", label: "Droplet" },
  { value: "gas", label: "Gas" },
] as const satisfies ReadonlyArray<{ value: Fuel; label: string }>;

const defaultDir = (k: SortKey): SortDir => (k === "acronym" || k === "hardware" ? "asc" : "desc");
const href = (i: Investigation) => `/explore/${i.psiId}`;

function FuelChips({ inv }: { inv: Investigation }) {
  if (inv.fuelClasses.length === 0) return <span className="text-xs text-fg-3">Fuel not tabulated</span>;
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Fuel classes">
      {inv.fuelClasses.map((f) => (
        <li key={f}>
          <Chip className="text-fg-2">
            <FuelMark fuel={f} className="text-accent" />
            {FUEL_LABEL[f]}
          </Chip>
        </li>
      ))}
    </ul>
  );
}

function HazardChips({ inv, max = 6 }: { inv: Investigation; max?: number }) {
  if (inv.hazards.length === 0) return <span className="text-xs text-fg-3">none listed</span>;
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Hazards studied">
      {inv.hazards.slice(0, max).map((h) => (
        <li key={h}>
          <Chip>{HAZARD_LABEL[h]}</Chip>
        </li>
      ))}
    </ul>
  );
}

/** Ranges from the PSI design matrix (no per-test rows) are inferred, and say so. */
export function DesignMatrixNote({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-fg-3", className)}>
      <ProvenanceBadge provenance="inferred" />
      <span>design matrix, no per-test rows</span>
    </span>
  );
}

/** A shown range with its provenance tag (assumed / inferred) or the no-conditions text. */
export function ConditionValue({ shown, unit, className }: { shown: ShownCondition; unit: string; className?: string }) {
  if (!shown.range) {
    return (
      <span className={cx("font-mono text-[0.8125rem] text-fg-3", className)} title={NO_CONDITIONS_HELP}>
        {NO_CONDITIONS}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={cx("font-mono text-[0.8125rem] text-fg", className)}>{formatRange(shown.range, unit)}</span>
      {shown.src && (
        <span title={shown.basis === "design" ? "From the PSI design matrix; no per-test rows are published." : undefined}>
          <ProvenanceBadge provenance={shown.src} />
        </span>
      )}
    </span>
  );
}

function O2Cell({ inv, cond }: { inv: Investigation; cond: Conditions | undefined }) {
  const shown = shownCondition(inv, cond, "o2");
  return (
    <div className="flex flex-col gap-1.5">
      <CoverageBar range={shown.range} />
      <ConditionValue shown={shown} unit="%" />
      {shown.basis === "design" && <span className="text-xs text-fg-3">design matrix, no per-test rows</span>}
    </div>
  );
}

/** Sample geometry (from the PSI tables/text) and the SI-written sensor list, SI-badged. */
function SampleSensors({ inv, sensors, compact = false }: { inv: InvestigationRow; sensors: string[] | undefined; compact?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {inv.geometry ? (
        <span className={cx("text-[0.8125rem] leading-snug text-fg-2", !compact && "line-clamp-2")} title={inv.geometry}>
          {inv.geometry}
        </span>
      ) : (
        <span className="text-xs text-fg-3">sample not tabulated</span>
      )}
      {sensors?.length ? (
        <span className="text-xs leading-snug text-fg-3">
          <span className="sr-only">Sensors: </span>
          <span className={cx(!compact && "line-clamp-1")} title={sensors.join(", ")}>
            {sensors.join(" · ")}
          </span>{" "}
          <SiChip />
        </span>
      ) : null}
    </div>
  );
}

function FuelInline({ inv }: { inv: Investigation }) {
  if (inv.fuelClasses.length === 0) return <span className="text-xs text-fg-3">not tabulated</span>;
  return (
    <ul className="flex flex-col gap-1" aria-label="Fuel classes">
      {inv.fuelClasses.map((f) => (
        <li key={f} className="flex items-center gap-1.5 whitespace-nowrap text-[0.8125rem] text-fg-2">
          <FuelMark fuel={f} className="text-accent" />
          {FUEL_LABEL[f]}
        </li>
      ))}
    </ul>
  );
}

function HazardInline({ inv }: { inv: Investigation }) {
  if (inv.hazards.length === 0) return <span className="text-xs text-fg-3">none listed</span>;
  return <span className="text-[0.8125rem] leading-snug text-fg-2">{inv.hazards.map((h) => HAZARD_LABEL[h]).join(" · ")}</span>;
}

export function ExploreBrowser({ investigations, sensors = {}, conditions = {} }: { investigations: InvestigationRow[]; sensors?: SensorMap; conditions?: Record<string, Conditions> }) {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [query, setQuery] = useState("");
  const [fuel, setFuel] = useState<Fuel>("all");
  const [view, setView] = useState<View>("list");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "acronym", dir: "asc" });

  const rows = useMemo(
    () =>
      sortInvestigations(
        filterByHazards(investigations, hazards, fuel).filter((i) => matchesSampleOrSensor(i, sensors, query)),
        sort.key,
        sort.dir,
        conditions,
      ) as InvestigationRow[],
    [investigations, hazards, fuel, sort, query, sensors, conditions],
  );
  const filtered = hazards.length > 0 || fuel !== "all" || query.trim() !== "";

  const toggleHazard = (h: Hazard) =>
    setHazards((hs) => (hs.includes(h) ? hs.filter((x) => x !== h) : HAZARD_ORDER.filter((x) => x === h || hs.includes(x))));
  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: defaultDir(key) }));

  return (
    <div className="flex flex-col gap-8">
      {/* Controls */}
      <div className="flex flex-col gap-5 border-b border-line pb-6">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="type-label mb-2.5 text-fg-3">Hazard</legend>
          <div className="flex flex-wrap gap-2">
            {HAZARD_ORDER.map((h) => (
              <ToggleChip key={h} checked={hazards.includes(h)} onChange={() => toggleHazard(h)}>
                {HAZARD_LABEL[h]}
              </ToggleChip>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
          <label className="flex w-full min-w-0 flex-col gap-2.5 sm:w-64">
            <span className="type-label text-fg-3">Sample or sensor</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="PMMA, droplet, radiometer"
              className="field-input h-8! min-h-0! rounded-[var(--radius-pill)]! py-0! pl-3.5! text-[0.8125rem]!"
            />
          </label>
          <div className="flex min-w-0 flex-col gap-2.5">
            <span aria-hidden="true" className="type-label text-fg-3">Fuel class</span>
            <Segmented label="Fuel class" size="sm" options={FUEL_OPTIONS} value={fuel} onChange={setFuel} />
          </div>
          <div className="flex flex-col gap-2.5">
            <span aria-hidden="true" className="type-label text-fg-3">View</span>
            <Segmented
              label="View"
              size="sm"
              options={[{ value: "list", label: "List" }, { value: "patches", label: "Patches" }] as const}
              value={view}
              onChange={setView}
            />
          </div>
          {/* Sort for card and patch layouts (the table sorts from its headers). */}
          <div className={cx("flex flex-wrap items-end gap-2 [&_select]:h-8", view === "list" && "lg:hidden")}>
            <label className="flex flex-col gap-2.5">
              <span className="type-label text-fg-3">Sort by</span>
              <select
                className="field-input h-8! min-h-0! w-auto! rounded-[var(--radius-pill)]! py-0! pl-3.5! text-[0.8125rem]!"
                value={sort.key}
                onChange={(e) => {
                  const key = e.target.value as SortKey;
                  setSort({ key, dir: defaultDir(key) });
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSort((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))}
              icon={<SortArrow dir={sort.dir} />}
            >
              {sort.dir === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>
          <div className="flex min-h-8 items-center gap-3 sm:ml-auto">
            <p className="type-data text-fg-2" role="status" aria-live="polite">
              Showing <span className="text-fg">{rows.length}</span> of {investigations.length} investigations
            </p>
            {filtered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHazards([]);
                  setFuel("all");
                  setQuery("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-dashed border-line-strong px-6 py-10">
          <p className="type-title text-fg">No investigation matches these filters.</p>
          <p className="text-fg-2">Hazards match any selected; the fuel class must match exactly; every word of the sample or sensor search must appear. Clear a filter to see more.</p>
        </div>
      )}

      {view === "list" && rows.length > 0 && (
        <>
          {/* Desktop: instrument table */}
          <div className="hidden lg:block">
            {/* Not a scroll container (only shown from lg, where it fits), so it is not a tab stop and the header can stick to the viewport. */}
            <div className="overflow-clip rounded-[var(--radius-lg)] border border-line bg-surface-1">
              <table className="w-full border-collapse text-left text-sm tabular-nums">
              <caption className="sr-only">NASA PSI combustion investigations covered by HALO</caption>
              <thead className="glass-chrome sticky top-[var(--nav-h)] z-[2]">
                <tr>
                  {COLUMNS.map((c) => (
                    <SortHeader key={c.label} col={c} sort={sort} onSort={onSort} />
                  ))}
                </tr>
              </thead>
              <TBody>
                {rows.map((i) => {
                  const fam = hardwareFamily(i.hardware);
                  return (
                    <Tr key={i.psiId} className="group">
                      <th scope="row" className="px-4 py-3.5 text-left align-top font-normal">
                        <Link
                          href={href(i)}
                          prefetch={false}
                          className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-fg decoration-accent-line underline-offset-4 hover:text-accent hover:underline"
                        >
                          {i.acronym}
                          <Icon name="arrowRight" size={14} className="text-fg-3 opacity-0 transition-[opacity,translate] duration-[var(--dur-fast)] group-hover:translate-x-0.5 group-hover:opacity-100" />
                        </Link>
                        <div className="mt-0.5 font-mono text-xs text-fg-3">{i.psiId}</div>
                      </th>
                      <Td className="py-3.5">
                        <FuelInline inv={i} />
                      </Td>
                      <Td className="py-3.5">
                        <div className="flex items-start gap-2.5">
                          <HardwareGlyph family={fam} size={20} className="mt-px text-fg-2" />
                          <div className="min-w-0">
                            <div className="text-[0.8125rem] font-medium text-fg">{HARDWARE_LABEL[fam]}</div>
                            {i.hardware && (
                              <div className="mt-0.5 line-clamp-1 text-xs text-fg-3" title={i.hardware}>{i.hardware}</div>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td className="py-3.5">
                        <SampleSensors inv={i} sensors={sensors[i.psiId]} />
                      </Td>
                      <Td className="py-3.5">
                        <HazardInline inv={i} />
                      </Td>
                      <Td className="py-3.5">
                        <O2Cell inv={i} cond={conditions[i.psiId]} />
                      </Td>
                      <Td numeric className="py-3.5 text-[0.8125rem]">
                        <div className="flex flex-col items-end gap-1">
                          <ConditionValue shown={shownCondition(i, conditions[i.psiId], "pressure")} unit="psia" />
                        </div>
                      </Td>
                      <Td numeric className="py-3.5 text-[0.8125rem]">{i.nRows}</Td>
                      <Td numeric className="py-3.5 text-[0.8125rem]">{i.publications.length}</Td>
                    </Tr>
                  );
                })}
              </TBody>
              </table>
            </div>
            <CoverageKey className="mt-4" />
          </div>

          {/* Phones and tablets: cards */}
          <ul className="grid gap-3 md:grid-cols-2 lg:hidden" aria-label="Investigations">
            {rows.map((i) => {
              const fam = hardwareFamily(i.hardware);
              return (
                <Card as="li" key={i.psiId} interactive padding="none" className="flex flex-col">
                  <div className="flex items-start justify-between gap-3 px-5 pt-5">
                    <div className="min-w-0">
                      <Link href={href(i)} prefetch={false} className="type-title text-fg after:z-[1]">
                        {i.acronym}
                      </Link>
                      <p className="mt-1 flex items-center gap-2 text-[0.8125rem] text-fg-2">
                        <HardwareGlyph family={fam} size={16} className="text-fg-3" />
                        {HARDWARE_LABEL[fam]}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-mono text-xs text-fg-3">{i.psiId}</span>
                  </div>
                  <div className="flex flex-col gap-2 px-5 pt-4">
                    <FuelChips inv={i} />
                    <HazardChips inv={i} />
                    <SampleSensors inv={i} sensors={sensors[i.psiId]} compact />
                  </div>
                  <div className="mt-auto px-5 pb-5 pt-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="type-label text-fg-3">O₂ coverage</span>
                      <ConditionValue shown={shownCondition(i, conditions[i.psiId], "o2")} unit="%" />
                    </div>
                    <CoverageBar range={shownCondition(i, conditions[i.psiId], "o2").range} className="mt-2" />
                    <dl className="mt-4 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-t border-line pt-4">
                      <div className="flex min-w-0 flex-col gap-1">
                        <dt className="type-label text-fg-3">Pressure</dt>
                        <dd><ConditionValue shown={shownCondition(i, conditions[i.psiId], "pressure")} unit="psia" /></dd>
                      </div>
                      {[
                        ["Rows", String(i.nRows)],
                        ["Pubs", String(i.publications.length)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex min-w-0 flex-col gap-1">
                          <dt className="type-label text-fg-3">{k}</dt>
                          <dd className="font-mono text-[0.8125rem] text-fg">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </Card>
              );
            })}
          </ul>
          <CoverageKey className="lg:hidden" />
        </>
      )}

      {view === "patches" && rows.length > 0 && (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" aria-label="Investigations">
            {rows.map((i) => {
              const fam = hardwareFamily(i.hardware);
              return (
                <Card as="li" key={i.psiId} interactive padding="sm" className="flex flex-col items-center gap-3 text-center">
                  <MissionPatch family={fam} o2Range={shownCondition(i, conditions[i.psiId], "o2").range} code={i.psiId} size={104} className="mt-1" />
                  <div className="flex min-w-0 flex-col items-center gap-1">
                    <Link href={href(i)} prefetch={false} className="text-[0.9375rem] font-semibold leading-tight text-fg after:z-[1]">
                      {i.acronym}
                    </Link>
                    <span className="text-xs text-fg-3">{HARDWARE_LABEL[fam]}</span>
                    <span className="font-mono text-xs text-fg-2">O₂ {formatRange(shownCondition(i, conditions[i.psiId], "o2").range, "%")}</span>
                  </div>
                </Card>
              );
            })}
          </ul>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-3">
            <span>Each patch: the hardware family at the core; the ring is the {O2_TRACK[0]}–{O2_TRACK[1]}% O₂ track with the tested range lit and the Moon envelope band dotted.</span>
          </p>
        </>
      )}
    </div>
  );
}

function SortArrow({ dir }: { dir: SortDir }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className={cx("transition-transform duration-[var(--dur-fast)]", dir === "desc" && "rotate-180")}>
      <path d="M6 2.5v7M3 5.5l3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortHeader({
  col,
  sort,
  onSort,
}: {
  col: (typeof COLUMNS)[number];
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
}) {
  if (!col.key) return <Th className={col.className}>{col.label}</Th>;
  const key = col.key;
  const active = sort.key === key;
  return (
    <Th
      numeric={col.numeric}
      className={col.className}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(key)}
        className={cx(
          "-mx-1.5 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-1.5 py-0.5 uppercase tracking-[inherit] transition-colors duration-[var(--dur-fast)] hover:text-fg",
          active ? "text-accent" : "text-fg-3",
        )}
      >
        {col.label}
        <span className={cx("transition-opacity", active ? "opacity-100" : "opacity-0")}>
          <SortArrow dir={active ? sort.dir : "asc"} />
        </span>
      </button>
    </Th>
  );
}

function CoverageKey({ className }: { className?: string }) {
  return (
    <p className={cx("flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-fg-3", className)}>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-1.5 w-6 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />
        Tested O₂ range on a {O2_TRACK[0]}–{O2_TRACK[1]}% track
      </span>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-3 w-6 border-x border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--accent-soft)_0_3px,transparent_3px_6px)]" />
        Moon envelope O₂ band (≥ {PRESETS.moon.o2Pct}%)
      </span>
      <span>Ranges are the min–max of each investigation’s eligible test rows. A value that was not recorded is tagged Assumed (a stated assumption, such as air at 1 atm) or Inferred; where there are no rows the design matrix is used and tagged Inferred. “No test conditions in PSI” means the dataset has no O₂ or pressure columns for it.</span>
    </p>
  );
}

