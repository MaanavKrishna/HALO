import type { ReactNode } from "react";
import { briefContext } from "@/lib/brief/context";
import type { Brief, Fact } from "@/lib/engine/types";

/** Superscript link to a numbered source in the citation list. */
export function CiteMark({ n }: { n: number | undefined }) {
  if (!n) return null;
  return (
    <sup className="cite-ref ml-px">
      <a href={`#cite-${n}`} aria-label={`source ${n}`} className="num font-mono text-[0.625rem] font-normal text-flame no-underline hover:underline">
        {n}
      </a>
    </sup>
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
  if (!f) return <span className="text-muted">n/a</span>;
  return (
    <span className="whitespace-nowrap">
      <span className={`num ${className}`} data-fact={f.id}>
        {String(f.value)}
        {unit ? unitText(f) : ""}
      </span>
      {cite && <CiteMark n={ctx.cite(id)} />}
    </span>
  );
}

export function Section({
  id,
  index,
  title,
  kicker,
  children,
  className = "",
}: {
  id: string;
  index: number;
  title: ReactNode;
  kicker?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`brief-section grid gap-5 border-t border-rule py-9 sm:py-11 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 ${className}`}
    >
      <header className="flex flex-col gap-2">
        <span aria-hidden="true" className="num font-mono text-xs tracking-wider text-muted">
          {String(index).padStart(2, "0")}
        </span>
        <h2 id={`${id}-title`} className="wide text-xl font-bold leading-tight text-balance">
          {title}
        </h2>
        {kicker && <p className="max-w-prose text-sm leading-relaxed text-muted">{kicker}</p>}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Small uppercase label used for key-value readouts. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-muted ${className}`}>{children}</span>;
}
