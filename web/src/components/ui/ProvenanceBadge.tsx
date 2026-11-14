import type { Provenance } from "@/lib/engine/types";
import { SiChip } from "./SiChip";

/**
 * Where a number came from. The marker shape encodes provenance so it still
 * reads in greyscale print; the text label is always shown.
 */
const META: Record<Exclude<Provenance, "si">, { label: string; help: string; marker: string }> = {
  measured: { label: "Measured", help: "Recorded by the experiment", marker: "rounded-full bg-flame border-flame" },
  inferred: {
    label: "Inferred",
    help: "Derived from test documentation, not a logged channel",
    marker: "rounded-full border-flame bg-[linear-gradient(90deg,var(--flame)_50%,transparent_50%)]",
  },
  assumed: { label: "Assumed", help: "Not recorded; a stated assumption", marker: "rounded-full border-muted" },
  literature: { label: "Literature", help: "Taken from a published paper", marker: "rounded-[1px] border-ink" },
  model: { label: "Model", help: "Computed by a fitted model", marker: "rotate-45 rounded-[1px] border-ink border-dashed" },
};

export function ProvenanceBadge({ provenance, className = "" }: { provenance: Provenance; className?: string }) {
  if (provenance === "si") return <SiChip className={className} />;
  const m = META[provenance];
  return (
    <span
      title={m.help}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted ${className}`}
    >
      <span aria-hidden="true" className={`inline-block size-2 border-[1.5px] ${m.marker}`} />
      {m.label}
    </span>
  );
}
