"use client";

import { useId, useMemo, useState } from "react";
import { SiChip } from "@/components/ui/SiChip";
import type { RankWeights } from "@/lib/engine/types";

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
}

/** Rows printed on paper; the rest are named as "more in the online brief". */
const PRINT_SHOWN = 5;

const KEYS: Array<{ k: keyof RankWeights; label: string; help: string }> = [
  { k: "proximity", label: "Closeness", help: "How near its tests sit to your atmosphere" },
  { k: "fuel", label: "Fuel match", help: "Its fuels match your materials, liquids or detectors" },
  { k: "hazard", label: "Hazards", help: "Spread, extinction, detection and toxicity covered" },
  { k: "richness", label: "Evidence size", help: "Rows and publications" },
];

const score = (p: RankWeights, w: RankWeights) => w.proximity * p.proximity + w.fuel * p.fuel + w.hazard * p.hazard + w.richness * p.richness;

/**
 * Ranked investigations with an optional re-weighting. The score is a
 * weighted sum of four parts the engine already computed, so re-ranking in
 * the browser gives the same order the engine would.
 */
export function RankedListClient({ items, shown, defaults }: { items: RankedItem[]; shown: number; defaults: RankWeights }) {
  const [w, setW] = useState<RankWeights>(defaults);
  const uid = useId();
  const custom = KEYS.some(({ k }) => w[k] !== defaults[k]);

  const ranked = useMemo(() => {
    const scored = items.map((it) => ({ it, s: score(it.parts, w) }));
    scored.sort((a, b) => b.s - a.s || (a.it.psiId < b.it.psiId ? -1 : a.it.psiId > b.it.psiId ? 1 : 0));
    return scored.slice(0, shown);
  }, [items, w, shown]);
  const max = Math.max(1e-9, ...ranked.map((r) => r.s));

  return (
    <div>
      <details className="weights no-print mb-5 rounded-md border border-rule bg-surface">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">
          Adjust ranking weights{custom && <span className="ml-2 text-xs font-normal text-flame">custom</span>}
        </summary>
        <div className="grid gap-4 border-t border-rule px-4 py-4 sm:grid-cols-2">
          {KEYS.map(({ k, label, help }) => (
            <div key={k} className="flex flex-col gap-1">
              <label htmlFor={`${uid}-${k}`} className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="num font-mono text-xs text-muted">{w[k].toFixed(2)}</span>
              </label>
              <input
                id={`${uid}-${k}`}
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={w[k]}
                aria-describedby={`${uid}-${k}-h`}
                onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
              />
              <span id={`${uid}-${k}-h`} className="text-xs text-muted">
                {help}
              </span>
            </div>
          ))}
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => setW(defaults)}
              disabled={!custom}
              className="rounded-sm border border-rule-strong px-3 py-1.5 text-sm enabled:hover:border-ink disabled:opacity-50"
            >
              Reset to default weights
            </button>
          </div>
        </div>
      </details>

      <ol className="flex flex-col" data-ranked>
        {ranked.map(({ it, s }, i) => (
          <li key={it.psiId} className={`ranked-item ${i >= PRINT_SHOWN ? "print-hide" : ""} grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-rule py-4 first:pt-0 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)]`}>
            <span aria-hidden="true" className="num pt-0.5 font-mono text-sm text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="grid grid-cols-[minmax(0,1fr)_4rem] items-baseline gap-x-4 sm:grid-cols-[minmax(0,1fr)_5rem]">
                <h3 className="font-semibold leading-snug">
                  {it.acronym}
                  <span className="ml-2 font-normal text-muted">{it.title !== it.acronym ? it.title : ""}</span>
                </h3>
                <span aria-hidden="true" className="relevance-meter mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-rule">
                  <span className="block h-full rounded-full bg-flame" style={{ width: `${(s / max) * 100}%` }} />
                </span>
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {it.why.map((y) => (
                  <li key={y} className="rounded-sm bg-flame-soft px-1.5 py-0.5 text-xs text-ink">
                    {y}
                  </li>
                ))}
              </ul>
              <p className="print-clamp mt-2 max-w-prose text-sm leading-relaxed text-muted">
                {it.textIsSi && <SiChip className="mr-1.5" />}
                {it.text}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {it.datasetUrl ? (
                  <a href={it.datasetUrl} className="text-flame underline-offset-2 hover:underline" rel="noreferrer">
                    Dataset {it.psiId} · doi:{it.datasetDoi}
                  </a>
                ) : (
                  <span>Dataset {it.psiId}</span>
                )}
                {it.cite && (
                  <a href={`#cite-${it.cite}`} className="text-muted hover:underline" aria-label={`source ${it.cite}`}>
                    [{it.cite}]
                  </a>
                )}
                {it.papers.map((p) =>
                  p.url ? (
                    <a key={p.url} href={p.url} title={p.title} className="paper-link max-w-[16rem] truncate text-muted underline-offset-2 hover:text-ink hover:underline" rel="noreferrer">
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
      {ranked.length > PRINT_SHOWN && (
        <p className="print-only mt-2 hidden text-sm text-muted">
          <span className="num">{ranked.length - PRINT_SHOWN}</span> more in the online brief.
        </p>
      )}
    </div>
  );
}
