import { describe, it, expect, vi } from 'vitest';
import { explainCore, type SiClient } from '@/lib/si/explain';
import { buildPrompt, SYSTEM_PROMPT } from '@/lib/si/prompt';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { buildBrief } from '@/lib/engine/brief';
import { habitatToQuery } from '@/lib/engine/url';
import { factText } from '@/lib/engine/types';

/**
 * Eval-style check (mocked model) for the question the live demo failed:
 * "Why is the grade D?" for the Artemis Base. The facts block must carry
 * the grade, its plain and technical reasons and each number they use, so a
 * grounded answer can cite them and pass the number validator.
 */
const QUERY = habitatToQuery(PRESETS.artemis);
const brief = buildBrief({ ...PRESETS.artemis }, HALO_DATA);
const fact = (id: string) => {
  const f = brief.facts.find((x) => x.id === id);
  if (!f) throw new Error(`missing fact ${id}`);
  return f;
};

function mockClient(text: string) {
  const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text }], stop_reason: 'end_turn' });
  return { client: { messages: { create } } as unknown as SiClient, create };
}

describe('Ask HALO can explain the grade', () => {
  it('Artemis grades D, raised from F by the surrogate test', () => {
    expect(brief.grade.grade).toBe('D');
    expect(fact('grade-overall').value).toBe('D');
    expect(fact('grade-solid').value).toBe('F');
    expect(fact('grade-solid-surrogate').value).toBe('B');
    expect(fact('grade-reason').value).toBe(brief.grade.reason);
    expect(fact('grade-reason-technical').value).toBe(brief.grade.technical);
  });

  it('the prompt facts block carries every grade fact and each flag as a fact', () => {
    const { user } = buildPrompt(brief, 'Why is the grade D?');
    const facts = user.slice(user.indexOf('<facts>'), user.indexOf('</facts>'));
    for (const id of ['grade-overall', 'grade-reason', 'grade-reason-technical', 'grade-solid', 'grade-solid-surrogate', 'grade-droplet', 'grade-gas', 'grade-solid-distance', 'grade-surrogate-distance', 'grade-ring-b', 'grade-ring-c', 'grade-ring-d']) {
      expect(facts, id).toContain(`"id":"${id}"`);
    }
    expect(facts).toContain(JSON.stringify(brief.grade.reason));
    for (const f of brief.flags) {
      expect(facts).toContain(`"id":"flag-${f.id}"`);
      expect(facts).toContain(JSON.stringify(f.detail));
    }
    expect(SYSTEM_PROMPT).toContain('grade-reason says why in plain words');
  });

  it('a grounded answer to "Why is the grade D?" stays live and keeps its grade citations', async () => {
    const solidD = factText(fact('grade-solid-distance'));
    const ring = factText(fact('grade-ring-d'));
    const answer =
      `The evidence grade is D [grade-overall]. ${fact('grade-reason').value} [grade-reason] ` +
      `On real cabin solids alone the grade is F [grade-solid]: the nearest real-material test sits at evidence distance ${solidD} [grade-solid-distance], beyond the D limit of ${ring} [grade-ring-d]. ` +
      `The surrogate test ACME BRE grades B [grade-solid-surrogate] and raises the result one step [grade-reason-technical].`;
    const { client } = mockClient(answer);
    const r = await explainCore(QUERY, 'Why is the grade D?', client);
    expect(r.source).toBe('live');
    expect(r.factIds).toEqual(
      expect.arrayContaining(['grade-overall', 'grade-reason', 'grade-solid', 'grade-solid-distance', 'grade-ring-d', 'grade-solid-surrogate', 'grade-reason-technical']),
    );
    expect(r.text).toContain(solidD);
  });

  it('an answer citing a flag fact for a finding stays live', async () => {
    const f = brief.flags.find((x) => x.id === 'no-solid-evidence')!;
    const { client } = mockClient(`${f.title} [flag-no-solid-evidence].`);
    const r = await explainCore(QUERY, 'What is the main gap?', client);
    expect(r.source).toBe('live');
    expect(r.factIds).toEqual(['flag-no-solid-evidence']);
  });

  it('a number the grade facts do not hold still falls back', async () => {
    const { client } = mockClient('The grade is D because the nearest solid test sits at evidence distance 3.14 [grade-solid-distance].');
    const r = await explainCore(QUERY, 'Why is the grade D?', client);
    expect(r.source).toBe('fallback');
  });
});
