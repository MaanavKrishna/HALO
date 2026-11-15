import type { ReactNode } from "react";
import { ProvenanceBadge, cx } from "@/components/ui";
import { GRADE_RINGS } from "@/lib/engine/grade";
import type { ConditionSource } from "@/lib/engine/types";

export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx("text-accent decoration-accent-line underline underline-offset-4 hover:decoration-current", className)}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function SectionHead({ id, title, aside, lede }: { id: string; title: string; aside?: ReactNode; lede?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="type-headline text-fg">
          {title}
        </h2>
        {aside && <span className="type-label text-fg-3">{aside}</span>}
      </div>
      {lede && <p className="max-w-[68ch] text-fg-2">{lede}</p>}
    </div>
  );
}

/** A condition value with its source marker (measured, inferred or assumed). */
export function Cond({ value, src }: { value: number; src: ConditionSource }) {
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="font-mono text-fg">{Number(value.toFixed(2))}</span>
      {src !== "measured" && <ProvenanceBadge provenance={src} className="text-[0.6875rem]" />}
    </span>
  );
}

/** Which halo ring a distance falls in, worded as the brief words coverage (never as a verdict). */
export function ringText(d: number): string {
  const [b, c, dd] = GRADE_RINGS;
  if (d <= b) return `within ${b}: what the brief counts as near`;
  if (d <= c) return `between ${b} and ${c}: the second ring`;
  if (d <= dd) return `between ${c} and ${dd}: the outer ring`;
  return `beyond ${dd}: outside every ring, an extrapolation`;
}

export function signed(x: number, digits = 1): string {
  const v = Number(x.toFixed(digits));
  return `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v)}`;
}
