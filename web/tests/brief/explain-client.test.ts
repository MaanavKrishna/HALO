import { describe, expect, it, vi } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { buildBrief } from '@/lib/engine/brief';
import { PRESETS } from '@/lib/engine/presets';
import { requestExplain, splitCitations, splitSentences } from '@/lib/brief/explain';
import { fallbackNarrative } from '@/lib/si/fallback';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('requestExplain', () => {
  it('returns live text on a 200 live answer and sends query + question', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ text: 'Kapton smoke was missed [det-kapton-scatter-low].', factIds: ['det-kapton-scatter-low'], source: 'live' }),
    );
    const out = await requestExplain('o2=34&p=8.2', '  why grade D?  ', fetchMock);
    expect(out).toEqual({ kind: 'live', text: 'Kapton smoke was missed [det-kapton-scatter-low].', factIds: ['det-kapton-scatter-low'] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/explain');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ query: 'o2=34&p=8.2', question: 'why grade D?' });
  });

  it('omits an empty question', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ text: 'x', factIds: [], source: 'live' }));
    await requestExplain('o2=34', '   ', fetchMock);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ query: 'o2=34' });
  });

  it('falls back on 503 (SI off) even though the body carries text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ text: 'fallback text', factIds: [], source: 'fallback' }, 503));
    expect(await requestExplain('o2=34', '', fetchMock)).toEqual({ kind: 'fallback', reason: 'status' });
  });

  it('falls back on 400, 429 and 502', async () => {
    for (const status of [400, 429, 502]) {
      const fetchMock = vi.fn().mockResolvedValue(json({ error: 'x' }, status));
      expect((await requestExplain('o2=34', '', fetchMock)).kind).toBe('fallback');
    }
  });

  it('falls back when a 200 reports source fallback (the model answer failed a check)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ text: 'x', factIds: [], source: 'fallback' }));
    expect(await requestExplain('o2=34', '', fetchMock)).toEqual({ kind: 'fallback', reason: 'not-live' });
  });

  it('falls back when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await requestExplain('o2=34', '', fetchMock)).toEqual({ kind: 'fallback', reason: 'network' });
  });

  it('falls back on a timeout', async () => {
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    expect(await requestExplain('o2=34', '', fetchMock, 10)).toEqual({ kind: 'fallback', reason: 'timeout' });
  });

  it('falls back on a malformed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('not json', { status: 200 }));
    expect((await requestExplain('o2=34', '', fetchMock)).kind).toBe('fallback');
  });
});

describe('splitCitations', () => {
  it('splits text and fact ids, keeping text as text', () => {
    expect(splitCitations('A <b>x</b> [det-kapton-scatter-low] b [nope] c.', (id) => id !== 'nope')).toEqual([
      { type: 'text', value: 'A <b>x</b> ' },
      { type: 'fact', id: 'det-kapton-scatter-low' },
      { type: 'text', value: ' b [nope] c.' },
    ]);
  });

  it('round-trips the real fallback narrative', () => {
    const brief = buildBrief({ ...PRESETS.artemis }, HALO_DATA);
    const text = fallbackNarrative(brief);
    const parts = splitCitations(text);
    const ids = parts.filter((p) => p.type === 'fact').map((p) => (p as { id: string }).id);
    expect(ids).toContain('cov-solid-distance');
    const rebuilt = parts.map((p) => (p.type === 'text' ? p.value : `[${p.id}]`)).join('');
    expect(rebuilt).toBe(text);
  });
});

describe('splitSentences', () => {
  it('keeps decimals and trailing citations with their sentence', () => {
    expect(splitSentences('Grade D. It ran at 22.2% O2. [cov-solid-oxygen] Smoke was missed [a-b]. Done')).toEqual([
      'Grade D.',
      'It ran at 22.2% O2. [cov-solid-oxygen]',
      'Smoke was missed [a-b].',
      'Done',
    ]);
  });
});
