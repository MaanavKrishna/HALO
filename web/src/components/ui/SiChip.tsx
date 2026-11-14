/** Marks a sentence written by the SI layer. Every SI sentence shows one. */
export function SiChip({ className = "" }: { className?: string }) {
  return (
    <span
      title="Written by an LLM from the cited facts; numbers come only from those facts"
      className={`inline-flex items-center rounded-sm border border-dashed border-flame px-1 align-[0.1em] font-mono text-[0.68em] font-medium leading-[1.35] text-flame ${className}`}
    >
      SI
    </span>
  );
}
