import { nearestByClass } from './distance';
import { detectionFor } from './detection';
import { extinctionAt } from './extinction';
import { aftermathFacts, BASS_FACT, COOL_FLAME_FACT, EARTH_FACTS } from './facts';
import { buildFlags, detectionFacts } from './flags';
import { FLOW_GUIDE_MINIMUM, FLOW_GUIDE_UPSTREAM, flowCoverage, flowFacts, literatureFlowPair } from './flow';
import { classGrade, GRADE_RINGS, overallGrade } from './grade';
import { archiveGains, nextTests, nextTestsIfArchived } from './nextTest';
import { rankInvestigations } from './rank';
import type { Brief, Fact, Flag, FuelClass, GradeResult, Habitat, HaloData, Nearest, Source } from './types';

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

export const PSI_SEARCH_URL = 'https://psi.nasa.gov/physci/repo/search?q=combustion';
const GRADE_NOTE = 'HALO evidence grade: the nearest eligible PSI test per fuel class, graded by evidence-distance rings (see /method)';

/** A nearest test's dataset as a source, else the PSI combustion search. */
function nearSource(n: Nearest, data: HaloData): Source {
  if (!n.test) return { url: PSI_SEARCH_URL, note: GRADE_NOTE };
  const doi = data.manifest.psiDatasetDois[n.test.psiId];
  return doi ? { psiId: n.test.psiId, doi, note: GRADE_NOTE } : { psiId: n.test.psiId, note: GRADE_NOTE };
}
const r2 = (x: number) => Number(x.toFixed(2));
const GRADE_CLASSES: Array<[FuelClass, string, string]> = [
  ['solid', 'grade-solid', 'real cabin solids'],
  ['solid_surrogate', 'grade-solid-surrogate', 'solid surrogates (gas burners that mimic a burning solid)'],
  ['droplet', 'grade-droplet', 'liquid droplets'],
  ['gas', 'grade-gas', 'gas flames'],
];

/**
 * The grade as facts, so text that explains it (Ask HALO included) can cite
 * it: the letter, the plain and technical reasons, the per-class letters,
 * and each number the reason uses as its own numeric fact.
 */
export function gradeFacts(g: GradeResult, byClass: Record<FuelClass, Nearest>, data: HaloData): Fact[] {
  const GRADE_SOURCE = nearSource(byClass.solid, data);
  const out: Fact[] = [
    { id: 'grade-overall', label: 'Evidence Readiness grade (A: tested close by; F: untested)', value: g.grade, provenance: 'computed', source: GRADE_SOURCE },
    { id: 'grade-reason', label: 'Why the evidence grade is what it is (plain language)', value: g.reason, provenance: 'computed', source: GRADE_SOURCE },
    { id: 'grade-reason-technical', label: 'The grade rule as applied to this habitat', value: g.technical, provenance: 'computed', source: GRADE_SOURCE },
  ];
  for (const [c, id, word] of GRADE_CLASSES) {
    out.push({ id, label: `Evidence grade for ${word} alone`, value: classGrade(byClass[c]), provenance: 'computed', source: nearSource(byClass[c], data) });
  }
  const s = byClass.solid;
  const sur = byClass.solid_surrogate;
  if (s.d !== null) out.push({ id: 'grade-solid-distance', label: 'Evidence distance from the habitat to the nearest real cabin solid test', value: r2(s.d), provenance: 'computed', source: GRADE_SOURCE });
  if (sur.d !== null) out.push({ id: 'grade-surrogate-distance', label: 'Evidence distance from the habitat to the nearest solid-surrogate test', value: r2(sur.d), provenance: 'computed', source: nearSource(sur, data) });
  const [b, c, d] = GRADE_RINGS;
  out.push(
    { id: 'grade-ring-b', label: 'Evidence distance limit for grade B (A when O2 and pressure are both measured)', value: b, provenance: 'computed', source: GRADE_SOURCE },
    { id: 'grade-ring-c', label: 'Evidence distance limit for grade C', value: c, provenance: 'computed', source: GRADE_SOURCE },
    { id: 'grade-ring-d', label: 'Evidence distance limit for grade D (beyond it, F)', value: d, provenance: 'computed', source: GRADE_SOURCE },
  );
  return out;
}

/** Each flag as a text fact (title as label, detail as value), so an explanation can cite the finding itself. */
export function flagFacts(flags: Flag[], facts: Fact[]): Fact[] {
  const byId = new Map(facts.map((f) => [f.id, f]));
  return flags.map((f) => ({
    id: `flag-${f.id}`,
    label: `${f.severity === 'critical' ? 'Critical finding' : f.severity === 'warning' ? 'Caution' : 'Note'}: ${f.title}`,
    value: f.detail,
    provenance: 'computed',
    source: {
      ...(f.factIds.map((id) => byId.get(id)?.source).find((src) => src && (src.psiId || src.doi || src.url)) ?? { url: PSI_SEARCH_URL }),
      note: `HALO finding; its numbers cite ${f.factIds.join(', ') || 'no facts'}`,
    },
  }));
}

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
  const flow = flowCoverage(h, data.tests, data.investigations, byClass);
  const flowF = flowFacts(flow, byClass, data);
  const litFlow = literatureFlowPair(data);
  const detection = detectionFor(h.materials, h.detectors, data.detector);
  const extinction = extinctionAt(h, data.extinction);
  const detFacts = detectionFacts(detection, h.detectors, data);
  const { flags, facts: flagFactList } = buildFlags(h, data, byClass, detection, extinction, detFacts, flow, flowF);
  const aftermath = aftermathFacts(data);
  const coolFlame = h.liquids ? COOL_FLAME_FACT : null;
  const earth = EARTH_FACTS;

  const facts = uniqueFacts([
    ...habitatFacts(h),
    ...gradeFacts(grade, byClass, data),
    ...flagFacts(flags, [...habitatFacts(h), ...detFacts, ...flagFactList]),
    ...detFacts,
    ...flagFactList,
    ...flowF,
    FLOW_GUIDE_MINIMUM,
    FLOW_GUIDE_UPSTREAM,
    ...(litFlow ? litFlow.facts : []),
    ...aftermath,
    ...(coolFlame ? [coolFlame] : []),
    BASS_FACT,
    ...earth,
  ]);

  return {
    habitat: h,
    grade,
    byClass,
    flow,
    flags,
    ranked: rankInvestigations(h, data),
    detection,
    extinction,
    aftermath,
    coolFlame,
    nextTests: nextTests(data.tests),
    nextTestsIfArchived: nextTestsIfArchived(data),
    archiveGains: archiveGains(data),
    earth,
    facts,
    notices: [...notices],
  };
}
