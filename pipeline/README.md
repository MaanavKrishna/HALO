# HALO data pipeline

This pipeline rebuilds HALO's static JSON data contract (`web/src/data/*.json`) from the NASA PSI tables vendored in `data/`. Sources, column mappings and data-quality fixes are documented in [`docs/DATA.md`](../docs/DATA.md).

## Setup

You need Python 3.12 or later. All commands run from `pipeline/`.

```bash
cd pipeline
make venv          # python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

The versions in `requirements.txt` are pinned. The API client package in it is only used by the later summary step (`make si`).

## Build the data

```bash
make data          # .venv/bin/python -m halo_pipeline.cli all
```

This writes the following files to `../web/src/data/`. Each run overwrites them, and the same inputs always give the same output apart from `builtAt`.

| File | Contents |
|---|---|
| `tests.json` | Rows eligible for habitat coverage: O2, pressure, fuel class and provenance. |
| `investigations.json` | The 24 PSI combustion investigations: hazards, tested ranges, publications, DOI. |
| `detector.json` | SAME/SAME-R smoke-detector runs and alarm thresholds. |
| `extinction.json` | 200 bootstrap fits of the FLEX droplet extinction boundary. |
| `literature.json` | Saffire points taken from NASA technical reports. |
| `manifest.json` | Build time, row counts, sha256 of each file, PSI dataset DOIs. |

`make data` never writes `summaries.json`. That file is owned by `make si`. To write somewhere else, pass `--out DIR` to the CLI.

The run prints every data-quality fix it applied (`qa:` lines) and the size of each file.

## Modules (`halo_pipeline/`)

| Module | What it does |
|---|---|
| `paths.py` | Repo-relative locations of the raw data and the output directory. |
| `ingest.py` | `load_unified()` reads every PSI experimental table and normalizes it into one row per test (1,967 rows). Each value carries provenance strings (`o2_src`, `p_src`, `flow_src`), and the data-quality fixes are applied here. |
| `coverage.py` | `eligible_tests(df)` applies the coverage eligibility filter. It maps provenance onto `measured \| assumed \| inferred` and assigns fuel classes. |
| `detector.py` | `build_detector()` reads the SAME/SAME-R results workbook. It returns per-run scatter, ionization ΔV and count mean diameter, plus the thresholds. |
| `extinction.py` | `fit_extinction(df, n_boot=200, seed=7)` fits the bootstrapped logistic extinction boundary on N2-diluent FLEX droplets. |
| `catalog.py` | `build_investigations(df)` builds the 24 catalog entries from the PSI detail records. `HAZARDS` is the hand-written hazard tag for each investigation. |
| `literature.py` | `build_literature()` turns the Saffire literature CSV into JSON. |
| `export.py` | `export_all(out_dir)` builds everything, writes compact JSON and writes the manifest. |
| `cli.py` | The command-line entry point (`python -m halo_pipeline.cli all`). |
| `trim_raw.py` | `make trim-raw` rewrites `../data/raw/det/*.json` to keep only the fields HALO uses (see `docs/DATA.md`). |

## Tests

```bash
make test          # .venv/bin/pytest -q
```

| Test file | What it pins |
|---|---|
| `test_ingest.py` | Row counts per investigation, the cp1252 read, the FLEX test 114 pressure fix, and no BRE O2 over 100. |
| `test_coverage.py` | The eligibility count, the exclusions, the source vocabulary, and the Moon-window composition (≥ 30% O2 at ≤ 10.2 psia). |
| `test_detector.py` | The detector blind-spot counts, the ionization threshold, and that obscuration is absent. |
| `test_extinction.py` | The O2 at 50% extinction, coefficient shape, monotonicity and determinism. |
| `test_catalog.py` | All 24 investigations are present, each with a hazard and a dataset DOI. |
| `test_literature.py` | The literature row shape. |
| `test_trim_raw.py` | The vendored detail records are trimmed, contain every required key, and total under 2 MB. |
| `test_export.py` | The output files, the size budget, the manifest hashes, and that `summaries.json` is left untouched. |
