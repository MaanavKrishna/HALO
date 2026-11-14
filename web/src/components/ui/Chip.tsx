import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type ChipTone = "neutral" | "accent" | "ok" | "warn" | "crit";

const TONE: Record<ChipTone, string> = {
  neutral: "border-line bg-surface-2 text-fg-2",
  accent: "border-accent-line bg-accent-soft text-accent",
  ok: "border-[var(--ok-line)] bg-ok-soft text-ok",
  warn: "border-[var(--warn-line)] bg-warn-soft text-warn",
  crit: "border-[var(--crit-line)] bg-crit-soft text-crit",
};

/** Static tag. warn/crit tones are for risk only. */
export function Chip({ tone = "neutral", children, className }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] border px-2.5 text-[0.75rem] font-medium",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Toggle chip: a real checkbox inside a label, so it is announced and operated
 * as a checkbox. Works controlled (checked + onChange) or uncontrolled.
 */
export function ToggleChip({
  children,
  className,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { children: ReactNode }) {
  return (
    <label className={cx("chip text-sm", className)}>
      <input type="checkbox" {...input} />
      <span aria-hidden="true" className="chip-dot" />
      {children}
    </label>
  );
}
