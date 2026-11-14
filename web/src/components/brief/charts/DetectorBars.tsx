"use client";

import { useId, useState } from "react";

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

/**
 * Share of SAME smoke runs the detector set would have caught, per material.
 * The toggle is a what-if: add an ionization channel to the ISS-style scatter
 * detector. Counts read "x of y runs"; a material without SAME runs says so.
 */
export function DetectorBars({ rows, initial }: { rows: DetectorRow[]; initial: ComboKey }) {
  const [combo, setCombo] = useState<ComboKey>(initial);
  const uid = useId();

  return (
    <div className="detector-bars">
      <fieldset className="no-print mb-4">
        <legend className="mb-2 text-sm font-medium">Sensor what-if</legend>
        <div className="inline-flex rounded-md border border-rule-strong bg-surface p-0.5" role="radiogroup">
          {(Object.keys(COMBO_LABEL) as ComboKey[]).map((k) => (
            <label
              key={k}
              className={`relative cursor-pointer rounded-[5px] px-3 py-1.5 text-sm transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
                combo === k ? "bg-flame font-semibold text-flame-ink" : "text-muted hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name={`${uid}-combo`}
                value={k}
                checked={combo === k}
                onChange={() => setCombo(k)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {COMBO_LABEL[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="print-only mb-3 hidden text-sm text-muted">Showing: {COMBO_LABEL[combo]}</p>

      <ul className="flex flex-col gap-4" aria-live="polite" data-detector={combo}>
        {rows.map((r) => {
          const c = r.combos[combo];
          if (!c) {
            return (
              <li key={r.material} className="grid gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                <span className="text-sm font-medium">{r.material}</span>
                <span className="text-sm text-muted">No SAME data: SAME burned no analog of this material.</span>
              </li>
            );
          }
          const share = c.caught / c.runs;
          const miss = share < 0.5;
          return (
            <li key={r.material} className="grid gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-4">
              <span className="text-sm font-medium">{r.material}</span>
              <div className="min-w-0">
                <div className="relative h-3.5 overflow-hidden rounded-sm bg-amber-soft" aria-hidden="true">
                  <div
                    className="absolute inset-y-0 left-0 bg-flame transition-[width] duration-300 ease-out"
                    style={{ width: `${share * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,var(--amber)_0_1.5px,transparent_1.5px_5px)] opacity-60"
                    style={{ width: `${(1 - share) * 100}%` }}
                  />
                  <div className="absolute inset-y-[-2px] left-1/2 w-px bg-ink" />
                </div>
                <p className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span>
                    <span className="num font-semibold">{c.caught}</span> of <span className="num">{c.runs}</span> runs caught
                    {c.cite && (
                      <sup className="ml-px">
                        <a href={`#cite-${c.cite}`} aria-label={`source ${c.cite}`} className="num font-mono text-[0.68em] text-flame">
                          {c.cite}
                        </a>
                      </sup>
                    )}
                  </span>
                  {miss ? (
                    <span className="font-semibold text-amber">would likely miss</span>
                  ) : (
                    <span className="text-muted">caught in most runs</span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-[2px] bg-flame" /> caught
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-[2px] bg-amber-soft bg-[repeating-linear-gradient(135deg,var(--amber)_0_1.5px,transparent_1.5px_5px)]" />{" "}
          missed (below alarm level)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-px bg-ink" /> half of runs
        </span>
      </p>
    </div>
  );
}
