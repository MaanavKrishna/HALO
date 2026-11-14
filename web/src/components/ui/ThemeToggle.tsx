"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./Icon";
import { cx } from "./cx";
import { THEME_KEY as KEY } from "./theme";

export type ThemePref = "system" | "light" | "dark";
const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Applies a preference: light/dark set html[data-theme]; system removes it so CSS follows the OS. */
export function setTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === "system") delete root.dataset.theme;
  else root.dataset.theme = pref;
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  listeners.forEach((l) => l());
}

const OPTIONS: { value: ThemePref; label: string; icon: "system" | "sun" | "moon" }[] = [
  { value: "system", label: "System", icon: "system" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
];

/** Three-way theme switch (System / Light / Dark) as a radio group. */
export function ThemeToggle({ className, showLabels = false }: { className?: string; showLabels?: boolean }) {
  const pref = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "system" as ThemePref,
  );
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      onKeyDown={(e) => {
        const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const i = OPTIONS.findIndex((o) => o.value === pref);
        const next = OPTIONS[(i + dir + OPTIONS.length) % OPTIONS.length];
        setTheme(next.value);
        e.currentTarget.querySelector<HTMLButtonElement>(`[data-theme-option="${next.value}"]`)?.focus();
      }}
      className={cx("inline-flex rounded-[var(--radius-pill)] bg-surface-2 p-[3px] shadow-[inset_0_0_0_1px_var(--border)]", className)}
    >
      {OPTIONS.map((o) => {
        const on = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            aria-label={showLabels ? undefined : o.label}
            title={o.label}
            data-theme-option={o.value}
            onClick={() => setTheme(o.value)}
            className={cx(
              "inline-flex h-7 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] text-[0.8125rem] font-medium transition-[background-color,color,box-shadow] duration-[var(--dur-fast)]",
              showLabels ? "px-3" : "w-8",
              on ? "bg-surface-1 text-fg shadow-[var(--inner-highlight),var(--elev-1)]" : "text-fg-3 hover:text-fg",
            )}
          >
            <Icon name={o.icon} size={16} />
            {showLabels && o.label}
          </button>
        );
      })}
    </div>
  );
}
