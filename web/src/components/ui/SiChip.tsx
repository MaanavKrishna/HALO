const SI_HELP = "SI-generated from the cited facts; numbers come only from those facts";

/**
 * Marks a sentence written by the SI layer. Every SI sentence shows one.
 * The explanation is part of the accessible name, so screen readers get it
 * without relying on the hover-only title.
 */
export function SiChip({ className = "" }: { className?: string }) {
  return (
    <span
      title={SI_HELP}
      className={`inline-flex items-center rounded-sm border border-dashed border-flame px-1 align-[0.1em] font-mono text-[0.68em] font-medium leading-[1.35] text-flame ${className}`}
    >
      <span aria-hidden="true">SI</span>
      <span className="sr-only">{SI_HELP}</span>
    </span>
  );
}
