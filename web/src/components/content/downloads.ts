import detector from "@/data/detector.json";
import extinction from "@/data/extinction.json";
import investigations from "@/data/investigations.json";
import literature from "@/data/literature.json";
import manifest from "@/data/manifest.json";
import summaries from "@/data/summaries.json";
import tests from "@/data/tests.json";

/**
 * The public data contract, served as static JSON copies of the bundled
 * files (no secrets live in these files; they are already in the client
 * bundle). Order is the order the Data page lists them.
 */
export const DOWNLOADS = [
  { file: "tests.json", body: tests, what: "Every eligible test point: fuel class, O2, pressure and where each value came from." },
  { file: "investigations.json", body: investigations, what: "One record per PSI investigation: objective, ranges, hazards, publications, dataset DOI, licence." },
  { file: "detector.json", body: detector, what: "SAME/SAME-R smoke runs: scatter and ionization readings, particle size, alarm thresholds." },
  { file: "extinction.json", body: extinction, what: "The FLEX droplet model: bootstrap coefficients, tested ranges, CV AUC and the 50% point." },
  { file: "literature.json", body: literature, what: "Saffire points transcribed from NASA technical reports, with a source URL per row." },
  { file: "summaries.json", body: summaries, what: "Build-time SI summaries of each investigation, validated against the PSI record." },
  { file: "manifest.json", body: manifest, what: "Build time, row counts, the sha256 of each file and every PSI dataset DOI." },
] as const;

export type DownloadFile = (typeof DOWNLOADS)[number]["file"];

export const downloadHref = (file: string) => `/data/files/${file}`;
