import { z } from 'zod';

const finite = z.number().finite();
const range = z.tuple([finite, finite]);

export const FuelClassZ = z.enum(['solid', 'solid_surrogate', 'droplet', 'gas']);
export const ConditionSourceZ = z.enum(['measured', 'assumed', 'inferred']);
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
  confidence: z.string(),
});

export const SummaryZ = z.object({
  text: z.string(),
  model: z.string(),
  factIds: z.array(z.string()),
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

import type { HaloData } from '@/lib/engine/types';

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
  } as HaloData;
}
