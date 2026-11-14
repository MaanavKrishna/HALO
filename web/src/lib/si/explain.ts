import type Anthropic from '@anthropic-ai/sdk';
import { HALO_DATA } from '@/lib/data/load';
import { buildBrief } from '@/lib/engine/brief';
import { queryToHabitat } from '@/lib/engine/url';
import type { Brief, Fact } from '@/lib/engine/types';
import { fallbackFactIds, fallbackNarrative } from './fallback';
import { buildPrompt, SI_MAX_TOKENS, SI_MODEL, SI_TIMEOUT_MS, SYSTEM_PROMPT } from './prompt';
import { validateNumbers } from './validateNumbers';

export type ExplainSource = 'live' | 'fallback';
export interface ExplainResult { text: string; factIds: string[]; source: ExplainSource }

/** The one SDK method explainCore uses; an Anthropic client satisfies it, and tests pass a mock. */
export interface SiClient {
  messages: {
    create(body: Anthropic.MessageCreateParamsNonStreaming, options?: Anthropic.RequestOptions): Promise<Anthropic.Message>;
  };
}

/** Rebuild the brief from the habitat query string. Client-sent facts are never used. */
export function briefFromQuery(query: string): Brief {
  const { habitat, notices } = queryToHabitat(new URLSearchParams(query.replace(/^\?/, '')));
  return buildBrief(habitat, HALO_DATA, notices);
}

/**
 * Numbers the SI may write: every brief fact, plus the habitat's own inputs
 * (O2, pressure, flow), which the user chose and the prompt shows. The inputs
 * are not Facts, so they are never returned as citable fact ids.
 */
export function groundingFacts(brief: Brief): Fact[] {
  const h = brief.habitat;
  const input = (id: string, value: number): Fact => ({ id, label: id, value, provenance: 'assumed', source: { note: 'habitat input' } });
  return [...brief.facts, input('habitat-oxygen', h.o2Pct), input('habitat-pressure', h.pressurePsia), input('habitat-flow', h.flowCmS)];
}

export function fallbackResult(brief: Brief): ExplainResult {
  return { text: fallbackNarrative(brief), factIds: fallbackFactIds(brief), source: 'fallback' };
}

const VERDICT = /\b(un)?safe\b/i;
const DATA_TAG = /<\/?(habitat|facts|flags|question)>/i;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');
const RULE_LINES = SYSTEM_PROMPT.split('\n').map((l) => norm(l.trim())).filter((l) => l.length > 30);

/** True when the text repeats a line of the system prompt or a data-block tag. */
function leaksPrompt(text: string): boolean {
  const t = norm(text);
  return DATA_TAG.test(text) || RULE_LINES.some((l) => t.includes(l));
}

const CITE = /\[([a-z-]+(?:\s*,\s*[a-z-]+)*)\]/g;

/** Keep citations of real brief facts; drop citations of ids the brief does not have. */
function resolveCitations(text: string, known: Set<string>): { text: string; factIds: string[] } {
  const factIds: string[] = [];
  const out = text.replace(CITE, (_, group: string) => {
    const ids = group.split(',').map((s) => s.trim()).filter((id) => known.has(id));
    for (const id of ids) if (!factIds.includes(id)) factIds.push(id);
    return ids.map((id) => `[${id}]`).join(' ');
  });
  return { text: out.replace(/[ \t]+([.,;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim(), factIds };
}

/**
 * One grounded explanation. Builds the brief from `query`, asks the model, and
 * returns its text only if every number is a brief fact, it gives no
 * safe/unsafe verdict and it does not echo its instructions; otherwise the
 * fallback narrative. SDK errors (timeout, 5xx) propagate to the caller.
 * No rate limiting or caching here: the route adds those; the eval calls this directly.
 */
export async function explainCore(query: string, question: string | undefined, client: SiClient): Promise<ExplainResult> {
  const brief = briefFromQuery(query);
  const fallback = fallbackResult(brief);
  const { system, user } = buildPrompt(brief, question);

  const res = await client.messages.create(
    {
      model: SI_MODEL,
      max_tokens: SI_MAX_TOKENS,
      // Short restatement task with a 400-token cap: thinking would eat the cap.
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      system,
      messages: [{ role: 'user', content: user }],
    },
    { timeout: SI_TIMEOUT_MS },
  );

  if (res.stop_reason === 'refusal') return fallback;
  let raw = res.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('')
    .trim();
  // Cut off at the token cap: keep whole sentences only.
  if (res.stop_reason === 'max_tokens') raw = raw.slice(0, Math.max(...['.', '!', '?'].map((c) => raw.lastIndexOf(c))) + 1).trim();
  if (!raw) return fallback;
  if (VERDICT.test(raw) || leaksPrompt(raw)) return fallback;
  if (!validateNumbers(raw, groundingFacts(brief)).ok) return fallback;

  const { text, factIds } = resolveCitations(raw, new Set(brief.facts.map((f) => f.id)));
  if (!text) return fallback;
  return { text, factIds, source: 'live' };
}
