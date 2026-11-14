import { Children, type ReactNode } from "react";
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
    <div className={cx("@container flex min-w-0 flex-col gap-2", className)}>
      <dt className="type-label order-1 text-fg-3 hyphens-auto @max-[8.5rem]:tracking-[0.06em]">{label}</dt>
      <dd className="order-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-fg">
        {/* The readout scales with its cell (container units), so long values fit a narrow cell. */}
        <span
          className={cx(size === "lg" ? "type-data-l" : "font-mono leading-none tracking-[-0.04em] tabular-nums")}
          style={{ fontSize: size === "lg" ? "min(var(--fs-data-l), 24cqi)" : "clamp(1.375rem, 19cqi, 2rem)" }}
        >
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

/**
 * Wraps Stats in a <dl> grid with hairline dividers between readouts. Two
 * columns on phones; from sm, three or four readouts sit in one row (no
 * orphan cell), other counts auto-fit.
 */
export function StatGroup({ children, className }: { children: ReactNode; className?: string }) {
  const n = Children.count(children);
  const wide = n === 4 ? "sm:grid-cols-4" : n === 3 ? "sm:grid-cols-3" : "sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]";
  return (
    <dl
      className={cx(
        "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line [&>div]:bg-surface-1 [&>div]:p-4 sm:[&>div]:p-5",
        wide,
        className,
      )}
    >
      {children}
    </dl>
  );
}
