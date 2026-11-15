import { readFile } from "node:fs/promises";
import { join } from "node:path";
import manifest from "@/data/manifest.json";

/**
 * The public data contract, served byte-for-byte as the files in
 * web/src/data (read once at build time, so the routes prerender). These are
 * the same files already bundled into the app; none holds a secret. Files
 * listed in manifest.json carry the sha256 the pipeline recorded.
 */
const LIST = [
  { file: "tests.json", what: "Every eligible test point: fuel class, O2, pressure, flow, outcome and where each value came from." },
  { file: "tests.csv", what: "The same eligible test rows as CSV for modelers: fuel, geometry, O2, pressure, flow, outcome, provenance and dataset DOI." },
  { file: "investigations.json", what: "One record per PSI investigation: objective, sample geometry, ranges, hazards, publications, dataset DOI, licence." },
  { file: "detector.json", what: "SAME/SAME-R smoke runs: scatter and ionization readings, particle size, alarm thresholds." },
  { file: "extinction.json", what: "The FLEX droplet model: bootstrap coefficients, tested ranges, CV AUC and the 50% point." },
  { file: "literature.json", what: "Saffire points transcribed from NASA technical reports, with a source URL per row." },
  { file: "summaries.json", what: "Build-time SI summaries of each investigation, validated against the PSI record." },
  { file: "manifest.json", what: "Build time, row counts, the sha256 of each pipeline file and every PSI dataset DOI." },
] as const;

const DATA_DIR = join(process.cwd(), "src/data");
const bodies = await Promise.all(LIST.map((d) => readFile(join(DATA_DIR, d.file))));
const hashes = manifest.files as Record<string, string>;

export const DOWNLOADS = LIST.map((d, i) => ({
  ...d,
  body: bodies[i],
  bytes: bodies[i].byteLength,
  sha256: hashes[d.file] ?? null,
  contentType: d.file.endsWith(".csv") ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
}));

export const downloadHref = (file: string) => `/data/files/${file}`;

/** tests.csv narrowed to one investigation (served at /data/files/tests-PSI-n.csv; not in the manifest). */
export const testsCsvFile = (psiId: string) => `tests-${psiId}.csv`;
const CSV = DOWNLOADS.find((d) => d.file === "tests.csv");
const csvLines = CSV ? CSV.body.toString("utf-8").split("\n").filter(Boolean) : [];

/** Header plus the rows of one investigation; every row id starts with "<psiId>:". Null if none. */
export function investigationCsv(psiId: string): string | null {
  if (!csvLines.length) return null;
  const rows = csvLines.slice(1).filter((l) => l.startsWith(`${psiId}:`));
  return rows.length ? [csvLines[0], ...rows].join("\n") + "\n" : null;
}

export const investigationCsvRows = (psiId: string) => csvLines.slice(1).filter((l) => l.startsWith(`${psiId}:`)).length;
