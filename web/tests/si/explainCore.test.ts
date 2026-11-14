import { describe, it, expect, vi } from 'vitest';
import { explainCore, type SiClient } from '@/lib/si/explain';
import { fallbackNarrative } from '@/lib/si/fallback';
import { SI_MODEL, SI_MAX_TOKENS, SYSTEM_PROMPT } from '@/lib/si/prompt';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { buildBrief } from '@/lib/engine/brief';
import { habitatToQuery } from '@/lib/engine/url';

const QUERY = habitatToQuery(PRESETS.artemis);
const brief = buildBrief({ ...PRESETS.artemis }, HALO_DATA);
const ids = new Set(brief.facts.map((f) => f.id));

function mockClient(text: string, stop_reason = 'end_turn') {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text }],
    stop_reason,
  });
  return { client: { messages: { create } } as unknown as SiClient, create };
}

describe('explainCore', () => {
  it('returns live text and the cited fact ids when every number is a fact', async () => {
    const { client, create } = mockClient(
      'No real cabin material has been tested near this atmosphere [no-such-id]. Kapton stayed below the scatter alarm in 20 of 35 runs [det-kapton-scatter-low] [det-kapton-scatter-runs].',
    );
    const r = await explainCore(QUERY, 'Why is kapton flagged?', client);
    expect(r.source).toBe('live');
    expect(r.factIds).toEqual(['det-kapton-scatter-low', 'det-kapton-scatter-runs']);
    expect(r.text).not.toContain('[no-such-id]');
    const [body, opts] = create.mock.calls[0];
    expect(body.model).toBe(SI_MODEL);
    expect(body.max_tokens).toBe(SI_MAX_TOKENS);
    expect(body.system).toBe(SYSTEM_PROMPT);
    expect(opts.timeout).toBe(12_000);
  });

  it('accepts the habitat inputs (34% O2, 8.2 psia) but never lists them as fact ids', async () => {
    const { client } = mockClient('At 34% O2 and 8.2 psia, the nearest test ran at 22.2% O2 [cov-solid-oxygen].');
    const r = await explainCore(QUERY, undefined, client);
    expect(r.source).toBe('live');
    expect(r.factIds).toEqual(['cov-solid-oxygen']);
  });

  it('falls back when the model invents a number', async () => {
    const { client } = mockClient('Kapton burns at 47% O2 [det-kapton-scatter-low].');
    const r = await explainCore(QUERY, undefined, client);
    expect(r.source).toBe('fallback');
    expect(r.text).toBe(fallbackNarrative(brief));
  });

  it('falls back on "safe"/"unsafe", refusals, empty text and leaked instructions', async () => {
    for (const [text, stop] of [
      ['This habitat is unsafe.', 'end_turn'],
      ['', 'end_turn'],
      ['Sorry.', 'refusal'],
      [SYSTEM_PROMPT, 'end_turn'],
    ] as const) {
      const { client } = mockClient(text, stop);
      expect((await explainCore(QUERY, 'q', client)).source, text.slice(0, 30)).toBe('fallback');
    }
  });

  it('rebuilds the brief from the query and ignores anything else', async () => {
    const { client, create } = mockClient('Fine.');
    await explainCore(`${QUERY}&facts=999`, undefined, client);
    const user: string = create.mock.calls[0][0].messages[0].content;
    expect(user).not.toContain('999');
    for (const id of ids) expect(user).toContain(id);
  });

  it('keeps only whole sentences when the answer hits the token cap', async () => {
    const { client } = mockClient('Kapton is flagged [det-kapton-scatter-low]. It stayed below the alarm in', 'max_tokens');
    const r = await explainCore(QUERY, undefined, client);
    expect(r).toEqual({ text: 'Kapton is flagged [det-kapton-scatter-low].', factIds: ['det-kapton-scatter-low'], source: 'live' });
  });

  it('lets SDK errors propagate to the caller', async () => {
    const create = vi.fn().mockRejectedValue(new Error('timeout'));
    await expect(explainCore(QUERY, undefined, { messages: { create } } as unknown as SiClient)).rejects.toThrow('timeout');
  });
});
