import { briefContext } from "@/lib/brief/context";
import { habitatToQuery } from "@/lib/engine/url";
import type { Brief } from "@/lib/engine/types";
import { fallbackNarrative } from "@/lib/si/fallback";
import { AskHalo, type FactRef } from "./AskHalo";
import { Section, unitText } from "./parts";

/**
 * "In plain words": the deterministic narrative (grade + flags, every number a
 * cited fact) shows at once; "Ask HALO" can replace it with a live SI
 * narration from POST /api/explain, which falls back to this text on any error.
 */
export function ExplainPanel({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const facts: Record<string, FactRef> = {};
  for (const f of [...ctx.facts, ...brief.facts]) {
    if (facts[f.id]) continue;
    facts[f.id] = {
      label: f.label,
      value: typeof f.value === "number" ? `${f.value}${unitText(f)}` : null,
      n: ctx.cite(f.id) ?? null,
    };
  }
  return (
    <Section
      id="explain"
      title="In plain words"
      kicker="A narrative assembled from the grade and flags above. Ask HALO to explain it in its own words; the SI may only restate cited facts."
    >
      <AskHalo fallback={fallbackNarrative(brief)} query={habitatToQuery(brief.habitat)} facts={facts} />
    </Section>
  );
}
