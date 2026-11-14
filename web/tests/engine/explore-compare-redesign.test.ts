import { describe, expect, it } from 'vitest';
import { filterByHazards, hardwareFamily, neighbours } from '@/lib/explore';
import { compareDelta, presetKey } from '@/lib/compare';
import { HALO_DATA } from '@/lib/data/load';
import { buildBrief } from '@/lib/engine/brief';
import { PRESETS } from '@/lib/engine/presets';

const inv = HALO_DATA.investigations;

describe('explore redesign helpers', () => {
  it('matches any selected hazard and an exact fuel class', () => {
    expect(filterByHazards(inv, [], 'all')).toHaveLength(inv.length);
    expect(filterByHazards(inv, ['smoke_detection'], 'all')).toHaveLength(4);
    const both = filterByHazards(inv, ['smoke_detection', 'toxicity'], 'all');
    expect(both.length).toBe(6);
    expect(filterByHazards(inv, ['smoke_detection', 'toxicity'], 'gas').every((i) => i.fuelClasses.includes('gas'))).toBe(true);
  });
  it('groups hardware into families', () => {
    expect(hardwareFamily('Combustion Integrated Rack (CIR), ACME')).toBe('rack');
    expect(hardwareFamily('Microgravity Science Glovebox (MSG)')).toBe('glovebox');
    expect(hardwareFamily('Saffire III enclosure in Cygnus')).toBe('vehicle');
    expect(hardwareFamily('Comparitive Soot Diagnostic Hardware')).toBe('smoke');
    expect(hardwareFamily('Principal Investigator Laboratory Hardware')).toBe('lab');
    expect(hardwareFamily('')).toBe('none');
  });
  it('finds neighbours in PSI-number order', () => {
    expect(neighbours(inv, 'PSI-69').prev?.psiId).toBe('PSI-68');
    expect(neighbours(inv, 'PSI-69').next?.psiId).toBe('PSI-98');
    expect(neighbours(inv, 'PSI-10').prev).toBeNull();
    expect(neighbours(inv, 'PSI-999')).toEqual({ prev: null, next: null });
  });
});

describe('compareDelta', () => {
  const a = buildBrief(PRESETS.iss, HALO_DATA);
  const b = buildBrief(PRESETS.artemis, HALO_DATA);
  const d = compareDelta(a, b);
  it('computes atmosphere deltas from the habitats', () => {
    expect(d.o2).toBe(PRESETS.artemis.o2Pct - PRESETS.iss.o2Pct);
    expect(d.pressure).toBeCloseTo(PRESETS.artemis.pressurePsia - PRESETS.iss.pressurePsia, 5);
  });
  it('partitions flags into added, removed and kept', () => {
    const ids = (fs: { id: string }[]) => fs.map((f) => f.id).sort();
    expect(ids([...d.added, ...d.kept])).toEqual(ids(b.flags));
    expect(d.removed.every((f) => !b.flags.some((g) => g.id === f.id))).toBe(true);
  });
  it('reports grade direction', () => {
    expect(d.grade.from).toBe(a.grade.grade);
    expect(d.grade.to).toBe(b.grade.grade);
    expect(compareDelta(a, a).grade.direction).toBe('same');
    expect(compareDelta(a, a).added).toHaveLength(0);
  });
  it('identifies presets', () => {
    expect(presetKey(PRESETS.moon)).toBe('moon');
    expect(presetKey({ ...PRESETS.moon, o2Pct: 31 })).toBeNull();
  });
});
