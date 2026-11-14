# The Fire Brief

`buildBrief(habitat, data, notices?)` in `web/src/lib/engine/brief.ts` assembles a one-page Fire Brief. Each number it displays is a `Fact` with a provenance (`measured`, `assumed`, `inferred`, `literature`, `model`, `si`) and a source (PSI id, DOI or URL). Flags refer to facts by id, and text never states a number that is not a Fact value.

## Sections

| Field | Content | Module |
|---|---|---|
| `grade` | Overall readiness grade and the reason for it | `grade.ts` |
| `byClass` | Nearest eligible test per fuel class (`solid`, `solid_surrogate`, `droplet`, `gas`) | `distance.ts` |
| `flags` | Ordered critical, then warning, then info (rules below) | `flags.ts` |
| `ranked` | Investigations ranked for this habitat | `rank.ts` |
| `detection` | SAME smoke-detector evidence per listed material (`[]` when there are no materials) | `detection.ts` |
| `extinction` | Droplet self-extinction probability with a 95% band and a curve | `extinction.ts` |
| `aftermath` | Saffire VI results read from `literature.json` | `facts.ts` |
| `coolFlame` | FLEX cool-flame fact, only when `liquids` is true, otherwise `null` | `facts.ts` |
| `nextTests` | Computed next tests that would close the evidence gap most | `nextTest.ts` |
| `earth` | Three NASA Spinoff facts, each with its Spinoff URL | `facts.ts` |
| `facts` | Every Fact the brief can show, unique by id | `brief.ts` |
| `notices` | Messages from URL parsing, passed through | `url.ts` |

## Flag rules

| Severity | Title | When |
|---|---|---|
| critical | No real cabin material tested at this atmosphere | The nearest `solid` test has d > 1.0, or there is none |
| critical | Your detector would likely miss `<material>` smoke | One per material where the selected detectors catch under 50% of SAME runs. A material with no runs (for example PMMA, which has no SAME analog) has no data and is never treated as 0% |
| warning | Smoke data only exists at ISS air | Habitat O2 > 23% or pressure < 13 psia |
| warning | Pressure outside tested range | The extinction model had to clamp pressure (`extrapolatedPressure`) |
| warning | Droplet flames unlikely to self-extinguish | `liquids` is true and the median extinction probability is below 0.1 |
| info | No partial-gravity data in PSI | Always |

Each flag lists `factIds`. Each id resolves in `brief.facts`, and each number in the flag's title or detail equals `String(value)` of one of those facts.

## Fact ids and provenance

Fact ids use lowercase letters and hyphens only, with no digits. An "x of y" figure is two facts, so a validator can match each number on its own.

| Id pattern | Provenance | Source |
|---|---|---|
| `det-<material>-scatter-low`, `det-<material>-scatter-runs` | measured | SAME investigation PSI id and dataset DOI |
| `det-<material>-<detectors>-low`, `-runs` (combos other than scatter alone) | model / measured | SAME |
| `det-ambient-oxygen`, `det-ambient-pressure` | assumed | SAME |
| `cov-solid-distance` | model | PSI id and DOI of the nearest solid test |
| `cov-solid-oxygen`, `cov-solid-pressure` | the test's `o2Src` / `pSrc` | same |
| `cov-solid-count` | measured | PSI ids searched |
| `ext-pressure-min`, `ext-pressure-max` | measured | extinction model source (FLEX) |
| `ext-pressure-used`, `ext-probability`, `ext-probability-lo`, `ext-probability-hi`, `ext-droplet-size` | model | FLEX |
| `psi-investigations` | measured | PSI ids of all investigations |
| `aftermath-pmma-power-low`, `aftermath-pmma-power-high` | literature | Saffire VI rows; values parsed from the PMMA outcome text |
| `aftermath-toxic-oxygen` | literature | The Saffire VI row whose outcome reports CO over its limit |
| `flex-cool-flame` | literature | DOI 10.1016/j.combustflame.2012.07.012 |
| `bass-test-one` | literature | A Researcher's Guide to: Combustion Science (2015) |
| `earth-air-tanks`, `earth-fire-detector`, `earth-fire-attire` | literature | spinoff.nasa.gov nodes 9582, 9407, 9918 |

## URL parameters

`habitatToQuery(h)` and `queryToHabitat(searchParams)` in `web/src/lib/engine/url.ts`.

| Param | Meaning | Rule |
|---|---|---|
| `o2` | O2 percent | Number, clamped to 0–100 |
| `p` | Pressure, psia | Number, clamped to 0.5–20 |
| `f` | Flow, cm/s | Number, clamped to 0–50 |
| `m` | Materials, comma list | Known ids: kapton, teflon, silicone, cotton, pyrell, dbp, pmma, nomex. Unknown ids are dropped. Empty means none |
| `d` | Detectors, comma list | `scatter`, `ionization`. Unknown ids are dropped. Empty (or nothing valid) means `scatter` |
| `l` | Liquids present | `0` or `1` |
| `n` | Habitat name | Trimmed, `<` and `>` removed, at most 60 characters |

A missing parameter takes its default silently (the Artemis Base preset values; name "Custom habitat"). A parameter that is present but invalid adds exactly one notice: a non-numeric value (which falls back to the Artemis value), an out-of-range value (which is clamped), unknown materials or detectors, or an `l` other than 0 or 1.

Example:

```
/brief?o2=34&p=8.2&f=10&m=kapton,teflon,cotton&d=scatter&l=0&n=Artemis%20Base
```
