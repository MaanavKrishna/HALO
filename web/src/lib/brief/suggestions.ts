import { QUESTION_MAX } from "@/lib/brief/explain";
import { MATERIALS } from "@/lib/engine/materials";
import type { Brief, MaterialId } from "@/lib/engine/types";

/**
 * One-click questions for Ask HALO, derived from the brief's own grade and
 * flags. Pure: the same brief always gives the same list (3 or 4 questions).
 * Order: grade, detector miss, next test, then one flow or partial-gravity.
 */
export function suggestQuestions(brief: Brief): string[] {
  const out = [`Why is the grade ${brief.grade.grade}?`];

  const miss = brief.flags.find((f) => f.id.startsWith("detector-miss-"));
  const material = miss?.id.slice("detector-miss-".length) as MaterialId | undefined;
  if (material && MATERIALS[material]) out.push(`Would my smoke detector catch a ${MATERIALS[material].label} fire?`);

  if (brief.nextTests.length > 0) out.push("What test would help most?");

  if (brief.flags.some((f) => f.id === "flow-outside-tested")) out.push("Is my cabin airflow inside what was tested?");
  else if (brief.flags.some((f) => f.id === "no-partial-gravity")) out.push("What about lunar gravity?");

  return out.filter((q) => q.length <= QUESTION_MAX);
}
