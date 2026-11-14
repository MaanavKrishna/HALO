"use client";

import { useId, useState } from "react";
import { StatusLight } from "@/components/ui/StatusLight";
import { cx } from "@/components/ui/cx";

export type ComboKey = "scatter" | "scatter-ionization";

export interface DetectorRow {
  material: string;
  /** null: SAME has no runs for this material ("no SAME data", never 0%). */
  combos: Record<ComboKey, { caught: number; runs: number; cite: number | null } | null>;
}

const COMBO_LABEL: Record<ComboKey, string> = {
  scatter: "Scatter only (ISS-style)",
  "scatter-ionization": "Scatter + ionization",
};
const OPTIONS = (Object.keys(COMBO_LABEL) as ComboKey[]).map((k) => ({ value: k, label: COMBO_LABEL[k] }));
const SCALE = Array.from({ length: 11 }, (_, i) => i / 10);

/**
 * Share of SAME smoke runs the detector set would have caught, per material,
 * drawn as instrument meters. The toggle is a what-if: add an ionization
 * channel to the ISS-style scatter detector. Counts read "x of y runs"; a
 * material without SAME runs says so.
 */
export function DetectorBars({ rows, initial }: { rows: DetectorRow[]; initial: ComboKey }) {
  const [combo, setCombo] = useState<ComboKey>(initial);

  return (
    <div className="detector-bars">
      <div className="no-print mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="type-label text-fg-3" aria-hidden="true">
          Sensor what-if
        </span>
        <ComboSwitch value={combo} onChange={setCombo} />
      </div>
      <p className="print-only mb-3 hidden text-sm text-fg-2">Showing: {COMBO_LABEL[combo]}</p>

      <ul className="flex flex-col gap-6" aria-live="polite" data-detector={combo}>
        {rows.map((r) => {
          const c = r.combos[combo];
          if (!c) {
            return (
              <li key={r.material} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-semibold text-fg">{r.material}</span>
                  <StatusLight status="idle" label="No SAME data" />
                </div>
                <div className="hatch-idle h-2.5 rounded-full opacity-50" aria-hidden="true" />
                <p className="text-sm text-fg-2">No SAME data: SAME burned no analog of this material.</p>
              </li>
            );
          }
          const share = c.caught / c.runs;
          const miss = share < 0.5;
          return (
            <li key={r.material} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-semibold text-fg">{r.material}</span>
                <span className="text-sm text-fg-2">
                  <span className="num font-mono text-[1.375rem] leading-none tracking-[-0.03em] text-fg">{c.caught}</span>
                  <span className="num font-mono text-fg-3"> / </span>
                  <span className="sr-only"> of </span>
                  <span className="num font-mono text-fg-2">{c.runs}</span>
                  <span className="sr-only"> runs caught</span>
                  {c.cite && (
                    <>
                      {"\u2009"}
                      <a href={`#cite-${c.cite}`} aria-label={`source ${c.cite}`} className="num font-mono text-[0.75rem] text-accent hover:underline">
                        [{c.cite}]
                      </a>
                    </>
                  )}
                </span>
              </div>
              <div className="relative pb-3" aria-hidden="true">
                <div className={cx("relative h-2.5 overflow-hidden rounded-full", miss ? "bg-warn-soft" : "bg-surface-2")}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-accent shadow-[inset_0_1px_0_var(--fill-highlight)] transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-out)]"
                    style={{ width: `${share * 100}%` }}
                  />
                  <div
                    className={cx("absolute inset-y-0 right-0 transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-out)]", miss ? "hatch-warn opacity-70" : "hatch-idle opacity-60")}
                    style={{ width: `${(1 - share) * 100}%` }}
                  />
                </div>
                {/* scale ticks every tenth, the half mark taller */}
                {SCALE.map((t) => (
                  <span
                    key={t}
                    className={cx("absolute top-3 w-px bg-line-strong", t === 0.5 ? "h-2.5 opacity-100" : "h-1 opacity-50")}
                    style={{ left: `calc(${t * 100}% - ${t === 1 ? 1 : 0}px)` }}
                  />
                ))}
                <span className="absolute -top-1 left-1/2 h-4.5 w-px bg-fg" />
              </div>
              <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span className="text-fg-2">
                  <span className="num">{c.caught}</span> of <span className="num">{c.runs}</span> runs caught
                </span>
                {miss ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-crit">
                    <StatusLight status="crit" label="Critical" hideLabel />
                    would likely miss
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-fg-2">
                    <StatusLight status="ok" label="Covered" hideLabel />
                    caught in most runs
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.8125rem] text-fg-2" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-accent" /> caught
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="hatch-warn inline-block h-2 w-4 rounded-full bg-warn-soft" /> missed (below alarm level)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-px bg-fg" /> half of runs
        </span>
      </p>
    </div>
  );
}

/**
 * The kit's segmented capsule (same tokens, sliding thumb, native radios),
 * with each radio covering its whole label so it is hit directly by pointer
 * and by test drivers (the kit version visually hides the input).
 */
function ComboSwitch({ value, onChange }: { value: ComboKey; onChange: (v: ComboKey) => void }) {
  const name = useId();
  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === value));
  return (
    <fieldset className="inline-flex max-w-full">
      <legend className="sr-only">Sensor what-if</legend>
      <div
        className="relative grid auto-cols-fr grid-flow-col rounded-[var(--radius-pill)] bg-surface-2 p-[3px] shadow-[inset_0_0_0_1px_var(--border)] max-[23rem]:grid-flow-row max-[23rem]:rounded-[var(--radius-lg)]"
        style={{ ["--n" as string]: OPTIONS.length, ["--i" as string]: index }}
      >
        {/* Side by side; stacked on the narrowest phones, where three labels cannot fit one row. */}
        <span
          aria-hidden="true"
          className="absolute left-[3px] top-[3px] h-[calc(100%-6px)] w-[calc((100%-6px)/var(--n))] translate-x-[calc(var(--i)*100%)] rounded-[var(--radius-pill)] bg-surface-1 shadow-[0_0_0_1px_var(--border-strong),var(--inner-highlight),var(--elev-2)] transition-[translate] duration-[var(--spring-dur-snappy)] ease-[var(--spring)] max-[23rem]:h-[calc((100%-6px)/var(--n))] max-[23rem]:w-[calc(100%-6px)] max-[23rem]:translate-x-0 max-[23rem]:translate-y-[calc(var(--i)*100%)] max-[23rem]:rounded-[var(--radius-md)]"
        />
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={cx(
              "relative z-[1] flex h-8 items-center justify-center whitespace-nowrap rounded-[var(--radius-pill)] px-3 text-[0.8125rem] font-medium transition-colors duration-[var(--dur-fast)] pointer-coarse:h-10 sm:px-4",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--focus)]",
              o.value === value ? "text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-[inherit] opacity-0"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
