import { describe, expect, it, vi } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { buildBrief } from '@/lib/engine/brief';
import { PRESETS } from '@/lib/engine/presets';
import { citationChips, requestExplain, splitCitations, splitParagraphs, splitSentences, type ChipFact } from '@/lib/brief/explain';
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

describe('splitParagraphs', () => {
  it('ends a paragraph after a sentence that closes with citations', () => {
    expect(splitParagraphs('Grade D. It ran far away. [a-b] Smoke was missed. [c-d] Done.')).toEqual([
      'Grade D. It ran far away. [a-b]',
      'Smoke was missed. [c-d]',
      'Done.',
    ]);
  });
});

describe('citationChips', () => {
  const facts: Record<string, ChipFact> = {
    'a-distance': { label: 'Evidence distance to the nearest real solid test', value: '2.47', n: 1 },
    'a-oxygen': { label: 'Oxygen of the nearest real solid test', value: '22.2%', n: 1 },
    'a-note': { label: 'A long sentence about partial gravity that must never be chip text', value: null, n: 1 },
    'b-runs': { label: 'Kapton runs', value: '35', n: 2 },
    'c-plain': { label: 'Unsourced text fact', value: null, n: null },
  };
  const cites = (text: string) => citationChips(text, facts).filter((c) => c.type === 'cite');

  it('shows only the source number when the prose already states the value', () => {
    expect(cites('It ran at 22.2% O2, a distance of 2.47. [a-distance]')).toEqual([
      { type: 'cite', ids: ['a-distance'], labels: [facts['a-distance'].label], show: null, n: 1 },
    ]);
  });

  it('prints the value when the prose does not state it', () => {
    expect(cites('Kapton smoke was often missed [b-runs].')).toEqual([
      { type: 'cite', ids: ['b-runs'], labels: ['Kapton runs'], show: '35', n: 2 },
    ]);
    // 135 and 3.5 are different numbers, so the value is still printed.
    expect(cites('It took 135 s at 3.5 V [b-runs].')[0]).toMatchObject({ show: '35' });
  });

  it('merges neighbouring chips with the same source number and the same printed value', () => {
    const out = citationChips('Far from tests: 2.47 away at 22.2% O2. [a-distance] [a-oxygen] [a-note] [b-runs]', facts);
    expect(out.filter((c) => c.type === 'cite')).toEqual([
      { type: 'cite', ids: ['a-distance', 'a-oxygen', 'a-note'], labels: [facts['a-distance'].label, facts['a-oxygen'].label, facts['a-note'].label], show: null, n: 1 },
      { type: 'cite', ids: ['b-runs'], labels: ['Kapton runs'], show: '35', n: 2 },
    ]);
    // The spaces between merged chips go with them.
    expect(out.map((c) => (c.type === 'text' ? c.value : '#')).join('')).toBe('Far from tests: 2.47 away at 22.2% O2. # #');
  });

  it('does not merge chips separated by prose, or with different values', () => {
    expect(cites('One [a-note] and two [a-note].')).toHaveLength(2);
    expect(cites('Unstated [a-distance] [a-oxygen].').map((c) => (c as { show: string }).show)).toEqual(['2.47', '22.2%']);
  });

  it('keeps chips apart when neither has a source number or a value', () => {
    const bare = { 'c-plain': facts['c-plain'], 'c-other': { label: 'Another unsourced text fact', value: null, n: null } };
    expect(citationChips('Untested [c-plain] [c-other].', bare).filter((c) => c.type === 'cite')).toHaveLength(2);
  });

  it('never uses a label as the printed text, and leaves unknown ids as prose', () => {
    const out = citationChips('Gravity is untested [a-note] [c-plain] [nope].', facts);
    for (const c of out) if (c.type === 'cite') expect(c.show).toBeNull();
    expect(out.at(-1)).toEqual({ type: 'text', value: ' [nope].' });
  });

  it('turns the real Artemis narrative into chips with no repeated neighbours', () => {
    const brief = buildBrief({ ...PRESETS.artemis }, HALO_DATA);
    const all = Object.fromEntries(brief.facts.map((f, i) => [f.id, { label: f.label, value: typeof f.value === 'number' ? String(f.value) : null, n: (i % 3) + 1 }]));
    for (const para of splitParagraphs(fallbackNarrative(brief))) {
      const chips = citationChips(para, all);
      let prev: (typeof chips)[number] | null = null;
      for (const c of chips) {
        if (c.type === 'text') {
          if (c.value.trim()) prev = null;
          continue;
        }
        if (prev && prev.type === 'cite') expect(`${prev.n}|${prev.show}`).not.toBe(`${c.n}|${c.show}`);
        prev = c;
      }
    }
  });
});
