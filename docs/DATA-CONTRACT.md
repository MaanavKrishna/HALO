# Data contract

The pipeline writes JSON files to `web/src/data/`. The web app imports them statically (no runtime file reads) and validates them once with zod in `web/src/lib/data/schema.ts`. `HALO_DATA` (`web/src/lib/data/load.ts`) is the parsed result. Tests use small hand-made copies in `web/tests/fixtures/`, loaded by `loadFixtureData()`.

| File | Zod schema | Shape |
|---|---|---|
| `tests.json` | `TestPointZ` (array) | `[{id, psiId, acronym, fuelClass, fuel, o2Pct, pressurePsia, o2Src, pSrc}]`. One row per eligible burn condition. `fuelClass` is `solid`, `solid_surrogate`, `droplet` or `gas`. `o2Src` and `pSrc` are `measured`, `assumed` or `inferred`. Optional (wave 3): `flowCmS` (number ≥ 0 or null), `flowSrc` (`measured`/`assumed`/`inferred` or null, null exactly when `flowCmS` is null), `outcome` (`extinguished`, `burned-out`, `flow-stopped`, `no-ignition`, `no-hot-ignition`, `cool-flame`, `disrupted`, `spread`, `unknown`; CFI-G "-" rows are `no-hot-ignition` or `cool-flame`, never `no-ignition`), `diluent` (`N2`, `CO2`, `He`, or null; FLEX only). |
| `investigations.json` | `InvestigationZ` (array) | One record per PSI investigation (24): title, hardware, `fuelClasses`, `hazards` (`ignition`, `spread`, `extinction`, `smoke_detection`, `suppression`, `toxicity`), objective, research impacts, `nRows`, tested ranges (`o2Range`, `pRangePsia`, `flowRangeCmS`, each `[lo, hi]` or null), `varied`, `publications`, `datasetDoi`, `license`, dates (nullable) and `dateNote`. Optional (wave 3): `geometry` (sample shape and size text) and `acronymSource` (`psi`, or `halo` when PSI's acronym is blank and HALO assigned the label). |
| `detector.json` | `DetectorZ` | `{ambient, thresholds:{scatterV, ionizationDV}, calibration, obscurationNote, runs:[{material, scatterV, ionizationDV, cmdUm}]}`. Channel values are null when not recorded. There is no obscuration field; `obscurationNote` explains why. |
| `extinction.json` | `ExtinctionZ` | Bootstrap logistic model for FLEX droplets (N2 diluent): `coefs` is 200 rows of `[intercept, o2Pct, lnD0, lnP]`, plus fit ranges (`o2RangePct`, `pRangeAtm`), `n`, `nExt`, `cvAuc`, `o2At50` and `source`. |
| `literature.json` | `LiteratureZ` (array) | Published Saffire results: mission, sample, material, conditions (nullable), outcome, `sourceUrl` (primary report), optional `sources` (`[{url, label}]`, every report the row cites, primary first), `confidence`. |
| `summaries.json` | `SummariesFileZ` (record of `SummaryZ`) | Keyed by `psiId`: `{summary, habitatRelevance, hazards, sensors, quotes, model, generatedAt, needsReview?}` (`hazards` uses the same vocabulary as investigations). Written only by the summary build step (`make si`); `make data` never touches it. Initially `{}`. |
| `tests.csv` | none (plain CSV) | The `tests.json` rows for modelers, header `id,psiId,acronym,fuelClass,fuel,geometry,o2Pct,o2Src,pressurePsia,pSrc,flowCmS,flowSrc,outcome,diluent,datasetDoi`, one line per eligible row; blank = null. Served at `/data/files/tests.csv`; per investigation at `/data/files/tests-PSI-n.csv`. |
| `manifest.json` | `ManifestZ` | `{builtAt, totalRows, eligibleRows, files:{name: sha256}, psiDatasetDois:{psiId: doi}}`; `files` covers the five JSON files and `tests.csv`. The full dataset has `totalRows` 1967 and `eligibleRows` 1225. |

## Provenance vocabulary

Every number shown to the user is a `Fact` with one of these provenance values and a source (`psiId`, `doi` and/or `url`):

- `measured`: reported in the PSI data tables.
- `assumed`: not recorded in the dataset; assumed from the experiment's documented setup (for example ISS cabin pressure).
- `inferred`: derived from other recorded quantities or described only in text.
- `literature`: taken from a published paper or report.
- `computed`: arithmetic on the data (counts, shares, evidence distance, partial pressure).
- `model`: estimated by a fitted statistical model (the FLEX extinction fit).
- `si`: wording written by an LLM; it never introduces a number that is not a `Fact` value.

Test-condition fields (`o2Src`, `pSrc`) use only the first three values.

## Placeholders

Until the pipeline has run, `web/src/data/*.json` (except `summaries.json`) are copies of the fixtures, recognizable by `manifest.totalRows === 30`. Tests that need the full dataset skip while this is true.

## Wave-3 fields in TypeScript

The engine interfaces in `web/src/lib/engine/types.ts` do not list the optional fields; `HALO_DATA` still carries them. Use `testRows`, `investigationRows` and `literatureRows` from `web/src/lib/data/schema.ts` for typed access. Any type that adds them must keep them optional so the `Same<>` schema assertions hold.
