import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/**
 * Telemetry label: the instrument-panel caption. Use it to carry data the
 * reader needs (a code, a count, a unit, a status), not as decoration above
 * every heading.
 */
export function Eyebrow({ children, className, tone = "default" }: { children: ReactNode; className?: string; tone?: "default" | "accent" }) {
  return (
    <p className={cx("type-label flex items-center gap-2", tone === "accent" ? "text-accent" : "text-fg-3", className)}>
      <span aria-hidden="true" className={cx("h-px w-4", tone === "accent" ? "bg-accent" : "bg-line-strong")} />
      {children}
    </p>
  );
}

type HeadingLevel = "h1" | "h2" | "h3";

/** Section heading: optional telemetry eyebrow, a display heading, an optional lede and an action slot on the right. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  as: H = "h2",
  size = "m",
  actions,
  id,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  as?: HeadingLevel;
  size?: "l" | "m" | "s";
  actions?: ReactNode;
  id?: string;
  className?: string;
}) {
  const titleClass = size === "l" ? "type-display-m" : size === "m" ? "type-headline" : "type-title";
  return (
    <header className={cx("flex flex-wrap items-end justify-between gap-x-8 gap-y-4", className)}>
      <div className="flex max-w-3xl flex-col gap-3">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <H id={id} className={cx(titleClass, "text-fg")}>
          {title}
        </H>
        {lede && <p className="type-body-l max-w-[60ch] text-fg-2">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Instrument panel: a labelled region with a hairline header strip, like a
 * console module. The label is the region's accessible name.
 */
export function Panel({
  label,
  meta,
  children,
  className,
  bodyClassName,
  ...rest
}: Omit<HTMLAttributes<HTMLElement>, "title"> & { label: string; meta?: ReactNode; bodyClassName?: string }) {
  return (
    <section
      aria-label={label}
      className={cx("overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]", className)}
      {...rest}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 sm:px-5">
        <span className="type-label text-fg-3">{label}</span>
        {meta && <span className="type-label text-fg-3">{meta}</span>}
      </div>
      <div className={cx("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
