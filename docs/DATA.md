# HALO data

HALO's numbers come from NASA Physical Sciences Informatics (PSI) combustion-science records and from a short list of Saffire points taken from NASA technical reports. The pipeline in `pipeline/` turns those sources into static JSON in `web/src/data/`, and the web app imports that JSON at build time.

```
data/raw/et/        PSI experimental tables (CSV, one or two per investigation)
data/raw/det/       PSI investigation detail records (JSON: title, objective, DOI, licence, publications)
data/raw/same/      PSI-101 SAME/SAME-R analyzed results workbook (xlsx)
data/literature/    saffire_literature.csv (Saffire I, II, IV, V, VI points from NTRS reports)
        |
        |  cd pipeline && make data
        v
web/src/data/       tests.json, investigations.json, detector.json, extinction.json,
                    literature.json, tests.csv, manifest.json   (summaries.json is written by `make si` only)
```

The experimental tables in `data/raw/et/` and the SAME workbook are unmodified copies of what PSI serves. Every fix below is applied in code, so it can be reviewed and reverted.

The detail records in `data/raw/det/` are **trimmed**. As served, PSI records carry `added`/`removed` version-diff arrays that make them about 20 MB in total, and HALO never reads those arrays. `make trim-raw` (`pipeline/halo_pipeline/trim_raw.py`) keeps only these keys:

- `accession`, `doi`, `title`, `investigationAcronym`, `experimentHardware`
- `objective`, `researchImpacts`, `publications`
- `licenseIdentifier`, `licenseName`, `licenseLink`
- `investigationStartDate`, `investigationEndDate`
- `description`, `approach`, `hypothesis`, `contacts`, `version`

Every kept value is unchanged. To get the full records back, see [`FETCH.md`](FETCH.md).

## Units

| Quantity | Conversion |
|---|---|
| Pressure | psia = atm × 14.696. mmHg ÷ 760 = atm. bar ÷ 1.01325 = atm. |
| O2 | mole fraction × 100 = `o2Pct`. |
| Flow | cm/s as tabulated. |

## Column map by investigation

`o2_src`, `p_src` and `flow_src` record where each value came from. The table shows the raw column behind each normalized field.

| PSI | Investigation | Rows | O2 | Pressure | Flow | Notes |
|---|---|---|---|---|---|---|
| PSI-69 | FLEX | 274 | `O initial ambient composition; mole fraction` × 100 | `Ambient pressure; mmHg` ÷ 760 | quiescent, 0 | Diluent from the He/CO columns, else N2. Outcome from `Test end`. Droplet size from `Droplet initial diameter; mm`. |
| PSI-68 | FLEX-2 | none | `Oxygen Mole Fraction` design list | `Ambient Pressure (atm)` design list | `Flow Velocity` "0.1 - 5" | The table is a design matrix per fuel, with no per-test rows. Only its ranges are used. |
| PSI-39 | CFI | 87 | `Oxygen` × 100 | `Pressure` ("1 atm" strings) | quiescent, 0 | |
| PSI-10 | ACME Flame Design | 207 normal + 120 inverse | `XO2 (init)` (normal), `XO2` (inverse) | `pmean (atm)` | none | Excluded from coverage (see below). Its `o2Range` and `pRangePsia` in `investigations.json` are null: XO2 is the burner-issued oxidizer, not the cabin atmosphere. |
| PSI-159 | ACME CFI-G | 179 normal + 154 inverse | ` XO2 before test` (normal), `XO2` (inverse) | `approx p (bar)` | none | `Hot ignition`, `burn time (sec)` and `Self-ext or flow term` kept. |
| PSI-20 | ACME BRE | 43 (18 test days × listed O2) | `Oxygen Conc (percent)`, a list per day | **inferred** from the objective text: 26.5% ↔ 10.2 psia, 34% ↔ 8.2 psia; other O2 levels have no pressure | quiescent, 0 | One row per (day, O2). `n_tests` = `Flames Ignited` ÷ number of O2 values that day. |
| PSI-23 | ACME s-Flame | 23 | `Atmosphere*` text before "O2" (~21 or ~30) | "~1 atm" table note | none | Diluent He if `Atmosphere*` mentions He. |
| PSI-21 | ACME CLD Flame | 32 | assumed air (no column) | assumed 1 atm | not tabulated | |
| PSI-22 | ACME E-FIELD | 20 | assumed air | assumed 1 atm | not tabulated | Blank-key continuation rows and the duplicated row dropped. |
| PSI-107 | SPICE | 435 | assumed MSG cabin air | assumed 1 atm | `Air Rate (cm/s)` | |
| PSI-106 | SLICE | 12 | assumed air | assumed 1 atm | not tabulated | Table holds only date and fuel. |
| PSI-26 | BASS | 122 | not tabulated | assumed 1 atm | not tabulated | No O2 at all, so no BASS row is eligible. |
| PSI-25 | BASS-II | 129 | `Calibrated  initial O2 % by vol` | assumed 1 atm (MSG) | first number in `Air display` (free text, units assumed cm/s) | |
| PSI-98/99/100 | Saffire-I/II/III | 2 / 9 / 2 | `Percent O2` (mean of the listed values); Saffire-III has no O2 column, so air is assumed | assumed Cygnus cabin ~1 atm | `Air Flow` | |
| PSI-102 | SAME | 8 | assumed air | assumed 1 atm | `Air Flow (cm/s)`, 5 if blank | Detection data. |
| PSI-101 | SAME-R | 109 | assumed air | assumed 1 atm | `Inlet velocity (cm/s)` | Detection data. |
| PSI-47, 60, 62, 115, 117, 142 | ground and analysis grants, DAFT | none | | | | Catalog entries only. PSI-142's table is an index of published figures. |

The unified table holds 1,967 rows.

## Provenance rules

Each free-text source string maps onto `measured | assumed | inferred`. The checks run in this order, and the first match wins:

1. contains "burner-issued": the value is the burner's oxidizer, not the cabin atmosphere. The row is excluded.
2. starts with "table": `measured`.
3. contains "ASSUMED": `assumed`.
4. contains "INFERRED" or "not tabulated": `inferred`.

Any other string is an error, so a new source cannot slip through unclassified.

### Flow and outcome (tests.json, tests.csv)

- **`flowSrc`** has its own mapping: a `table…` source (SPICE coflow, Saffire air flow) is `measured`; `quiescent…` (FLEX and CFI droplets, the BRE burner) is `assumed`, because 0 cm/s is the documented setup, not a reading; BASS-II's `'Air display'` initial value is `inferred` (free text, units assumed cm/s), read by `air_display_flow` in `ingest.py`: a number followed by "cm/s" wins (O5b "49 5 cm/s" → 5); when the leading numbers are fan counts (≥ 40) the first number in parentheses is used (O13a → 5) or the value is null if there is none; a cell that starts with a ramp ("incr to 28", O21) or an upper bound ("<1") is null; otherwise the first number is the initial speed (O22 "4 incr to 26.5" → 4). Rows without a flow value have `flowCmS` and `flowSrc` null.
- **`outcome`** maps only what a PSI table states: FLEX `Test end` (Extinction → `extinguished`, Completion → `burned-out`, Disruption → `disrupted`); CFI-G `Self-ext or flow term` (SE → `extinguished`, meaning the hot flame went out on its own; FT → `flow-stopped`; "-" → `no-hot-ignition`, or `cool-flame` when Comments say "direct cool", as for 21106 F2 and F5; the SE/FT column wins over "Hot ignition", so 21106 F4, logged "Hot ignition: no" with FT and a burn time, is `flow-stopped`); BASS-II rows whose notes say "no ign" (`no-ignition`, O12) or mark an extinction (`extinguished`); Saffire rows with a tabulated spread length (`spread`). Everything else is `unknown`.
- **`diluent`** is set for FLEX only (from the He and CO2 composition columns, else N2); other tables do not log it per test.
- **`tests.csv`** holds the same rows and columns plus a per-row `geometry` (FLEX droplet d0, SPICE nozzle, BRE burner, Saffire thickness written "as logged", with a note where the table value looks mistyped, such as "037 mm", else blank) and the dataset DOI. `/data/files/tests-PSI-n.csv` serves the rows of one investigation.

### Investigation fields

- **`geometry`** is a short sample description per investigation (`GEOMETRY` in `catalog.py`), read from the table size/material columns or, where none exist, from the PSI objective or hardware text. FLEX and SPICE are computed from the rows.
- **`acronymSource`** is `halo` for PSI-60, PSI-62, PSI-115, PSI-117 and PSI-142, whose PSI acronym is blank; HALO's label must not be presented as a PSI acronym.

`investigations.json` ranges (`o2Range`, `pRangePsia`) use only measured or inferred values. When every value for an investigation is assumed (for example SPICE's cabin air), the range is `null` rather than a fake "21–21%".

## Coverage eligibility and exclusions

A row is in `tests.json` only if all of these hold:

- `ambient_valid` is true. Inverse flames (CFI-G, Flame Design) issue O2 from the burner into a fuel ambient, so their O2 is not the cabin O2.
- The acronym is not `ACME Flame Design`.
- It is not SAME or SAME-R. Those runs overheat solids without a flame, so they are detection data rather than burn conditions.
- O2 and pressure are both non-null, and O2 ≤ 100.

That leaves 1,225 eligible rows. Fuel classes:

| Class | Investigations |
|---|---|
| `solid` | BASS, BASS-II, Saffire-I/II/III |
| `solid_surrogate` | ACME BRE (gas burner emulating condensed-fuel burning) |
| `droplet` | FLEX, FLEX-2, CFI |
| `gas` | ACME CFI-G (normal), CLD, s-Flame, E-FIELD, SPICE, SLICE |

## Data-quality fixes

| Issue | Fix |
|---|---|
| The FLEX CSV is cp1252, not UTF-8; it fails on byte 0x96. Several other files start with a UTF-8 BOM. | Read with `utf-8-sig`, falling back to `cp1252`. |
| FLEX test 114 reports an ambient pressure of 0 mmHg. | Pressure set to NaN, so the row is not eligible. |
| BRE `Oxygen Conc` contains "3400%" and "2100%", which are Excel percent-format errors. | Values over 100 are divided by 100 (34, 21). |
| CFI-G inverse table: 861 of 1,015 rows are blank. Flame-type labels mix "Inverse" and "inverse". | Blank rows dropped; labels title-cased. |
| SPICE has 34 exact duplicate rows and 8 negative `Air Rate` values. | Duplicates dropped; negative flows set to NaN. |
| E-FIELD repeats one row in full and uses blank-key continuation rows. | Blank keys and duplicates dropped. |
| Saffire-II has blank materials on two samples, "037 mm" thicknesses and "?-g" mojibake in headers. | Blank material shown as "(see previous row)". The header is matched as written. |
| Saffire-I's PSI record lists 2001-03-02 to 2008-02-28, identical to SAME (PSI-102), which predates the Saffire flights. | `startDate`/`endDate` set to null. `dateNote` reads "PSI date fields appear inconsistent with the flight; see NTRS 20170008805". |
| PSI-10's licence field is blank. | `license` is "unspecified". |
| BASS-II fuel descriptions contain runs of spaces ("100 micron PMMA film   2 cm wide"). | `tests.json` collapses whitespace runs in `fuel` to single spaces. |
| CLD fuel names run "CH5, CH6 …" and s-Flame atmospheres run "N3, N4 …" (Excel auto-increment). | Left as tabulated; neither field drives a number in the app. |

## Smoke detector data (`detector.json`)

Source: the "Material Sort" sheet of the PSI-101 SAME/SAME-R analyzed results workbook, flight runs only (SAME = 1, SAME-R = 2): 154 runs over Kapton, Teflon, Lampwick, Silicone, Pyrell and DBP.

| Field | Column |
|---|---|
| `scatterV` | `ISS Detector Scatter (volts)` |
| `ionizationDV` | `Ion B Delta (volts)` |
| `cmdUm` | `M1/M0 (micro-m)--CMD` (zero or negative values set to null) |

- **Scatter alarm.** 2.0 V is a working proxy. The ISS detector's certified alarm is specified in obscuration, not volts.
- **Ionization threshold.** The 10th percentile (`method="lower"`) of Lampwick Ion B ΔV. Lampwick smoke is well detected by every channel.
- **Obscuration.** Not exported, because Lampwick reads 0 V in most runs. `obscurationNote` gives the count.
- **Counts.** Every count uses only runs where that channel is non-null.
- **Atmosphere.** All runs were in ISS air (21% O2, 1 atm).

## Extinction model (`extinction.json`)

- **Data.** FLEX (PSI-69) rows with N2 diluent and non-null pressure and droplet diameter.
- **Model.** The label is `Test end == "Extinction"`, meaning the flame went out before the droplet burned out. It is a logistic regression (C = 1e6) on `[o2Pct, ln d0Mm, ln pAtm]`.
- **Bootstrap.** 200 resamples using `numpy.random.default_rng(7)`; one-class resamples are skipped. `coefs` holds each fit as `[intercept, o2Pct, lnD0, lnP]`.
- **Outputs.**
  - `o2At50` is the median and 2.5–97.5 percentile of the O2 at which P = 0.5, for a 3 mm droplet at 1 atm.
  - `cvAuc` is the 5-fold stratified cross-validated ROC AUC.
- **Range.** The tested pressure range is 0.7–1.0 atm. The app clamps to it and flags extrapolation.

## Literature (`literature.json`)

`data/literature/saffire_literature.csv` holds Saffire I, II, IV, V and VI points transcribed from NTRS reports (URLs in each row).

- **Excluded row.** V-1 is dropped: it never ignited, and the sources give neither its material nor its atmosphere.
- **Source URL.** When a row cites several reports, `sourceUrl` is the first one listed, which is the report that carries the row's numbers (V-4: Eigenbrod, NTRS 20210017785, the spread-rate source). `sources` keeps every report, labelled by the paper's own title (`NTRS_LABELS` in `literature.py`), so NTRS 20260001992 reads as the Saffire VI paper rather than taking the mission of the first row that cites it.

## Hazard tags

`HAZARDS` in `pipeline/halo_pipeline/catalog.py` tags each of the 24 investigations from its PSI `objective` text. The closed vocabulary is `ignition | spread | extinction | smoke_detection | suppression | toxicity`. `toxicity` covers the smoke and particulate hazard to crew in a sealed cabin. `smoke_detection` is reserved for investigations that produce or validate smoke-detector data (DAFT, SAME, SAME-R and the SAME model), so that detector rankings rest only on detector evidence.

| PSI | Investigation | Tags | Basis in the objective |
|---|---|---|---|
| PSI-10 | ACME Flame Design | extinction | Extinction limits of spherical flames |
| PSI-20 | ACME BRE | extinction | Burning in habitat atmospheres; extinction limits |
| PSI-21 | ACME CLD Flame | extinction | Lift-off and extinction limits of weak coflow flames |
| PSI-22 | ACME E-FIELD | extinction | Stabilized near-limit lifted flames |
| PSI-23 | ACME s-Flame | extinction | Convective and radiative extinction limits |
| PSI-25 | BASS-II | ignition, spread, extinction, suppression | "ignition, flame growth, flame spread, and extinction limits"; data for suppression-system design |
| PSI-26 | BASS | spread, suppression | Material flammability; an inert extinguishing agent |
| PSI-39 | CFI | extinction | Droplet size, pressure and flame extinction |
| PSI-47 | DAFT | smoke_detection | Validating the smoke-aerosol counter used by SAME |
| PSI-60 | SPICE analysis | toxicity | Smoke-point modelling. A smoke point measures soot and smoke production, the particulate-smoke hazard in a sealed cabin. There is no detector data. |
| PSI-62 | BASS spread model | spread, extinction | Concurrent flame spread; flammability limits |
| PSI-68 | FLEX-2 | extinction | Extinction mechanisms and boundaries |
| PSI-69 | FLEX | extinction, suppression | Flammability limits; gaseous suppressants (CO2, He) |
| PSI-98/99/100 | Saffire-I/II/III | spread, extinction | Large-scale fire growth; low-g flammability limits |
| PSI-101 | SAME-R | smoke_detection | Smoke particle size for detection |
| PSI-102 | SAME | smoke_detection | Smoke particle size for detection |
| PSI-106 | SLICE | extinction | Lift-off (blow-off) stability limits |
| PSI-107 | SPICE | toxicity | Smoke points (soot and smoke production). Same reasoning as PSI-60. Not tagged `smoke_detection`, because SPICE has no detector measurements. |
| PSI-115 | SAME smoke model | smoke_detection | Smoke generation in microgravity |
| PSI-117 | FLEX cool-flame CFD | ignition, extinction | Ignition windows and extinction of cool flames |
| PSI-142 | Cool-flame counterflow | extinction | Flammability and extinction limits |
| PSI-159 | ACME CFI-G | ignition, extinction | Cool and hot ignition; self-extinction (`Hot ignition`, `Self-ext or flow term` columns) |

## Licence and citation

PSI data is released under CC0-1.0. HALO cites each investigation by its PSI dataset DOI (`https://doi.org/<doi>`), listed in `manifest.json` under `psiDatasetDois`.

| PSI | DOI | PSI | DOI |
|---|---|---|---|
| PSI-10 | 10.60555/w4zy-bt45 | PSI-69 | 10.60555/mbq8-0451 |
| PSI-20 | 10.60555/vb93-3y72 | PSI-98 | 10.60555/0t15-1z43 |
| PSI-21 | 10.60555/23e1-9950 | PSI-99 | 10.60555/2chp-m469 |
| PSI-22 | 10.60555/se5a-8c73 | PSI-100 | 10.60555/040q-4h36 |
| PSI-23 | 10.60555/k57n-p030 | PSI-101 | 10.60555/2np7-jv14 |
| PSI-25 | 10.60555/4qc4-de67 | PSI-102 | 10.60555/gd4k-8h62 |
| PSI-26 | 10.60555/58h4-dy80 | PSI-106 | 10.60555/pm12-rg61 |
| PSI-39 | 10.60555/m6pj-a914 | PSI-107 | 10.60555/9kbh-e962 |
| PSI-47 | 10.60555/ztgj-d202 | PSI-115 | 10.60555/q0v5-1v28 |
| PSI-60 | 10.60555/mzjm-yv57 | PSI-117 | 10.60555/gz0q-b577 |
| PSI-62 | 10.60555/e9xp-ex83 | PSI-142 | 10.60555/80qf-vj95 |
| PSI-68 | 10.60555/byp8-h018 | PSI-159 | 10.60555/cyt1-kh64 |

HALO is not affiliated with or endorsed by NASA.
