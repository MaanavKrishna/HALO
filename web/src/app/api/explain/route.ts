import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { handleExplain } from '@/lib/si/handler';
import { SI_TIMEOUT_MS } from '@/lib/si/prompt';

/**
 * POST /api/explain: grounded SI narration of a Fire Brief.
 * The API key is read here and nowhere else; it never reaches client code.
 * A POST handler is dynamic and never cached by Next.
 */

/** Seconds; covers the 12 s model timeout plus brief building. */
export const maxDuration = 20;

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const live = process.env.SI_LIVE === 'true' && !!apiKey;
  return handleExplain(request, {
    live,
    getClient: () => new Anthropic({ apiKey, timeout: SI_TIMEOUT_MS, maxRetries: 0 }),
  });
}
