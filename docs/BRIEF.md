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
| warning | Droplet-fuel pressure outside tested range | `liquids` is true and the droplet extinction model had to clamp pressure (`extrapolatedPressure`); the model covers droplet fuels only |
| warning | Droplet flames unlikely to self-extinguish | `liquids` is true and the median extinction probability is below 0.1 |
| info | No partial-gravity data in PSI | Always |

Each flag lists `factIds`. Each id resolves in `brief.facts`, and each number in the flag's title or detail equals `String(value)` of one of those facts.

## Fact ids and provenance

`source.psiId` always holds a single PSI id, so the UI can link it; lists of ids go in `source.note`. Fact ids use lowercase letters and hyphens only, with no digits. An "x of y" figure is two facts, so a validator can match each number on its own.

| Id pattern | Provenance | Source |
|---|---|---|
| `det-<material>-scatter-low`, `det-<material>-scatter-runs` | measured | SAME investigation PSI id and dataset DOI |
| `det-<material>-<detectors>-low`, `-runs` (combos other than scatter alone) | inferred / measured | SAME |
| `det-ambient-oxygen`, `det-ambient-pressure` | assumed | SAME |
| `cov-solid-distance` | model | PSI id and DOI of the nearest solid test |
| `cov-solid-oxygen`, `cov-solid-pressure` | the test's `o2Src` / `pSrc` | same |
| `cov-solid-count` | measured | Note listing the PSI ids searched |
| `ext-pressure-min`, `ext-pressure-max` | measured | extinction model source (FLEX) |
| `ext-pressure-used`, `ext-probability`, `ext-probability-lo`, `ext-probability-hi`, `ext-droplet-size` | model | FLEX |
| `psi-investigations` | measured | Space Apps challenge page (states PSI has no partial-gravity combustion data); note lists the investigations counted |
| `aftermath-pmma-power-low`, `aftermath-pmma-power-high` | literature | Saffire VI rows; values parsed from the PMMA outcome text |
| `aftermath-toxic-oxygen` | literature | The Saffire VI row whose outcome reports CO over its limit (negations such as "did not exceed" are ignored); `o2Pct` rounded to a whole percent (copy renders it as "~{value}% O2") |
| `flex-cool-flame` | literature | DOI 10.1016/j.combustflame.2012.07.012 |
| `bass-test-one` | literature | A Researcher's Guide to: Combustion Science (2015), PDF edition |
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

## Page layout

`/brief` (`web/src/app/brief/page.tsx`) is a server component. It awaits `searchParams` inside a `<Suspense>` boundary (Cache Components), runs `queryToHabitat` and `buildBrief`, and renders the sections below. Each section sits in its own error boundary (`SectionBoundary`, built with `catchError`) with a `<Suspense>` inside it, so a failing card shows "This section could not be computed" and the rest of the brief still renders. A route-level `error.tsx` covers a failure of the brief itself.

### Sections (in order)

| # | Component | Content |
|---|---|---|
| – | `BriefHeader` | Habitat name, O2, pressure, computed O2 partial pressure, flow, materials and detectors; `GradeBadge` with the grade reason; URL notices (amber box) when parameters were adjusted; actions: Print / Save PDF, Copy link, Download data |
| 1 | `FlagList` | Flags in severity order; severity is shown by icon shape and a text label, not color alone |
| 2 | `EvidenceSection` | `HaloChart`, nearest test per fuel class with class grade and provenance, the BASS note, chart data as a table |
| 3 | `RankedList` | Top 8 investigations with why-chips, the SI summary (only when present and not flagged `needsReview`; otherwise the investigation objective), dataset and paper DOI links, and a weight-slider disclosure that re-ranks in the browser from the engine's score parts |
| 4 | `DetectionCard` | `DetectorBars` with the sensor what-if (scatter vs scatter + ionization, "x of y runs caught"); materials without SAME runs read "No SAME data", never 0%; the SAME ISS-air caveat always shows, ISS included |
| 5 | `ExtinctionCard` | Median and 95% band at the habitat's O2 and `ExtinctionCurve`; an extrapolation note when pressure or O2 is outside the fit |
| 6 | `AftermathCard` | Saffire VI PMMA fire power range and the O2 level where CO and CO2 exceeded crew limits |
| – | `CoolFlameNote` | Only when liquids are on board |
| 7 | `NextTestCard` | The top computed next test (fuel class, O2, pressure), evidence distance before and after for each reference habitat, habitats with zero gain listed as "not helped", and the runner-up tests |
| 8 | `ExplainPanel` (`ExplainStub.tsx`) | `<section data-pending="explain">` with a deterministic narrative from the grade and flags; the SI explain panel replaces this one import |
| 9 | `EarthCard` | Three NASA Spinoff facts with links |
| 10 | `CitationList` | Numbered sources in first-use order and an "every fact" table |
| – | footer | "HALO summarizes published NASA test evidence. It is not a safety certification." |

### Numbers and citations

Every number on the page is the value of a Fact (model curve values in the extinction table are read directly from the brief's curve). `web/src/lib/brief/pageFacts.ts` adds the display facts the engine does not attach to flags (habitat inputs and O2 partial pressure, nearest test per class, SAME ambient and alarm levels, sensor what-if counts, the extinction band, next-test point and gains); where an id also exists in the engine's facts, the formula is the same and the engine's copy wins. Habitat-input facts (O2, pressure, flow, O2 partial pressure) cite a note ("Habitat definition from the brief URL") because they are user inputs, and next-test facts cite a note naming the HALO next-test search because they are computed; neither has a PSI id, DOI or URL. `web/src/lib/brief/citations.ts` numbers each distinct source in order of first appearance on the page (`appearanceOrder` in `context.ts`; facts shown only in the fact table and the download come last); superscripts link to `#cite-n`. Only `https:` links are rendered. Download data writes the facts, citations, flags and cited rows (nearest tests, SAME runs for the listed materials, Saffire VI rows) as JSON in the browser.

### Halo chart encoding

- x: O2 percent, 10 to 45. A habitat above 45% (the EVA suit) is drawn in a separate column after an axis-break mark, labelled with its O2 value.
- y: pressure, 0 to 20 psia. Eligible tests above 20 psia are not plotted; the caption states how many (counted from the data) and the chart description says "X of Y tests plotted".
- Tests: one mark per eligible test, shape per fuel class: real solid as a hollow square, solid surrogate as a filled diamond, droplet as a faint dot, gas as a small plus. Legend buttons toggle each class.
- Habitat: a ✕, surrounded by three soft blue ellipses at the grade limits `GRADE_RINGS` from `grade.ts` (evidence distance 0.5, 1 and 2) (radii 5, 10, 20 O2-points by 1.5, 3, 6 psia), labelled B-ring, C-ring and D-ring.
- Moon envelope: dashed box from the Moon preset (O2 at least 30%, pressure at most 10.2 psia), drawn to 40% O2 and down to 5 psia.
- Nearest real solid: a larger square, a dotted leader to the habitat and a label with its O2 gap and distance, read from facts.
- Accessibility: `role="img"` with `<title>` and `<desc>`; the table in the details element below repeats the nearest-test data. The chart measures its container, so text stays readable at phone width.

### Print

`web/src/app/brief/print.css` (imported by the page) adds to the global print block: A4 with 12 mm margins; the nav, action buttons, weight sliders and disclosures are hidden; sections flow across pages while cards, flags, list rows, figures and table rows avoid breaking; section headings stay with their content; the sources list prints each link's URL after it; the sensor what-if prints the selected combination as text; the ranked list prints its top 5 with objectives clamped to two lines, no paper links and a line saying how many more are in the online brief; the nearest-test and extinction-curve tables print from print-only copies (on screen they sit in disclosures).
