/**
 * Grounded-explain eval: 15 questions across the five habitat presets, each
 * with the fact ids a correct answer must cite. Runs every question through
 * explainCore (no rate limiter, no cache) with the real client, and writes
 * web/src/data/eval.json { passed, total, runAt, model }.
 *
 * Runs only when SI_LIVE=true and ANTHROPIC_API_KEY is set; otherwise it
 * exits without calling the API or touching eval.json. One API call per
 * question (15 in total). The key is never printed.
 *
 *   set -a; . ../pipeline/.env; set +a; SI_LIVE=true pnpm tsx scripts/eval.ts
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { PRESETS } from "@/lib/engine/presets";
import { habitatToQuery } from "@/lib/engine/url";
import type { Habitat } from "@/lib/engine/types";
import { explainCore } from "@/lib/si/explain";
import { SI_MODEL, SI_TIMEOUT_MS } from "@/lib/si/prompt";

interface Case {
  preset: keyof typeof PRESETS;
  liquids?: boolean;
  question: string;
  expect: string[];
}

export const CASES: Case[] = [
  { preset: "iss", question: "Would Kapton smoke trip the scatter smoke detector on the ISS?", expect: ["det-kapton-scatter-low", "det-kapton-scatter-runs"] },
  { preset: "iss", question: "How often did Teflon smoke stay below the scatter alarm level?", expect: ["det-teflon-scatter-low"] },
  { preset: "iss", question: "Is there any fire data at lunar or Martian gravity?", expect: ["psi-investigations"] },
  { preset: "artemis", question: "Has any real cabin material been burned at this atmosphere? What oxygen was the nearest one?", expect: ["cov-solid-oxygen"] },
  { preset: "artemis", question: "Would Kapton smoke trip the detector in Artemis?", expect: ["det-kapton-scatter-low"] },
  { preset: "artemis", question: "Was the smoke detector data collected at this habitat's atmosphere?", expect: ["det-ambient-oxygen"] },
  { preset: "moon", question: "How far is the nearest real-material test from this habitat, as an evidence distance?", expect: ["cov-solid-distance"] },
  { preset: "moon", question: "How much power did the Saffire VI PMMA fire reach at its high end?", expect: ["aftermath-pmma-power-high"] },
  { preset: "moon", question: "Does cotton smoke reach the scatter alarm level?", expect: ["det-cotton-scatter-low"] },
  { preset: "rover", question: "At what pressure was the nearest solid-fuel test run?", expect: ["cov-solid-pressure"] },
  { preset: "rover", question: "At what pressure did the SAME smoke detector runs take place?", expect: ["det-ambient-pressure"] },
  { preset: "rover", question: "What did BASS find about the standard flammability test?", expect: ["bass-test-one"] },
  { preset: "suit", question: "How far is 100% oxygen at suit pressure from any tested solid?", expect: ["cov-solid-distance"] },
  { preset: "suit", question: "Is there partial-gravity combustion data relevant to this suit?", expect: ["psi-investigations"] },
  { preset: "artemis", liquids: true, question: "Will a fuel droplet flame go out on its own at this oxygen level?", expect: ["ext-probability"] },
];

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (process.env.SI_LIVE !== "true" || !key) {
    console.log("eval: skipped (set SI_LIVE=true and ANTHROPIC_API_KEY to run); eval.json unchanged");
    return;
  }
  const client = new Anthropic({ apiKey: key, timeout: SI_TIMEOUT_MS, maxRetries: 0 });
  let passed = 0;
  for (const [i, c] of CASES.entries()) {
    const h: Habitat = { ...PRESETS[c.preset], liquids: c.liquids ?? false };
    let line: string;
    try {
      const r = await explainCore(habitatToQuery(h), c.question, client);
      const ok = r.source === "live";
      const missing = c.expect.filter((id) => !r.factIds.includes(id));
      const pass = ok && missing.length === 0;
      if (pass) passed++;
      line = `${pass ? "PASS" : "FAIL"} ${r.source}${missing.length ? ` missing=${missing.join(",")}` : ""} cited=${r.factIds.join(",") || "none"}`;
    } catch (e) {
      line = `FAIL error=${e instanceof Error ? e.constructor.name : "unknown"}`;
    }
    console.log(`${String(i + 1).padStart(2)} [${c.preset}${c.liquids ? "+liquids" : ""}] ${line}\n    Q: ${c.question}`);
  }
  const out = { passed, total: CASES.length, runAt: new Date().toISOString(), model: SI_MODEL };
  await writeFile(join(process.cwd(), "src/data/eval.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`eval: ${passed}/${CASES.length} passed; wrote src/data/eval.json`);
}

main().catch((e) => {
  console.error(`eval: failed (${e instanceof Error ? e.constructor.name : "unknown"})`);
  process.exit(1);
});
