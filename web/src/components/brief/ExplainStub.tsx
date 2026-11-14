import { fallbackNarrative } from "@/lib/brief/narrative";
import type { Brief } from "@/lib/engine/types";
import { Section } from "./parts";

/**
 * Placeholder for the SI explanation panel. It shows a deterministic summary
 * built only from the brief's grade and flags (no SI text, so no SI chip).
 */
export function ExplainPanel({ brief }: { brief: Brief }) {
  const paragraphs = fallbackNarrative(brief);
  return (
    <Section id="explain" index={8} title="In plain words" kicker="A summary assembled from the grade and flags above.">
      <div data-pending="explain" className="max-w-prose rounded-lg border border-rule bg-surface p-5 text-[15px] leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i} className={i ? "mt-3 text-muted" : ""}>
            {p}
          </p>
        ))}
      </div>
    </Section>
  );
}
