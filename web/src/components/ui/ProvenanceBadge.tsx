import type { Provenance } from "@/lib/engine/types";
import { SiChip } from "./SiChip";
import { cx } from "./cx";

/**
 * Where a number came from. The marker shape encodes provenance so it still
 * reads in greyscale print (filled dot, half dot, hollow dot, square, dashed
 * diamond); the text label is always shown and the help text is in the
 * accessible name (the title is a hover-only extra). Measured uses the ok
 * green: it is the one provenance that counts as "covered".
 */
const META: Record<Exclude<Provenance, "si">, { label: string; help: string; marker: string }> = {
  measured: { label: "Measured", help: "Recorded by the experiment", marker: "rounded-full border-ok bg-ok shadow-[0_0_6px_var(--ok-line)]" },
  inferred: {
    label: "Inferred",
    help: "Derived from test documentation, not a logged channel",
    marker: "rounded-full border-accent bg-[linear-gradient(90deg,var(--accent)_50%,transparent_50%)]",
  },
  assumed: { label: "Assumed", help: "Not recorded; a stated assumption", marker: "rounded-full border-fg-3" },
  literature: { label: "Literature", help: "Taken from a published paper", marker: "rounded-[1px] border-fg-2" },
  model: { label: "Model", help: "Computed by a fitted model", marker: "rotate-45 rounded-[1px] border-dashed border-fg-2" },
};

export function ProvenanceBadge({ provenance, className = "" }: { provenance: Provenance; className?: string }) {
  if (provenance === "si") return <SiChip className={className} />;
  const m = META[provenance];
  return (
    <span title={m.help} className={cx("inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[0.75rem] tracking-[0.01em] text-fg-2", className)}>
      <span aria-hidden="true" className={cx("inline-block size-2 border-[1.5px]", m.marker)} />
      {m.label}
      <span className="sr-only"> ({m.help})</span>
    </span>
  );
}
