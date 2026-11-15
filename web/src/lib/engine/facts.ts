import type { Fact, HaloData, LiteratureRow } from './types';

/**
 * Fixed and literature-derived facts. Text facts are quoted from their sources;
 * numeric aftermath facts are read from the Saffire VI rows in literature.json.
 */

export const BASS_GUIDE_URL =
  'https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf';
export const FLEX_COOL_FLAME_DOI = '10.1016/j.combustflame.2012.07.012';

export const COOL_FLAME_FACT: Fact = {
  id: 'flex-cool-flame',
  label: 'Cool flames after flame-out',
  value: 'FLEX: large heptane droplets kept burning on an invisible ~500–800 K cool flame after visible flame-out',
  provenance: 'literature',
  source: { doi: FLEX_COOL_FLAME_DOI },
};

export const BASS_FACT: Fact = {
  id: 'bass-test-one',
  label: 'BASS finding on the standard flammability test',
  value: 'NASA-STD-6001 Test 1 is not conservative, and materials can burn at lower oxygen levels in microgravity than on Earth',
  provenance: 'literature',
  source: { url: BASS_GUIDE_URL, note: 'A Researcher’s Guide to: Combustion Science (2015)' },
};

export const EARTH_FACTS: Fact[] = [
  {
    id: 'earth-air-tanks',
    label: 'Firefighter air tanks',
    value: 'NASA Johnson Space Center helped develop a lighter firefighter breathing-air tank: an aluminum liner wrapped in resin-soaked glass fiber.',
    provenance: 'literature',
    source: { url: 'https://spinoff.nasa.gov/node/9582', note: 'NASA Spinoff: Fireman’s Air Tanks' },
  },
  {
    id: 'earth-fire-detector',
    label: 'Fire detector',
    value: 'A fire detector related to one used in space shuttle orbiters samples air for combustion particles and tells them apart from dust, signalling before flame or smoke appears.',
    provenance: 'literature',
    source: { url: 'https://spinoff.nasa.gov/node/9407', note: 'NASA Spinoff: Fire Detector' },
  },
  {
    id: 'earth-fire-attire',
    label: 'Firefighter gear',
    value: 'Materials first developed for spacesuits and spacecraft thermal protection were adapted under Project FIRES to upgrade firefighter protective gear.',
    provenance: 'literature',
    source: { url: 'https://spinoff.nasa.gov/node/9918', note: 'NASA Spinoff: New Technology for the Fire Attire' },
  },
  {
    id: 'earth-water-mist',
    label: 'Water-mist extinguisher',
    value: 'Because space station emergency breathing gear does not filter CO2, NASA Glenn and ADA Technologies built a fine-water-mist portable extinguisher that works in any orientation; its zero-leak valve became a commercial product.',
    provenance: 'literature',
    source: { url: 'https://spinoff.nasa.gov/node/11065', note: 'NASA Spinoff: Zero-Leak Valve Holds Tight in Demanding Environments' },
  },
];

/** Which brief finding each Earth technology answers: smoke detection, or the toxic aftermath of a fire. */
export const EARTH_TIES: Record<string, 'smoke' | 'aftermath'> = {
  'earth-fire-detector': 'smoke',
  'earth-water-mist': 'aftermath',
  'earth-air-tanks': 'aftermath',
  'earth-fire-attire': 'aftermath',
};

export const FM2_URL =
  'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/';
export const LUCI_URL = 'https://www.nasa.gov/centers-and-facilities/glenn/nasa-fire-safety-test-took-on-reduced-gravity/';

/** NASA's partial-gravity fire investigations: the vehicles for the tests PSI lacks. Neither is in PSI. */
export const PARTIAL_GRAVITY_FACTS: Fact[] = [
  {
    id: 'vehicle-luci',
    label: 'Lunar-g Combustion Investigation (LUCI)',
    value: 'NASA Glenn and Voyager Technologies burned a plastic rod and a cotton-fiberglass fabric in simulated lunar gravity on a spinning suborbital flight in 2025',
    provenance: 'literature',
    source: { url: LUCI_URL, note: 'NASA: NASA Fire Safety Test Took on Reduced Gravity (2025); results in NTRS 20250010653' },
  },
  {
    id: 'vehicle-fm',
    label: 'Flammability of Materials on the Moon (FM2)',
    value: 'NASA’s first combustion experiment to be performed on another planetary body, burning materials at the Moon’s reduced gravity',
    provenance: 'literature',
    source: { url: FM2_URL, note: 'NASA Glenn: Flammability of Materials on the Moon (FM2)' },
  },
];

const isSaffireVI = (r: LiteratureRow) => /^saffire[-\s]?vi$/i.test(r.mission.trim());

/** All power figures in an outcome string, in watts ("3080 W", "1.5-3.2 kW"). */
function powersW(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*kW\b/g)) out.push(+m[1] * 1000, +m[2] * 1000);
  for (const m of text.matchAll(/(?<![-–.\d])(\d+(?:\.\d+)?)\s*(kW|W)\b/g)) out.push(+m[1] * (m[2] === 'kW' ? 1000 : 1));
  return out;
}

/** True when an outcome reports CO over a crew limit (the 24-hour SMAC in the Saffire VI rows), ignoring negations such as "did not exceed". */
export function reportsCoOverLimit(outcome: string): boolean {
  if (!/\bCO\b/.test(outcome)) return false;
  if (/\b(did\s+not|does\s+not|didn['’]t|doesn['’]t|never|not|no|without)\s+(\w+\s+)?exceed/i.test(outcome)) return false;
  return /\bexceed/i.test(outcome) || />\s*24/.test(outcome);
}

const round1 = (x: number) => Number(x.toFixed(1));

/** Saffire VI aftermath: PMMA fire power range and the O2 level of the burn where CO passed its 24-hour crew limit and CO2 its 1-hour limit. */
export function aftermathFacts(data: HaloData): Fact[] {
  const rows = data.literature.filter(isSaffireVI);
  const facts: Fact[] = [];

  const pmma = rows.filter((r) => /pmma/i.test(r.material));
  const watts = pmma.flatMap((r) => powersW(r.outcome));
  if (watts.length > 0) {
    const url = pmma.find((r) => powersW(r.outcome).length > 0)!.sourceUrl;
    const note = `Saffire VI ${pmma.map((r) => r.sampleId).join(', ')}`;
    facts.push(
      { id: 'aftermath-pmma-power-low', label: 'Saffire VI PMMA fire power, low end', value: round1(Math.min(...watts) / 1000), unit: 'kW', provenance: 'literature', source: { url, note } },
      { id: 'aftermath-pmma-power-high', label: 'Saffire VI PMMA fire power, high end', value: round1(Math.max(...watts) / 1000), unit: 'kW', provenance: 'literature', source: { url, note } },
    );
  }

  const toxic = rows.find((r) => r.o2Pct !== null && reportsCoOverLimit(r.outcome));
  if (toxic) {
    facts.push({
      id: 'aftermath-toxic-oxygen',
      label: 'O2 level of the Saffire VI burn where CO exceeded the 24-hour crew limit (SMAC 100 ppm) and approached the 1-hour limit; CO2 exceeded its 1-hour limit (NASA-STD-3001)',
      value: Math.round(toxic.o2Pct as number),
      unit: '% O2',
      provenance: 'literature',
      source: { url: toxic.sourceUrl, note: `Saffire VI ${toxic.sampleId}: ${toxic.outcome}` },
    });
  }
  return facts;
}
