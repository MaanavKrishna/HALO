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

`/brief` (`web/src/app/brief/page.tsx`) is a server component. It awaits `searchParams` inside a `<Suspense>` boundary (Cache Components), runs `queryToHabitat` and `buildBrief`, and renders the sections below. Each section sits in its own error boundary (`SectionBoundary`, built with `catchError`) with a `<Suspense>` inside it, so a failing card shows "This section could not be computed" and the rest of the brief still renders. A route-level `error.tsx` covers a failure of the brief itself. The page uses only the design-system kit (`components/ui`) and semantic tokens; page-scoped helpers live in `brief.css`.

The hero is a full-width dark theater well. Every other section is a two-column row inside `container-page`: the heading and a one-line lede sit in a left column that stays in view while its content scrolls (desktop), the content on the right; on phones the heading sits above. Sections are not numbered on screen.

### Sections (in order)

| # | Component | Content |
|---|---|---|
| – | `BriefHeader` | Dark hero (`data-theme="dark"`, instrument grid): habitat name; atmosphere readouts as a `StatGroup` (O2, pressure, O2 partial pressure, flow; mono values, units, provenance badges); materials, detectors and liquids as chips; the `GradeBadge` at the centre of a `RingsGraphic` dial (the lit ring tightens with better evidence) with the grade words and the engine's grade reason; status lights with the critical and caution flag counts (linking to the flags); URL notices (info callout, `data-notices`) when parameters were adjusted; actions: Print / Save PDF, Copy link, Download data. On phones the grade follows the name. |
| – | `BriefStickyBar` | Glass sub-bar under the site nav that appears once the hero scrolls away (`data-brief-bar`, `data-visible`): grade letter, habitat name, Copy link, Download, Print. While hidden it is `inert` and `aria-hidden`, so the grade image and the "Print / Save PDF" button stay unique. Anchors scroll clear of it (`scroll-padding-top`). |
| 1 | `FlagList` | Flags in severity order as `Callout`s (crit / warn / info: icon shape and a screen-reader prefix carry the tone), each with its cited facts as chips (value, source number, label as the accessible name) linking to the source |
| 2 | `EvidenceSection` | `HaloChart` in an instrument panel; nearest test per fuel class (class grade, d, O2 and pressure, provenance); the BASS note as an info callout; chart data as a table (disclosure) |
| 3 | `RankedList` | Top 8 investigations: rank, acronym and title, a score bar showing the four weighted parts (closeness, fuel match, hazards, evidence size; legend above), why-chips, the SI summary with `SiChip` (only when present and not flagged `needsReview`; otherwise the investigation objective), dataset DOI and paper links (`rel="noopener noreferrer"`), and a weight-slider disclosure (`SliderField`) that re-ranks in the browser from the engine's score parts |
| 4 | `DetectionCard` | `DetectorBars` as instrument meters (caught share in accent, missed share hatched, a tick scale with the half-of-runs mark, "x of y runs caught"); the sensor what-if (scatter vs scatter + ionization) as a segmented radio capsule; materials without SAME runs read "No SAME data" with an idle lamp, never 0%; the SAME ISS-air caveat as a warn callout always shows (`data-iss-air`), ISS included; alarm levels |
| 5 | `ExtinctionCard` | Panel with median, 95% band and evaluation point as stats, the `ExtinctionCurve`, an extrapolation warn callout when pressure or O2 is outside the fit, and the curve as a table (disclosure) |
| 6 | `AftermathCard` | Saffire VI PMMA fire power range and the O2 level where CO and CO2 exceeded crew limits, as stats with provenance |
| – | `CoolFlameNote` | Only when liquids are on board (info callout) |
| 7 | `NextTestCard` | The top computed next test (fuel class, O2, pressure), evidence distance before (hatched) and after (accent) for each reference habitat, habitats with zero gain listed as "not helped", and the runner-up tests |
| 8 | `ExplainPanel` ("Ask HALO") | See below |
| 9 | `EarthCard` | Three NASA Spinoff facts with links |
| 10 | `CitationList` | Numbered sources in first-use order, each with the provenance kinds it backs on this brief, and an "every fact" table |
| – | footer | "HALO summarizes published NASA test evidence. It is not a safety certification." |

### Ask HALO

`ExplainPanel.tsx` (server) passes the client `AskHalo` three things: `fallbackNarrative(brief)` from `lib/si/fallback.ts`, the habitat query (`habitatToQuery`), and a map of fact id to label, value and source number.

- The precomputed narrative shows at once (header reads "Precomputed"). Its `[fact-id]` citations render as chips.
- "Ask about this brief" is an optional question (at most 300 characters, with a live counter). "Generate SI narration" posts `{ query, question? }` to `/api/explain` (`requestExplain` in `lib/brief/explain.ts`, 22 s client timeout) and shows a skeleton while it waits.
- Only a 200 whose body has `source: "live"` and non-empty text replaces the narrative. Each sentence of live text carries an `SiChip`; citations become chips. Anything else (4xx, 429, 502, 503, a 200 with `source: "fallback"`, a network error, a timeout or a malformed body) keeps the precomputed text and shows the info callout "Showing precomputed narrative".
- Text is split on `[fact-id]` and rendered as text nodes and buttons; it is never parsed as HTML. Unknown ids stay as plain text.
- A fact chip scrolls to the first visible element on the page with that `data-fact` (outside the panel), or to its source entry, focuses it and flashes it once (static highlight under reduced motion).
- "Show the precomputed narrative" switches back.
- Live SI text has one screen-reader disclosure for the whole narration; the per-sentence `SiChip`s are visual (`aria-hidden`). A chip whose value already appears in its sentence shows only its source number.
- In print the panel appears only when it holds a live narration (the precomputed one repeats the flags); fact chips print as plain "value [n]".

### Numbers and citations

Every number on the page is the value of a Fact (model curve values in the extinction table are read directly from the brief's curve). `web/src/lib/brief/pageFacts.ts` adds the display facts the engine does not attach to flags (habitat inputs and O2 partial pressure, nearest test per class, SAME ambient and alarm levels, sensor what-if counts, the extinction band, next-test point and gains); where an id also exists in the engine's facts, the formula is the same and the engine's copy wins. Habitat-input facts (O2, pressure, flow, O2 partial pressure) cite a note ("Habitat definition from the brief URL") because they are user inputs, and next-test facts cite a note naming the HALO next-test search because they are computed; neither has a PSI id, DOI or URL. `web/src/lib/brief/citations.ts` numbers each distinct source in order of first appearance on the page (`appearanceOrder` in `context.ts`; facts shown only in the fact table and the download come last); citation marks are mono "[n]" on the baseline after a thin space (never superscripts, so they cannot read as exponents) and link to `#cite-n`. Only `https:` links are rendered. Download data writes the facts, citations, flags and cited rows (nearest tests, SAME runs for the listed materials, Saffire VI rows) as JSON in the browser.

### Halo chart encoding

The chart is the brief's signature instrument and uses the `RingsGraphic` language: hairline grid and frame, outward tick marks (every O2-point and psia, majors every 5), mono tick labels and uppercase telemetry axis captions.

- x: O2 percent, 10 to 45. A habitat above 45% (the EVA suit) is drawn in a separate column after an axis-break mark, labelled with its O2 value.
- y: pressure, 0 to 20 psia. Eligible tests above 20 psia are not plotted; the caption states how many (counted from the data) and the chart description says "X of Y tests plotted".
- Tests: one mark per distinct condition, investigation and fuel (with its test count), shape per fuel class: real solid as a hollow square, solid surrogate as a filled diamond, droplet as a faint dot, gas as a small plus. Legend chips (buttons, `aria-pressed`) toggle each class and show its count.
- Habitat: a ✕ in an accent ring with a soft glow, at the centre of dashed crosshairs and three ellipses at the grade limits `GRADE_RINGS` from `grade.ts` (evidence distance 0.5, 1 and 2; radii 5, 10, 20 O2-points by 1.5, 3, 6 psia). The B-ring is accent with a glow, the C- and D-rings hairlines; the D-ring carries dial ticks every 10°. Labels ("B-RING · D 0.5") sit on the 45° radial as on the dial; on phones only the B-ring is labelled. The rings draw in once when the chart first scrolls into view (not under reduced motion).
- Moon envelope: dashed box from the Moon preset (O2 at least 30%, pressure at most 10.2 psia), drawn to 40% O2 and down to 5 psia.
- Nearest real solid: a larger square, a dotted leader to the habitat and a label with its O2 gap and distance, read from facts.
- Inspecting tests: hovering shows a glass tooltip for the nearest mark (investigation, class, fuel, O2, pressure, count, evidence distance from the habitat via the engine's `scaledDistance`). The plot is also a focusable group: arrow keys step through the visible tests nearest-first, Home/End jump, Escape clears; a polite live region reads the same text.
- Accessibility: the SVG is `role="img"` with `<title>` and `<desc>`; the table in the disclosure below repeats the nearest-test data. The chart measures its container, so text stays readable at phone width.

### Print

`web/src/app/brief/print.css` (imported by the page) adds to the global print block (light paper tokens on white): A4 with 12 mm margins; the nav, sticky bar, action buttons, weight sliders, the Ask HALO form and disclosures are hidden; the hero prints as a paper header (no well, grid, dial or glow; the grade as one bordered row); sections print in one column with their headings kept with their content; cards, flags, the nearest-test list, list rows, figures and table rows avoid breaking; charts stay vector with glows, drop shadows and draw-in animation removed; the sources list prints each link's URL after it; the sensor what-if prints the selected combination as text; the ranked list prints its top 5 with objectives clamped to two lines, no paper links and a line saying how many more are in the online brief; the nearest-test table and a compact extinction table (habitat row plus every 10 O2-points) print from print-only copies (on screen they sit in disclosures); the halo chart is capped at 95 mm and the extinction curve at 70 mm; sources print in two columns at 8 pt. The Artemis brief prints on 8 A4 pages.
