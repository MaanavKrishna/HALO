import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Instrument readout: a big mono number, its unit, a label, and a slot for
 * provenance (a ProvenanceBadge) or a StatusLight. Use for numbers a reader
 * compares; never as decoration.
 */
export function Stat({
  value,
  unit,
  label,
  provenance,
  detail,
  size = "md",
  className,
}: {
  value: ReactNode;
  unit?: ReactNode;
  label: ReactNode;
  provenance?: ReactNode;
  detail?: ReactNode;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <dt className="type-label order-1 text-fg-3">{label}</dt>
      <dd className="order-2 flex items-baseline gap-1.5 text-fg">
        <span className={cx(size === "lg" ? "type-data-l" : "font-mono text-[2rem] leading-none tracking-[-0.04em] tabular-nums")}>
          {value}
        </span>
        {unit && <span className={cx("font-mono text-fg-2", size === "lg" ? "text-lg" : "text-sm")}>{unit}</span>}
      </dd>
      {(provenance || detail) && (
        <dd className="order-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-2">
          {provenance}
          {detail && <span>{detail}</span>}
        </dd>
      )}
    </div>
  );
}

/** Wraps Stats in a <dl> grid with hairline dividers between readouts. */
export function StatGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl
      className={cx(
        "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] [&>div]:bg-surface-1 [&>div]:p-5",
        className,
      )}
    >
      {children}
    </dl>
  );
}
