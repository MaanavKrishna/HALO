import { cx } from "./cx";

/**
 * Hairline divider. With `label`, a centred telemetry label interrupts it.
 * With `ticks`, it carries instrument tick marks, as on an axis.
 */
export function Divider({ label, ticks = false, className }: { label?: string; ticks?: boolean; className?: string }) {
  if (label) {
    return (
      <div role="separator" aria-label={label} className={cx("flex items-center gap-4", className)}>
        <span className="h-px flex-1 bg-line" />
        <span aria-hidden="true" className="type-label text-fg-3">
          {label}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
    );
  }
  return (
    <hr
      className={cx(
        "h-px border-0 bg-line",
        ticks &&
          "h-2 bg-[linear-gradient(var(--border),var(--border))_0_0/100%_1px_no-repeat,repeating-linear-gradient(90deg,var(--border-strong)_0_1px,transparent_1px_40px)_0_0/100%_6px_no-repeat]",
        className,
      )}
    />
  );
}

/**
 * Instrument grid backdrop: fine grid plus optional crosshair axes and corner
 * marks. Decorative (aria-hidden); place inside a `relative` parent. Fades at
 * the edges so it never ends in a hard line.
 */
export function GridLines({ axes = false, corners = false, className }: { axes?: boolean; corners?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
      {axes && (
        <>
          <div className="absolute inset-y-0 left-1/2 w-px bg-[linear-gradient(transparent,var(--accent-line),transparent)] opacity-60" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-[linear-gradient(90deg,transparent,var(--accent-line),transparent)] opacity-60" />
        </>
      )}
      {corners &&
        (["left-4 top-4 border-l border-t", "right-4 top-4 border-r border-t", "bottom-4 left-4 border-b border-l", "bottom-4 right-4 border-b border-r"] as const).map(
          (c) => <span key={c} className={cx("absolute size-3 border-line-strong", c)} />,
        )}
    </div>
  );
}
