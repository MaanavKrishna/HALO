import { createHash } from 'node:crypto';
import { z } from 'zod';
import { LruCache } from './cache';
import { briefFromQuery, explainCore, fallbackResult, type ExplainResult, type SiClient } from './explain';
import { QUESTION_MAX } from './prompt';
import { allow, resetRateLimit } from './rateLimit';

/**
 * POST /api/explain logic, kept out of the route file so the route module is
 * the only place that reads the API key. Order: size -> JSON -> schema ->
 * live switch (503) -> cache -> rate limit (429) -> model (502 on error).
 * Error bodies never echo the input, a stack trace or the environment.
 */

export const BODY_MAX_BYTES = 8 * 1024;
const QUERY_MAX = 2_000;
const CACHE_MAX = 200;

const BodyZ = z.strictObject({
  query: z.string().max(QUERY_MAX),
  question: z.string().max(QUESTION_MAX).optional(),
});

const cache = new LruCache<ExplainResult>(CACHE_MAX);

export function resetExplainState(): void {
  cache.clear();
  resetRateLimit();
}

export interface ExplainDeps {
  /** true only when SI_LIVE is "true" and a key is present. */
  live: boolean;
  /** Creates the SDK client; called only for live, uncached, allowed requests. */
  getClient: () => SiClient;
}

const HEADERS = { 'cache-control': 'no-store' };
const json = (body: unknown, status: number) => Response.json(body, { status, headers: HEADERS });
const error = (code: string, status: number) => json({ error: code }, status);

/** Read at most `max` bytes of the body; null when it is larger. */
async function readCapped(req: Request, max: number): Promise<string | null> {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Client IP for the rate limit: platform-set headers first, then the first x-forwarded-for hop. */
function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('x-real-ip')?.trim() ||
    h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export async function handleExplain(req: Request, deps: ExplainDeps): Promise<Response> {
  const raw = await readCapped(req, BODY_MAX_BYTES);
  if (raw === null) return error('payload_too_large', 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return error('invalid_json', 400);
  }
  const body = BodyZ.safeParse(parsed);
  if (!body.success) return error('invalid_request', 400);
  const { query } = body.data;
  const question = body.data.question?.trim() || undefined;

  if (!deps.live) return json(fallbackResult(briefFromQuery(query)), 503);

  const key = createHash('sha256').update(`${query}\u0000${question ?? ''}`).digest('hex');
  const hit = cache.get(key);
  if (hit) return json(hit, 200);

  if (!allow(clientIp(req))) return json(fallbackResult(briefFromQuery(query)), 429);

  try {
    const result = await explainCore(query, question, deps.getClient());
    cache.set(key, result);
    return json(result, 200);
  } catch (e) {
    // Log only a non-secret status code, never the error object or message.
    const status = typeof (e as { status?: unknown })?.status === 'number' ? (e as { status: number }).status : undefined;
    console.error('explain: model call failed', status ?? 'unknown');
    return json(fallbackResult(briefFromQuery(query)), 502);
  }
}
