import { cx } from "./cx";

export type Status = "ok" | "warn" | "crit" | "idle";

const TONE: Record<Status, string> = {
  ok: "text-ok",
  warn: "text-warn",
  crit: "text-crit",
  idle: "text-[var(--idle)]",
};

const DEFAULT_LABEL: Record<Status, string> = {
  ok: "Covered",
  warn: "Caution",
  crit: "Critical",
  idle: "No data",
};

/**
 * Console status lamp. Colour is never the only signal: the label is always
 * rendered (visibly, or for screen readers with `hideLabel`) and each state
 * has its own shape (ok round, warn diamond, crit square, idle hollow).
 * warn and crit are for risk only; ok means covered or measured.
 */
export function StatusLight({
  status,
  label = DEFAULT_LABEL[status],
  hideLabel = false,
  pulse = false,
  className,
}: {
  status: Status;
  label?: string;
  hideLabel?: boolean;
  /** One live element per view at most. Disabled under reduced motion. */
  pulse?: boolean;
  className?: string;
}) {
  const shape =
    status === "warn" ? "rotate-45 rounded-[1px] scale-90" : status === "crit" ? "rounded-[2px]" : "rounded-full";
  return (
    <span className={cx("inline-flex items-center gap-2", TONE[status], className)}>
      <span aria-hidden="true" className={cx("relative inline-block size-2", shape, pulse && status !== "idle" && "status-pulse")}>
        <span
          className={cx(
            "absolute inset-0",
            shape,
            status === "idle" ? "border-[1.5px] border-current" : "bg-current shadow-[0_0_8px_currentColor] print:shadow-none",
          )}
        />
      </span>
      <span className={cx("type-label", hideLabel ? "sr-only" : "text-fg-2")}>{label}</span>
    </span>
  );
}
