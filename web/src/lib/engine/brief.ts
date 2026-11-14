import { nearestByClass } from './distance';
import { detectionFor } from './detection';
import { extinctionAt } from './extinction';
import { aftermathFacts, BASS_FACT, COOL_FLAME_FACT, EARTH_FACTS } from './facts';
import { buildFlags, detectionFacts } from './flags';
import { overallGrade } from './grade';
import { nextTests } from './nextTest';
import { rankInvestigations } from './rank';
import type { Brief, Fact, Habitat, HaloData, Source } from './types';

export const HABITAT_SOURCE: Source = { note: 'Habitat definition from the brief URL' };

/** The habitat's own inputs as Facts, so text describing the habitat cites habitat-* ids. */
export function habitatFacts(h: Habitat): Fact[] {
  return [
    { id: 'habitat-oxygen', label: 'Habitat O2', value: h.o2Pct, unit: '%', provenance: 'assumed', source: HABITAT_SOURCE },
    { id: 'habitat-pressure', label: 'Habitat total pressure', value: h.pressurePsia, unit: 'psia', provenance: 'assumed', source: HABITAT_SOURCE },
    { id: 'habitat-flow', label: 'Habitat cabin air flow', value: h.flowCmS, unit: 'cm/s', provenance: 'assumed', source: HABITAT_SOURCE },
  ];
}

export type { Brief };

/** Dedupe by id, keeping the first occurrence. */
function uniqueFacts(facts: Fact[]): Fact[] {
  const seen = new Set<string>();
  return facts.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

/**
 * Assemble the Fire Brief for a habitat. `facts` holds every Fact the brief
 * can display; flags reference them by id. `notices` are passed through from
 * URL parsing.
 */
export function buildBrief(h: Habitat, data: HaloData, notices: string[] = []): Brief {
  const byClass = nearestByClass(h, data.tests);
  const grade = overallGrade(byClass);
  const detection = detectionFor(h.materials, h.detectors, data.detector);
  const extinction = extinctionAt(h, data.extinction);
  const detFacts = detectionFacts(detection, h.detectors, data);
  const { flags, facts: flagFacts } = buildFlags(h, data, byClass, detection, extinction, detFacts);
  const aftermath = aftermathFacts(data);
  const coolFlame = h.liquids ? COOL_FLAME_FACT : null;
  const earth = EARTH_FACTS;

  const facts = uniqueFacts([
    ...habitatFacts(h),
    ...detFacts,
    ...flagFacts,
    ...aftermath,
    ...(coolFlame ? [coolFlame] : []),
    BASS_FACT,
    ...earth,
  ]);

  return {
    habitat: h,
    grade,
    byClass,
    flags,
    ranked: rankInvestigations(h, data),
    detection,
    extinction,
    aftermath,
    coolFlame,
    nextTests: nextTests(data.tests),
    earth,
    facts,
    notices: [...notices],
  };
}
