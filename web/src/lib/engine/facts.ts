import type { Fact, HaloData, LiteratureRow } from './types';

/**
 * Fixed and literature-derived facts. Text facts are quoted from their sources;
 * numeric aftermath facts are read from the Saffire VI rows in literature.json.
 */

export const BASS_GUIDE_URL = 'https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/';
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
  value: 'NASA-STD-6001 Test 1 is not conservative…',
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
    value: 'A fire detector first flown on the space shuttle samples air for combustion particles and tells them apart from dust, signalling before flame or smoke appears.',
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
];

const isSaffireVI = (r: LiteratureRow) => /^saffire[-\s]?vi$/i.test(r.mission.trim());

/** All power figures in an outcome string, in watts ("3080 W", "1.5-3.2 kW"). */
function powersW(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*kW\b/g)) out.push(+m[1] * 1000, +m[2] * 1000);
  for (const m of text.matchAll(/(?<![-–.\d])(\d+(?:\.\d+)?)\s*(kW|W)\b/g)) out.push(+m[1] * (m[2] === 'kW' ? 1000 : 1));
  return out;
}

const round1 = (x: number) => Number(x.toFixed(1));

/** Saffire VI aftermath: PMMA fire power range and the O2 level at which CO and CO2 exceeded crew limits. */
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

  const toxic = rows.find((r) => r.o2Pct !== null && /\bCO\b/.test(r.outcome) && /(exceed|>\s*24)/i.test(r.outcome));
  if (toxic) {
    facts.push({
      id: 'aftermath-toxic-oxygen',
      label: 'O2 level of the Saffire VI burn where CO and CO2 exceeded crew exposure limits',
      value: Math.round(toxic.o2Pct as number),
      unit: '% O2',
      provenance: 'literature',
      source: { url: toxic.sourceUrl, note: `Saffire VI ${toxic.sampleId}: ${toxic.outcome}` },
    });
  }
  return facts;
}
