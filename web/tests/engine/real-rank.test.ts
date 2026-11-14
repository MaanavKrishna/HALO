import { describe, it, expect } from 'vitest';
import { HALO_DATA } from '@/lib/data/load';
import { PRESETS } from '@/lib/engine/presets';
import { rankInvestigations } from '@/lib/engine/rank';

// Real-data expectations. Skipped while src/data holds the fixture placeholders.
const isReal = HALO_DATA.manifest.totalRows === 1967;

describe.skipIf(!isReal)('real data: investigation ranking', () => {
  const acr = (k: keyof typeof PRESETS, n: number) =>
    rankInvestigations(PRESETS[k], HALO_DATA).slice(0, n).map((x) => x.inv.acronym);

  it('artemis: ACME BRE is first or second', () => expect(acr('artemis', 2)).toContain('ACME BRE'));
  it('artemis: SAME-R is in the top 8', () => expect(acr('artemis', 8)).toContain('SAME-R'));
  it('iss: BASS-II is in the top 3', () => expect(acr('iss', 3)).toContain('BASS-II'));
  it('top 8 have non-empty why, scores sorted descending', () => {
    const r = rankInvestigations(PRESETS.artemis, HALO_DATA);
    for (const x of r.slice(0, 8)) expect(x.why.length).toBeGreaterThan(0);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
  });
});
