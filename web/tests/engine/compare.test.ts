import { describe, expect, it } from 'vitest';
import { habitatFromParam, samePreset } from '@/lib/compare';
import { PRESETS } from '@/lib/engine/presets';
import { habitatToQuery } from '@/lib/engine/url';

describe('habitatFromParam', () => {
  it('uses the fallback silently when absent', () => {
    expect(habitatFromParam(undefined, PRESETS.iss, 'a')).toEqual({ habitat: PRESETS.iss, notices: [] });
  });
  it('falls back to the default preset with a notice on garbage', () => {
    const r = habitatFromParam('garbage', PRESETS.artemis, 'b');
    expect(r.habitat).toBe(PRESETS.artemis);
    expect(r.notices).toHaveLength(1);
  });
  it('passes parse notices through', () => {
    const r = habitatFromParam('o2=250', PRESETS.iss, 'a');
    expect(r.habitat.o2Pct).toBe(100);
    expect(r.notices[0]).toMatch(/outside/);
  });
  it('round-trips a preset and matches it by identity, not name', () => {
    const r = habitatFromParam(habitatToQuery(PRESETS.moon), PRESETS.iss, 'a');
    expect(samePreset(r.habitat, PRESETS.moon)).toBe(true);
    expect(samePreset({ ...PRESETS.moon, name: 'Other' }, PRESETS.moon)).toBe(true);
    expect(samePreset(PRESETS.rover, PRESETS.moon)).toBe(false);
  });
});
