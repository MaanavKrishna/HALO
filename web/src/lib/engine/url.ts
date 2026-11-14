import { z } from 'zod';
import { MATERIALS } from './materials';
import { PRESETS } from './presets';
import type { DetectorId, Habitat, MaterialId } from './types';

/**
 * Habitat <-> URL query. Parameters: o2, p, f (numbers), m and d (comma lists),
 * l (0|1), n (name). A missing parameter takes its default silently; a present
 * but invalid one takes a fallback and adds exactly one notice.
 */

const DEFAULT = PRESETS.artemis;
const DEFAULT_NAME = 'Custom habitat';
const NAME_MAX = 60;
const DETECTORS: DetectorId[] = ['scatter', 'ionization'];

const NumberZ = z
  .string()
  .trim()
  .regex(/^[-+]?(\d+\.?\d*|\.\d+)$/)
  .transform(Number)
  .pipe(z.number().finite());
const FlagZ = z.enum(['0', '1']);

const NUMS = [
  { key: 'o2', field: 'o2Pct', label: 'O2', min: 0, max: 100, unit: '%' },
  { key: 'p', field: 'pressurePsia', label: 'Pressure', min: 0.5, max: 20, unit: ' psia' },
  { key: 'f', field: 'flowCmS', label: 'Flow', min: 0, max: 50, unit: ' cm/s' },
] as const;

const csv = (v: string) => v.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export function habitatToQuery(h: Habitat): string {
  const q = new URLSearchParams({
    o2: String(h.o2Pct),
    p: String(h.pressurePsia),
    f: String(h.flowCmS),
    m: h.materials.join(','),
    d: h.detectors.join(','),
    l: h.liquids ? '1' : '0',
    n: h.name,
  });
  return q.toString();
}

export function queryToHabitat(q: URLSearchParams): { habitat: Habitat; notices: string[] } {
  const notices: string[] = [];
  const habitat: Habitat = { ...DEFAULT, materials: [...DEFAULT.materials], detectors: [...DEFAULT.detectors], name: DEFAULT_NAME };

  for (const { key, field, label, min, max, unit } of NUMS) {
    const raw = q.get(key);
    if (raw === null) continue;
    const parsed = NumberZ.safeParse(raw);
    if (!parsed.success) {
      notices.push(`${label} "${raw.slice(0, 20)}" is not a number; using ${DEFAULT[field]}${unit}.`);
      continue;
    }
    const v = Math.min(max, Math.max(min, parsed.data));
    if (v !== parsed.data) notices.push(`${label} ${parsed.data}${unit} is outside ${min}–${max}${unit}; using ${v}${unit}.`);
    habitat[field] = v;
  }

  const m = q.get('m');
  if (m !== null) {
    const items = csv(m);
    // Own-property check: `in` would accept inherited keys such as "constructor".
    const isMaterial = (x: string): x is MaterialId => Object.hasOwn(MATERIALS, x);
    const known = items.filter(isMaterial);
    const unknown = items.filter((x) => !isMaterial(x));
    if (unknown.length) notices.push(`Unknown material${unknown.length > 1 ? 's' : ''} ignored: ${unknown.join(', ').slice(0, 60)}.`);
    habitat.materials = [...new Set(known)];
  }

  const d = q.get('d');
  if (d !== null) {
    const items = csv(d);
    const known = items.filter((x): x is DetectorId => (DETECTORS as string[]).includes(x));
    const unknown = items.filter((x) => !(DETECTORS as string[]).includes(x));
    if (unknown.length) notices.push(`Unknown detector${unknown.length > 1 ? 's' : ''} ignored: ${unknown.join(', ').slice(0, 60)}.`);
    habitat.detectors = known.length ? [...new Set(known)] : ['scatter'];
  }

  const l = q.get('l');
  if (l !== null) {
    const parsed = FlagZ.safeParse(l.trim());
    if (parsed.success) habitat.liquids = parsed.data === '1';
    else notices.push('Liquids must be 0 or 1; using 0.');
  }

  const n = q.get('n');
  if (n !== null) {
    const clean = n.replace(/[<>]/g, '').trim().slice(0, NAME_MAX).trim();
    habitat.name = clean || DEFAULT_NAME;
  }

  return { habitat, notices };
}
