// Shared types for HALO. Every engine module imports from this file.

export type FuelClass = 'solid' | 'solid_surrogate' | 'droplet' | 'gas';
/**
 * Where a value came from. `computed` is arithmetic on data (counts, ratios,
 * partial pressure, evidence distance); `model` is a fitted statistical model
 * (the FLEX extinction fit) and what it is evaluated at.
 */
export type Provenance = 'measured' | 'assumed' | 'inferred' | 'literature' | 'computed' | 'model' | 'si';
export type MaterialId = 'kapton' | 'teflon' | 'silicone' | 'cotton' | 'pyrell' | 'dbp' | 'pmma' | 'nomex';
export type DetectorId = 'scatter' | 'ionization';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type Hazard = 'ignition' | 'spread' | 'extinction' | 'smoke_detection' | 'suppression' | 'toxicity';
/** Provenance of a test condition value (subset of Provenance). */
export type ConditionSource = 'measured' | 'assumed' | 'inferred';

export interface Habitat {
  name: string;
  o2Pct: number;
  pressurePsia: number;
  flowCmS: number;
  materials: MaterialId[];
  detectors: DetectorId[];
  liquids: boolean;
}

export interface Source { psiId?: string; doi?: string; url?: string; note?: string }

export interface Fact {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  /** Fixed display precision for a numeric value (for example 1 renders 2 as "2.0"). */
  decimals?: number;
  provenance: Provenance;
  source: Source;
}

/** The value as every page and flag shows it: fixed decimals when the fact sets them, else String(value). */
export function factText(f: Pick<Fact, 'value' | 'decimals'>): string {
  return typeof f.value === 'number' && f.decimals !== undefined ? f.value.toFixed(f.decimals) : String(f.value);
}

export interface Flag {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  factIds: string[];
}

// ---- data types (mirror the JSON contract in web/src/data) ----

export interface TestPoint {
  id: string;
  psiId: string;
  acronym: string;
  fuelClass: FuelClass;
  fuel: string;
  o2Pct: number;
  pressurePsia: number;
  o2Src: ConditionSource;
  pSrc: ConditionSource;
}

export interface Publication { title: string; doi: string | null; year: number | null }

export interface Investigation {
  psiId: string;
  acronym: string;
  title: string;
  hardware: string;
  fuelClasses: FuelClass[];
  hazards: Hazard[];
  objective: string;
  researchImpacts: string;
  nRows: number;
  o2Range: [number, number] | null;
  pRangePsia: [number, number] | null;
  flowRangeCmS: [number, number] | null;
  varied: string[];
  publications: Publication[];
  datasetDoi: string;
  license: string;
  startDate: string | null;
  endDate: string | null;
  dateNote: string | null;
}

export interface DetectorRun {
  material: string;
  scatterV: number | null;
  ionizationDV: number | null;
  cmdUm: number | null;
}

export interface DetectorData {
  ambient: { o2Pct: number; pressurePsia: number };
  thresholds: { scatterV: number; ionizationDV: number };
  calibration: string;
  obscurationNote: string;
  runs: DetectorRun[];
}

export interface ExtinctionData {
  diluent: string;
  d0Mm: number;
  features: string[];
  /** 200 bootstrap fits; each row is [intercept, o2Pct, lnD0, lnP]. */
  coefs: number[][];
  o2RangePct: [number, number];
  pRangeAtm: [number, number];
  n: number;
  nExt: number;
  cvAuc: number;
  o2At50: { median: number; lo: number; hi: number };
  source: { psiId: string; doi: string };
}

export interface LiteratureRow {
  mission: string;
  sampleId: string;
  material: string;
  o2Pct: number | null;
  pressurePsia: number | null;
  flowCmS: number | null;
  spreadRateMmS: number | null;
  outcome: string;
  sourceUrl: string;
  confidence: string;
}

/** One SI-written summary for an investigation, keyed by psiId in Summaries. */
export interface Summary {
  summary: string;
  habitatRelevance: string;
  hazards: Hazard[];
  sensors: string[];
  quotes: string[];
  model: string;
  generatedAt: string;
  needsReview?: boolean;
}
export type Summaries = Record<string, Summary>;

export interface Manifest {
  builtAt: string;
  totalRows: number;
  eligibleRows: number;
  files: Record<string, string>;
  psiDatasetDois: Record<string, string>;
}

export interface HaloData {
  tests: TestPoint[];
  investigations: Investigation[];
  detector: DetectorData;
  extinction: ExtinctionData;
  literature: LiteratureRow[];
  summaries: Summaries;
  manifest: Manifest;
}

// ---- engine result types ----

export interface Nearest {
  fuelClass: FuelClass;
  d: number | null;
  test: TestPoint | null;
  o2Gap: number | null;
  pGap: number | null;
  measuredBoth: boolean;
}

export interface RankWeights { proximity: number; fuel: number; hazard: number; richness: number }

export interface RankedInvestigation { inv: Investigation; score: number; parts: RankWeights; why: string[] }

export interface DetectionResult {
  material: MaterialId;
  scatterRuns: number;
  scatterLow: number;
  scatterLowPct: number | null;
  cmdUm: number | null;
  ionizationMedianDV: number | null;
  caughtPct: number | null;
  caughtRuns: number;
  noSameAnalog: boolean;
}

export interface ExtinctionResult {
  o2Pct: number;
  pAtmUsed: number;
  p50: number;
  lo: number;
  hi: number;
  extrapolatedPressure: boolean;
  extrapolatedO2: boolean;
  curve: Array<{ o2: number; p50: number; lo: number; hi: number }>;
}

export interface NextTestCandidate {
  fuelClass: FuelClass;
  o2Pct: number;
  pressurePsia: number;
  score: number;
  gains: Array<{ preset: string; before: number; after: number }>;
}

export interface Brief {
  habitat: Habitat;
  grade: { grade: Grade; reason: string };
  byClass: Record<FuelClass, Nearest>;
  flags: Flag[];
  ranked: RankedInvestigation[];
  detection: DetectionResult[];
  extinction: ExtinctionResult;
  aftermath: Fact[];
  coolFlame: Fact | null;
  nextTests: NextTestCandidate[];
  earth: Fact[];
  facts: Fact[];
  notices: string[];
}
