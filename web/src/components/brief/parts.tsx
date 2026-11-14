import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { briefContext } from "@/lib/brief/context";
import { factText, type Brief, type Fact } from "@/lib/engine/types";

/**
 * Link to a numbered source in the citation list, as a mono "[n]" on the
 * baseline (a thin space before it), so it never reads as an exponent after a
 * number or unit.
 */
export function CiteMark({ n }: { n: number | undefined }) {
  if (!n) return null;
  return (
    <span className="cite-ref whitespace-nowrap">
      {"\u2009"}
      <a
        href={`#cite-${n}`}
        aria-label={`source ${n}`}
        className="num rounded-[2px] font-mono text-[0.72em] font-normal tracking-normal text-accent no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]"
      >
        [{n}]
      </a>
    </span>
  );
}

export function unitText(f: Fact): string {
  if (!f.unit) return "";
  return f.unit.startsWith("%") ? f.unit : ` ${f.unit}`;
}

/**
 * Renders one Fact value (with its unit and citation mark). The page never
 * prints a number that does not come through here or through engine text.
 */
export function Num({
  brief,
  id,
  unit = true,
  cite = true,
  className = "",
}: {
  brief: Brief;
  id: string;
  unit?: boolean;
  cite?: boolean;
  className?: string;
}) {
  const ctx = briefContext(brief);
  const f = ctx.fact(id);
  if (!f) return <span className="text-fg-3">n/a</span>;
  return (
    <span className="whitespace-nowrap">
      <span className={`num ${className}`} data-fact={f.id}>
        {factText(f)}
        {unit ? unitText(f) : ""}
      </span>
      {cite && <CiteMark n={ctx.cite(id)} />}
    </span>
  );
}

/**
 * A cited fact as a chip: its value (mono), its source number, and its label
 * as the accessible name. Links to the numbered source.
 */
export function FactChip({ brief, id }: { brief: Brief; id: string }) {
  const ctx = briefContext(brief);
  const f = ctx.fact(id);
  if (!f) return null;
  const n = ctx.cite(id);
  const value = `${factText(f)}${unitText(f)}`;
  const body = (
    <>
      <span className="sr-only">{f.label}: </span>
      <span className="num font-mono text-fg">{value}</span>
      {n && (
        <span aria-hidden="true" className="num font-mono text-fg-3">
          [{n}]
        </span>
      )}
    </>
  );
  const cls =
    "fact-chip inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] border border-line bg-surface-1 px-2.5 text-[0.75rem] transition-[border-color,background-color] duration-[var(--dur-fast)]";
  return n ? (
    <a href={`#cite-${n}`} title={f.label} data-fact={f.id} className={cx(cls, "hover:border-accent-line hover:bg-accent-soft")}>
      {body}
      {n && <span className="sr-only">, source {n}</span>}
    </a>
  ) : (
    <span title={f.label} data-fact={f.id} className={cls}>
      {body}
    </span>
  );
}

/**
 * One brief section: a heading column (sticky on desktop) beside the content.
 * The heading carries the section; there is no eyebrow over it.
 */
export function Section({
  id,
  title,
  kicker,
  meta,
  children,
  className = "",
}: {
  id: string;
  /** Kept for callers; sections are not numbered on screen. */
  index?: number;
  title: ReactNode;
  kicker?: ReactNode;
  /** Small instrument readout under the lede (a count, a status). */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cx(
        "brief-section grid gap-6 border-t border-line py-14 sm:py-16 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14 lg:py-20",
        className,
      )}
    >
      <header className="brief-section-head flex flex-col gap-3 lg:sticky lg:top-[calc(var(--nav-h)+var(--brief-bar-h)+1.5rem)] lg:self-start">
        <h2 id={`${id}-title`} className="type-headline text-balance text-fg">
          {title}
        </h2>
        {kicker && <p className="type-body-s max-w-[52ch] text-pretty text-fg-2">{kicker}</p>}
        {meta && <div className="pt-1">{meta}</div>}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Instrument caption for a key-value readout or a sub-block. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={cx("type-label text-fg-3", className)}>{children}</span>;
}

/** A sub-heading inside a section. */
export function SubHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={cx("type-title text-fg", className)}>{children}</h3>;
}
