import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

export interface LinkChip {
  key: string;
  label: ReactNode;
  /** Accessible name when it differs from the visible label. */
  ariaLabel?: string;
  /** Null renders a non-interactive chip (the action is unavailable). */
  href: string | null;
  selected: boolean;
  detail?: ReactNode;
}

const BASE =
  "inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-pill)] border px-3.5 text-[0.8125rem] font-medium transition-[background-color,border-color,color,scale] duration-[var(--dur-fast)] ease-out pointer-coarse:min-h-10";

/**
 * Selection as plain links, so it works without JavaScript: each chip is a
 * link to the URL with that option chosen. Selected chips carry aria-current.
 */
export function LinkChips({ label, chips, multi = false, className }: { label: string; chips: LinkChip[]; multi?: boolean; className?: string }) {
  return (
    <ul aria-label={label} className={cx("flex flex-wrap gap-2", className)}>
      {chips.map((c) => {
        const inner = (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
              {c.selected ? (
                multi ? (
                  <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <circle cx="6" cy="6" r="3.2" fill="currentColor" />
                )
              ) : multi ? (
                <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              ) : (
                <circle cx="6" cy="6" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
              )}
            </svg>
            <span>{c.label}</span>
            {c.detail && <span className="font-mono text-[0.6875rem] font-normal text-fg-3">{c.detail}</span>}
          </>
        );
        return (
          <li key={c.key}>
            {c.href ? (
              <Link
                href={c.href}
                prefetch={false}
                scroll={false}
                aria-label={c.ariaLabel}
                aria-current={c.selected ? "true" : undefined}
                className={cx(
                  BASE,
                  "active:scale-[0.97]",
                  c.selected
                    ? "border-accent-line bg-accent-soft text-accent hover:border-accent"
                    : "border-line bg-surface-1 text-fg-2 hover:border-line-strong hover:text-fg",
                )}
              >
                {inner}
              </Link>
            ) : (
              <span
                aria-current={c.selected ? "true" : undefined}
                className={cx(BASE, c.selected ? "border-accent-line bg-accent-soft text-accent" : "border-dashed border-line text-fg-3")}
              >
                {inner}
                {c.ariaLabel && <span className="sr-only"> ({c.ariaLabel})</span>}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
