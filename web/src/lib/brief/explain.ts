/**
 * Client side of "Ask HALO": calls POST /api/explain and decides whether the
 * live SI text may replace the precomputed narrative. Pure (fetch is passed
 * in), so it is unit-tested without a browser.
 */

export const QUESTION_MAX = 300;
/** A little above the route's 20 s maxDuration. */
export const EXPLAIN_TIMEOUT_MS = 22_000;

export type ExplainOutcome =
  | { kind: "live"; text: string; factIds: string[] }
  /** Anything else keeps the precomputed narrative on screen. */
  | { kind: "fallback"; reason: "status" | "network" | "timeout" | "not-live" | "invalid" };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Ask the explain route. Only a 200 whose body says `source: "live"` and has
 * non-empty text counts as live; every 4xx/5xx, network error, timeout or
 * malformed body falls back (Review Focus 5).
 */
export async function requestExplain(
  query: string,
  question: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = EXPLAIN_TIMEOUT_MS,
): Promise<ExplainOutcome> {
  const q = question.trim().slice(0, QUESTION_MAX);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(q ? { query, question: q } : { query }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { kind: "fallback", reason: "status" };
    const body: unknown = await res.json();
    if (!body || typeof body !== "object") return { kind: "fallback", reason: "invalid" };
    const { text, factIds, source } = body as { text?: unknown; factIds?: unknown; source?: unknown };
    if (source !== "live") return { kind: "fallback", reason: "not-live" };
    if (typeof text !== "string" || !text.trim()) return { kind: "fallback", reason: "invalid" };
    const ids = Array.isArray(factIds) ? factIds.filter((x): x is string => typeof x === "string") : [];
    return { kind: "live", text: text.trim(), factIds: ids };
  } catch {
    return { kind: "fallback", reason: ctrl.signal.aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

export type NarrativePart = { type: "text"; value: string } | { type: "fact"; id: string };

/** Fact ids are lowercase letters and hyphens only (global constraint). */
const CITE = /\[([a-z]+(?:-[a-z]+)*)\]/g;

/**
 * Split narrative text on [fact-id] citations, so the UI can render plain
 * text and citation chips (never HTML). Unknown ids stay as plain text.
 */
export function splitCitations(text: string, known: (id: string) => boolean = () => true): NarrativePart[] {
  const out: NarrativePart[] = [];
  let last = 0;
  for (const m of text.matchAll(CITE)) {
    const id = m[1];
    if (!known(id)) continue;
    const i = m.index ?? 0;
    if (i > last) out.push({ type: "text", value: text.slice(last, i) });
    out.push({ type: "fact", id });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/**
 * Sentences of the narrative, each with its citations attached (a citation
 * that follows a sentence's full stop belongs to that sentence). Every SI
 * sentence gets its own SI chip, so the UI needs sentence boundaries.
 */
export function splitSentences(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];
  // Break after ". " (optionally followed by citations) when the next sentence starts with a capital.
  const parts = t.split(/(?<=[.!?](?:\s*\[[a-z-]+\])*)\s+(?=[A-Z])/);
  return parts.map((s) => s.trim()).filter(Boolean);
}
