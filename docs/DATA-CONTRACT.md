# Data contract

The pipeline writes JSON files to `web/src/data/`. The web app imports them statically (no runtime file reads) and validates them once with zod in `web/src/lib/data/schema.ts`. `HALO_DATA` (`web/src/lib/data/load.ts`) is the parsed result. Tests use small hand-made copies in `web/tests/fixtures/`, loaded by `loadFixtureData()`.

| File | Zod schema | Shape |
|---|---|---|
| `tests.json` | `TestPointZ` (array) | `[{id, psiId, acronym, fuelClass, fuel, o2Pct, pressurePsia, o2Src, pSrc}]`. One row per eligible burn condition. `fuelClass` is `solid`, `solid_surrogate`, `droplet` or `gas`. `o2Src` and `pSrc` are `measured`, `assumed` or `inferred`. |
| `investigations.json` | `InvestigationZ` (array) | One record per PSI investigation (24): title, hardware, `fuelClasses`, `hazards` (`ignition`, `spread`, `extinction`, `smoke_detection`, `suppression`, `toxicity`), objective, research impacts, `nRows`, tested ranges (`o2Range`, `pRangePsia`, `flowRangeCmS`, each `[lo, hi]` or null), `varied`, `publications`, `datasetDoi`, `license`, dates (nullable) and `dateNote`. |
| `detector.json` | `DetectorZ` | `{ambient, thresholds:{scatterV, ionizationDV}, calibration, obscurationNote, runs:[{material, scatterV, ionizationDV, cmdUm}]}`. Channel values are null when not recorded. There is no obscuration field; `obscurationNote` explains why. |
| `extinction.json` | `ExtinctionZ` | Bootstrap logistic model for FLEX droplets (N2 diluent): `coefs` is 200 rows of `[intercept, o2Pct, lnD0, lnP]`, plus fit ranges (`o2RangePct`, `pRangeAtm`), `n`, `nExt`, `cvAuc`, `o2At50` and `source`. |
| `literature.json` | `LiteratureZ` (array) | Published Saffire results: mission, sample, material, conditions (nullable), outcome, `sourceUrl`, `confidence`. |
| `summaries.json` | `SummariesFileZ` (record of `SummaryZ`) | Keyed by `psiId`: `{text, model, factIds}`. Written only by the summary build step (`make si`); `make data` never touches it. Initially `{}`. |
| `manifest.json` | `ManifestZ` | `{builtAt, totalRows, eligibleRows, files:{name: sha256}, psiDatasetDois:{psiId: doi}}`. The full dataset has `totalRows` 1967 and `eligibleRows` 1225. |

## Provenance vocabulary

Every number shown to the user is a `Fact` with one of these provenance values and a source (`psiId`, `doi` and/or `url`):

- `measured`: reported in the PSI data tables.
- `assumed`: not recorded in the dataset; assumed from the experiment's documented setup (for example ISS cabin pressure).
- `inferred`: derived from other recorded quantities or described only in text.
- `literature`: taken from a published paper or report.
- `model`: computed by HALO from the data (distance, ranking, extinction probability).
- `si`: wording written by an LLM; it never introduces a number that is not a `Fact` value.

Test-condition fields (`o2Src`, `pSrc`) use only the first three values.

## Placeholders

Until the pipeline has run, `web/src/data/*.json` (except `summaries.json`) are copies of the fixtures, recognizable by `manifest.totalRows === 30`. Tests that need the full dataset skip while this is true.
