"use client";

import { cx } from "@/components/ui/cx";
import { PRESETS } from "@/lib/engine/presets";

export type PresetId = keyof typeof PRESETS;

const ORDER: PresetId[] = ["iss", "artemis", "moon", "rover", "suit"];
const HINT: Partial<Record<PresetId, string>> = { artemis: "Most interesting" };

/** A tiny O2 gauge: the ring closes in proportion to the oxygen fraction. */
function O2Ring({ o2, on }: { o2: number; on: boolean }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, o2 / 100));
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" className="shrink-0 -rotate-90 overflow-visible">
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--border-strong)" strokeOpacity="0.45" strokeWidth="1.5" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={on ? "var(--accent)" : "var(--text-2)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        className="transition-[stroke] duration-[var(--dur-fast)]"
        style={on ? { filter: "drop-shadow(0 0 3px var(--accent-glow))" } : undefined}
      />
      <circle cx="12" cy="12" r="1.6" fill={on ? "var(--accent)" : "var(--text-3)"} />
    </svg>
  );
}

/**
 * Five reference atmospheres as mission cards. Each card shows the values it
 * loads, in mono, with an O2 gauge ring. A row that scrolls sideways on
 * phones and becomes five columns on desktop.
 */
export function PresetBar({ active, onSelect }: { active: PresetId | null; onSelect: (id: PresetId) => void }) {
  return (
    <div role="group" aria-labelledby="presets-title" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="presets-title" className="type-title text-fg">
          Start from a reference atmosphere
        </h2>
        <p className="type-caption hidden text-fg-3 sm:block">Ring shows the oxygen fraction</p>
      </div>
      <ul
        className={cx(
          "-mx-[var(--gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--gutter)] pb-2 pt-1 [scroll-padding-inline:var(--gutter)] [scrollbar-width:none]",
          "lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0",
        )}
      >
        {ORDER.map((id) => {
          const p = PRESETS[id];
          const on = active === id;
          return (
            <li key={id} className="flex w-[11.5rem] shrink-0 snap-start flex-col lg:w-auto">
              <button
                type="button"
                aria-pressed={on}
                data-preset={id}
                onClick={() => onSelect(id)}
                className={cx(
                  "group relative flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border p-4 text-left",
                  "transition-[background-color,border-color,box-shadow,scale] duration-[var(--dur-fast)] ease-out active:scale-[0.98]",
                  on
                    ? "border-accent bg-accent-soft shadow-[var(--inner-highlight),var(--glow-1)]"
                    : "border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)] hover:border-line-strong",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex flex-col gap-1">
                    <span className="text-[0.9375rem] font-semibold leading-tight tracking-[-0.01em] text-fg">{p.name}</span>
                    {HINT[id] && <span className="type-caption text-accent">{HINT[id]}</span>}
                  </span>
                  <O2Ring o2={p.o2Pct} on={on} />
                </span>
                <span className="mt-auto grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-line pt-3 font-mono text-[0.75rem] leading-relaxed tabular-nums">
                  <span className="text-fg-3">
                    O<sub>2</sub>
                  </span>
                  <span className="text-right text-fg">{p.o2Pct}%</span>
                  <span className="text-fg-3">P</span>
                  <span className="text-right text-fg">{p.pressurePsia} psia</span>
                  <span className="text-fg-3">Flow</span>
                  <span className="text-right text-fg">{p.flowCmS} cm/s</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
