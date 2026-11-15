import { cx } from "./cx";

const SI_HELP = "SI-generated from the cited facts; numbers come only from those facts";

/**
 * Marks text written by the SI layer. Every SI-written paragraph and summary carries the chip.
 * The explanation is part of the accessible name, so screen readers get it
 * without relying on the hover-only title. Dashed edge = generated, not measured.
 */
export function SiChip({ className = "" }: { className?: string }) {
  return (
    <span
      title={SI_HELP}
      className={cx(
        "inline-flex items-center rounded-[var(--radius-xs)] border border-dashed border-accent-line bg-accent-soft px-[0.35em] align-[0.12em] font-mono text-[0.66em] font-medium uppercase leading-[1.4] tracking-[0.08em] text-accent",
        className,
      )}
    >
      <span aria-hidden="true">SI</span>
      <span className="sr-only">{SI_HELP}</span>
    </span>
  );
}
