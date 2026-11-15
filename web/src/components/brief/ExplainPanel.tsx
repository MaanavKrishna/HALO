import { briefContext } from "@/lib/brief/context";
import { habitatToQuery } from "@/lib/engine/url";
import type { Brief } from "@/lib/engine/types";
import { suggestQuestions } from "@/lib/brief/suggestions";
import { fallbackNarrative } from "@/lib/si/fallback";
import { AskHalo, type FactRef } from "./AskHalo";
import { Section, unitText } from "./parts";

/**
 * "In plain words": the Ask HALO box, with the deterministic narrative (grade +
 * flags, every number a cited fact) behind a disclosure. A live SI narration
 * comes from POST /api/explain, which falls back to that text on any error.
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
      kicker="Ask HALO about this brief in your own words; the SI may only restate cited facts. A summary built from the grade and flags is one click away."
    >
      <AskHalo fallback={fallbackNarrative(brief)} query={habitatToQuery(brief.habitat)} facts={facts} suggestions={suggestQuestions(brief)} />
    </Section>
  );
}
