import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { cx } from "./cx";

export type CalloutTone = "info" | "warn" | "crit";

const TONE: Record<CalloutTone, { box: string; icon: "info" | "warn" | "crit"; role?: "note" | "alert"; prefix: string }> = {
  info: { box: "border-accent-line bg-accent-soft [--c:var(--accent)]", icon: "info", role: "note", prefix: "Note" },
  warn: { box: "border-[var(--warn-line)] bg-warn-soft [--c:var(--warn)]", icon: "warn", role: "note", prefix: "Caution" },
  crit: { box: "border-[var(--crit-line)] bg-crit-soft [--c:var(--crit)]", icon: "crit", role: "note", prefix: "Critical" },
};

/**
 * Inline message block. info for context; warn and crit for risk findings
 * only. The icon shape and a screen-reader prefix carry the tone, not colour
 * alone. Pass live="polite" when it appears in response to an action.
 */
export function Callout({
  tone = "info",
  title,
  children,
  className,
  live,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  live?: "polite" | "assertive";
}) {
  const t = TONE[tone];
  return (
    <div
      role={live ? "status" : t.role}
      aria-live={live}
      className={cx("flex gap-3 rounded-[var(--radius-md)] border px-4 py-3.5", t.box, className)}
    >
      <Icon name={t.icon} size={20} className="mt-px shrink-0 text-[var(--c)]" />
      <div className="flex min-w-0 flex-col gap-1 text-[0.9375rem] leading-snug">
        <span className="sr-only">{t.prefix}: </span>
        {title && <p className="font-semibold text-fg">{title}</p>}
        <div className="text-fg-2">{children}</div>
      </div>
    </div>
  );
}
