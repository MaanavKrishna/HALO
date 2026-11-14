"use client";

import { PRESETS } from "@/lib/engine/presets";

export type PresetId = keyof typeof PRESETS;

const ORDER: PresetId[] = ["iss", "artemis", "moon", "rover", "suit"];
const HINT: Partial<Record<PresetId, string>> = { artemis: "most interesting" };

/** Five reference atmospheres. Each button shows the values it loads. */
export function PresetBar({ active, onSelect }: { active: PresetId | null; onSelect: (id: PresetId) => void }) {
  return (
    <div role="group" aria-labelledby="presets-title">
      <h2 id="presets-title" className="text-sm font-semibold">
        Start from a reference atmosphere
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ORDER.map((id) => {
          const p = PRESETS[id];
          const on = active === id;
          return (
            <li key={id} className="flex flex-col">
              <button
                type="button"
                aria-pressed={on}
                data-preset={id}
                onClick={() => onSelect(id)}
                className={`group flex h-full flex-col items-start gap-1.5 rounded-md border px-3 py-2.5 text-left transition-[background-color,border-color] duration-150 ${
                  on
                    ? "border-flame bg-flame-soft"
                    : "border-rule bg-surface hover:border-rule-strong"
                }`}
              >
                <span className="text-[15px] font-semibold leading-tight">{p.name}</span>
                <span className="num font-mono text-xs leading-snug text-muted">
                  {p.o2Pct}% O<sub>2</sub> · {p.pressurePsia} psia
                  <br />
                  {p.flowCmS} cm/s flow
                </span>
              </button>
              {HINT[id] && <span className="mt-1 pl-1 text-xs text-flame">{HINT[id]}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
