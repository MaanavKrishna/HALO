import type Anthropic from '@anthropic-ai/sdk';
import { HALO_DATA } from '@/lib/data/load';
import { buildBrief } from '@/lib/engine/brief';
import { queryToHabitat } from '@/lib/engine/url';
import type { Brief, Fact } from '@/lib/engine/types';
import { fallbackFactIds, fallbackNarrative } from './fallback';
import { buildPrompt, SI_MAX_TOKENS, SI_MODEL, SI_TIMEOUT_MS, SYSTEM_PROMPT } from './prompt';
import { numberMatches, numberTokens, validateNumbers } from './validateNumbers';
import { splitSentences } from '@/lib/brief/explain';
import { allFacts } from '@/lib/brief/pageFacts';

export type ExplainSource = 'live' | 'fallback';
export interface ExplainResult { text: string; factIds: string[]; source: ExplainSource }

/** The one SDK method explainCore uses; the LLM SDK client satisfies it, and tests pass a mock. */
export interface SiClient {
  messages: {
    create(body: Anthropic.MessageCreateParamsNonStreaming, options?: Anthropic.RequestOptions): Promise<Anthropic.Message>;
  };
}

/**
 * Rebuild the brief from the habitat query string. Client-sent facts are never used.
 * The facts are every fact the page shows (engine facts plus page facts such as the
 * next test, its gains and the archive what-if), so an answer can cite what the reader sees.
 */
export function briefFromQuery(query: string): Brief {
  const { habitat, notices } = queryToHabitat(new URLSearchParams(query.replace(/^\?/, '')));
  const brief = buildBrief(habitat, HALO_DATA, notices);
  return { ...brief, facts: allFacts(brief, HALO_DATA) };
}

/**
 * Numbers the SI may write: every brief fact. The habitat's own inputs (O2,
 * pressure, flow) are brief facts too (habitat-oxygen, habitat-pressure,
 * habitat-flow), so text about the habitat cites the habitat, not a test.
 */
export function groundingFacts(brief: Brief): Fact[] {
  return brief.facts;
}

export function fallbackResult(brief: Brief): ExplainResult {
  return { text: fallbackNarrative(brief), factIds: fallbackFactIds(brief), source: 'fallback' };
}

const VERDICT = /\b(un)?safe\b/i;
const DATA_TAG = /<\/?(habitat|facts|flags|question)>/i;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');
/** System prompt lines without their list numbers, so a bare restatement of a rule is caught. */
const RULE_LINES = SYSTEM_PROMPT.split('\n')
  .map((l) => norm(l.trim().replace(/^\d+\.\s*/, '')))
  .filter((l) => l.length > 30);

/** True when the text repeats a line of the system prompt or a data-block tag. */
function leaksPrompt(text: string): boolean {
  const t = norm(text);
  return DATA_TAG.test(text) || RULE_LINES.some((l) => t.includes(l));
}

const CITE = /\[([a-z-]+(?:\s*,\s*[a-z-]+)*)\]/g;

/**
 * True when a cited fact belongs in its sentence: a numeric fact's value must
 * equal (at the written precision) one of the numbers the sentence writes. A
 * sentence with no numbers may cite a fact qualitatively. Text facts always pass.
 */
export function citationFits(sentence: string, fact: Fact): boolean {
  if (typeof fact.value !== 'number') return true;
  const nums = numberTokens(sentence);
  if (nums.length === 0) return true;
  return nums.some((t) => numberMatches(t, fact.value as number));
}

/**
 * Keep citations of real brief facts whose value fits their sentence; drop
 * citations of ids the brief does not have, and citations that pin a number
 * to the wrong fact (for example "34%" cited to the SAME ambient O2).
 */
export function resolveCitations(text: string, facts: Fact[]): { text: string; factIds: string[] } {
  const byId = new Map(facts.map((f) => [f.id, f]));
  const factIds: string[] = [];
  const sentences = splitSentences(text).map((sentence) =>
    sentence.replace(CITE, (_, group: string) => {
      const ids = group
        .split(',')
        .map((s) => s.trim())
        .filter((id) => byId.has(id) && citationFits(sentence, byId.get(id) as Fact));
      for (const id of ids) if (!factIds.includes(id)) factIds.push(id);
      return ids.map((id) => `[${id}]`).join(' ');
    }),
  );
  const out = sentences.join(' ');
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

  const { text, factIds } = resolveCitations(raw, brief.facts);
  if (!text) return fallback;
  return { text, factIds, source: 'live' };
}
