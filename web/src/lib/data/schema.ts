import { z } from 'zod';
import type { HaloData } from '@/lib/engine/types';

const finite = z.number().finite();
const range = z.tuple([finite, finite]);

export const FuelClassZ = z.enum(['solid', 'solid_surrogate', 'droplet', 'gas']);
export const ConditionSourceZ = z.enum(['measured', 'assumed', 'inferred']);
/** Normalized test end (tests.json `outcome`); only values a PSI table states are mapped, the rest are "unknown". */
export const OutcomeZ = z.enum([
  'extinguished', 'burned-out', 'flow-stopped', 'no-ignition', 'no-hot-ignition', 'cool-flame', 'disrupted', 'spread', 'unknown',
]);
export const DiluentZ = z.enum(['N2', 'CO2', 'He']);
export const HazardZ = z.enum(['ignition', 'spread', 'extinction', 'smoke_detection', 'suppression', 'toxicity']);

export const TestPointZ = z.object({
  id: z.string().min(1),
  psiId: z.string().regex(/^PSI-\d+$/),
  acronym: z.string().min(1),
  fuelClass: FuelClassZ,
  fuel: z.string(),
  o2Pct: finite.min(0).max(100),
  pressurePsia: finite.min(0),
  o2Src: ConditionSourceZ,
  pSrc: ConditionSourceZ,
  // Added in wave 3; optional so older data and the fixtures still parse.
  flowCmS: finite.min(0).nullable().optional(),
  flowSrc: ConditionSourceZ.nullable().optional(),
  outcome: OutcomeZ.optional(),
  diluent: DiluentZ.nullable().optional(),
});

export const InvestigationZ = z.object({
  psiId: z.string().regex(/^PSI-\d+$/),
  acronym: z.string().min(1),
  title: z.string(),
  hardware: z.string(),
  fuelClasses: z.array(FuelClassZ),
  hazards: z.array(HazardZ),
  objective: z.string(),
  researchImpacts: z.string(),
  nRows: z.number().int().min(0),
  o2Range: range.nullable(),
  pRangePsia: range.nullable(),
  flowRangeCmS: range.nullable(),
  varied: z.array(z.string()),
  publications: z.array(
    z.object({ title: z.string(), doi: z.string().nullable(), year: z.number().int().nullable() }),
  ),
  datasetDoi: z.string().min(1),
  license: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  dateNote: z.string().nullable(),
  // Added in wave 3 (optional): sample geometry text, and whether the acronym is PSI's or a HALO label.
  geometry: z.string().optional(),
  acronymSource: z.enum(['psi', 'halo']).optional(),
});

export const DetectorZ = z.object({
  ambient: z.object({ o2Pct: finite, pressurePsia: finite }),
  thresholds: z.object({ scatterV: finite, ionizationDV: finite }).strict(),
  calibration: z.string(),
  obscurationNote: z.string(),
  runs: z.array(
    z.object({
      material: z.string().min(1),
      scatterV: finite.nullable(),
      ionizationDV: finite.nullable(),
      cmdUm: finite.nullable(),
    }),
  ),
});

export const ExtinctionZ = z.object({
  diluent: z.string(),
  d0Mm: finite,
  features: z.array(z.string()),
  coefs: z.array(z.array(finite).length(4)).length(200),
  o2RangePct: range,
  pRangeAtm: range,
  n: z.number().int(),
  nExt: z.number().int(),
  cvAuc: finite,
  o2At50: z.object({ median: finite, lo: finite, hi: finite }),
  source: z.object({ psiId: z.string(), doi: z.string() }),
});

export const LiteratureZ = z.object({
  mission: z.string(),
  sampleId: z.string(),
  material: z.string(),
  o2Pct: finite.nullable(),
  pressurePsia: finite.nullable(),
  flowCmS: finite.nullable(),
  spreadRateMmS: finite.nullable(),
  outcome: z.string(),
  sourceUrl: z.string(),
  /** Every report the row cites, primary first, each labelled by its own title (wave 3, optional). */
  sources: z.array(z.object({ url: z.string(), label: z.string() })).optional(),
  confidence: z.string(),
});

export const SummaryZ = z.object({
  summary: z.string(),
  habitatRelevance: z.string(),
  hazards: z.array(HazardZ),
  sensors: z.array(z.string()),
  quotes: z.array(z.string()),
  model: z.string(),
  generatedAt: z.string(),
  needsReview: z.boolean().optional(),
});

export const ManifestZ = z.object({
  builtAt: z.string(),
  totalRows: z.number().int().min(0),
  eligibleRows: z.number().int().min(0),
  files: z.record(z.string(), z.string()),
  psiDatasetDois: z.record(z.string(), z.string()),
});

export const TestsFileZ = z.array(TestPointZ);
export const InvestigationsFileZ = z.array(InvestigationZ);
export const LiteratureFileZ = z.array(LiteratureZ);
export const SummariesFileZ = z.record(z.string(), SummaryZ);

type Assert<T extends true> = T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type _SchemaMatchesTypes = [
  Assert<Same<z.infer<typeof TestPointZ>, import('@/lib/engine/types').TestPoint>>,
  Assert<Same<z.infer<typeof InvestigationZ>, import('@/lib/engine/types').Investigation>>,
  Assert<Same<z.infer<typeof DetectorZ>, import('@/lib/engine/types').DetectorData>>,
  Assert<Same<z.infer<typeof ExtinctionZ>, import('@/lib/engine/types').ExtinctionData>>,
  Assert<Same<z.infer<typeof LiteratureZ>, import('@/lib/engine/types').LiteratureRow>>,
  Assert<Same<z.infer<typeof SummaryZ>, import('@/lib/engine/types').Summary>>,
  Assert<Same<z.infer<typeof ManifestZ>, import('@/lib/engine/types').Manifest>>,
];

/**
 * Rows with the wave-3 optional fields. HaloData types its arrays with the engine's interfaces; the parsed
 * objects carry these fields too, so these views only widen the static type.
 */
export type TestRow = z.infer<typeof TestPointZ>;
export type InvestigationRow = z.infer<typeof InvestigationZ>;
export type LiteratureEntry = z.infer<typeof LiteratureZ>;
export type Outcome = z.infer<typeof OutcomeZ>;
export const testRows = (d: Pick<HaloData, 'tests'>): TestRow[] => d.tests as TestRow[];
export const investigationRows = (d: Pick<HaloData, 'investigations'>): InvestigationRow[] => d.investigations as InvestigationRow[];
export const literatureRows = (d: Pick<HaloData, 'literature'>): LiteratureEntry[] => d.literature as LiteratureEntry[];

export function parseHaloData(raw: {
  tests: unknown; investigations: unknown; detector: unknown; extinction: unknown;
  literature: unknown; summaries: unknown; manifest: unknown;
}): HaloData {
  return {
    tests: TestsFileZ.parse(raw.tests),
    investigations: InvestigationsFileZ.parse(raw.investigations),
    detector: DetectorZ.parse(raw.detector),
    extinction: ExtinctionZ.parse(raw.extinction),
    literature: LiteratureFileZ.parse(raw.literature),
    summaries: SummariesFileZ.parse(raw.summaries),
    manifest: ManifestZ.parse(raw.manifest),
  };
}
