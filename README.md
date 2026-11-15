<a href="https://halo-fire-brief.vercel.app">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/hero-dark.svg" />
  <img src="docs/readme/hero-light.svg" alt="HALO: Habitat Assessment from Low-gravity Observations. In microgravity, a flame becomes a halo. HALO turns NASA's microgravity fire data into a cited fire brief for your habitat." width="100%" />
</picture>
</a>

<p align="center">
  <a href="https://github.com/MaanavKrishna/HALO/actions/workflows/ci.yml"><img src="https://github.com/MaanavKrishna/HALO/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/MaanavKrishna/HALO/actions/workflows/codeql.yml"><img src="https://github.com/MaanavKrishna/HALO/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
</p>

<p align="center">
  <a href="https://halo-fire-brief.vercel.app"><img src="https://img.shields.io/badge/Live_demo-halo--fire--brief.vercel.app-3A66FF?style=for-the-badge&labelColor=05080F" alt="Live demo: halo-fire-brief.vercel.app" /></a>
  <a href="https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/"><img src="https://img.shields.io/badge/NASA_Space_Apps-2026_%C2%B7_Flame_in_Freefall-3A66FF?style=for-the-badge&labelColor=05080F" alt="NASA Space Apps 2026: Flame in Freefall" /></a>
  <a href="docs/DATA.md"><img src="https://img.shields.io/badge/Data-NASA_PSI_%C2%B7_CC0-4FD4A4?style=for-the-badge&labelColor=05080F" alt="Data: NASA PSI, CC0" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-7EA6FF?style=for-the-badge&labelColor=05080F" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
  Pick a habitat atmosphere, cabin materials and smoke detectors. HALO shows which NASA tests are closest, how much evidence covers them, where the evidence stops, what your detector would likely miss, and which test should fly next. <b>Every number is cited to its source.</b>
</p>

<p align="center">
  <sub>
    <b>FOR</b> &nbsp; habitat and equipment designers &nbsp;·&nbsp; modelers who need the PSI test rows with provenance
  </sub>
</p>

<p align="center">
  <sub>
    <b>JUMP TO</b> &nbsp;
    <a href="#the-gap">The gap</a> &nbsp;·&nbsp;
    <a href="#what-a-fire-brief-tells-you">Fire Brief</a> &nbsp;·&nbsp;
    <a href="#try-it">Try it</a> &nbsp;·&nbsp;
    <a href="#under-the-hood">Under the hood</a> &nbsp;·&nbsp;
    <a href="#data">Data</a> &nbsp;·&nbsp;
    <a href="#run-it">Run it</a> &nbsp;·&nbsp;
    <a href="#security">Security</a> &nbsp;·&nbsp;
    <a href="#use-of-si">Use of SI</a>
  </sub>
</p>

<details>
<summary><sub><b>BUILT FOR NASA SPACE APPS CHALLENGE 2026: FLAME IN FREEFALL</b></sub></summary>
<br>

[Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) (14–15 November 2026). In Space Apps 2026, "SI" means Super Intelligence, the challenge's term for AI.

The challenge asks for an SI-powered tool that summarizes, ranks and interprets the 24 combustion investigations in NASA's Physical Sciences Informatics (PSI) repository, so habitat and equipment designers can use data that is otherwise hard to navigate. HALO answers its three goals with one input and one answer:

| Challenge goal | How HALO answers it |
|---|---|
| Investigations most relevant to crew habitats | A transparent, weighted ranking of all 24 investigations for the habitat you enter, with each score component shown. |
| Data for predictive flammability modeling | Evidence distance from your atmosphere to every eligible test, per fuel class, plus a bootstrapped droplet self-extinction model fitted to FLEX data. |
| Research that informs next-generation fire-safety equipment | A detector blind-spot analysis from SAME/SAME-R flight runs with a sensor what-if, and a computed "next test to fly" that closes the largest evidence gap. |

</details>

<br>

<a id="the-gap"></a>

<img src="docs/readme/h-gap.svg" alt="The gap" width="100%" />

Moon-base and exploration habitats plan to run oxygen-enriched, low-pressure atmospheres: at least 30% O2 at no more than 10.2 psi ([challenge statement](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/)), and an exploration atmosphere of 34% O2 at 8.2 psia ([NTRS 20150021491](https://ntrs.nasa.gov/citations/20150021491)). Fire behaves differently there, and in microgravity. The PSI evidence was mostly gathered somewhere else:

<p align="center">
  <picture>   <source media="(prefers-color-scheme: dark)" srcset="docs/readme/tile-moon-dark.svg" />   <img src="docs/readme/tile-moon-light.svg" alt="0 of 33: no eligible PSI row in the Moon window (at least 30% O2, at most 10.2 psia) is a real solid. 20 are ACME gas flames and 13 a burner that emulates a burning solid." width="65%" /> </picture>
  <picture>   <source media="(prefers-color-scheme: dark)" srcset="docs/readme/tile-kapton-dark.svg" />   <img src="docs/readme/tile-kapton-light.svg" alt="20 of 35 Kapton flight runs read below the 2.0 V scatter-detector alarm proxy (SAME/SAME-R, ISS air)." width="32%" /> </picture>
</p>
<p align="center">
  <picture>   <source media="(prefers-color-scheme: dark)" srcset="docs/readme/tile-artemis-dark.svg" />   <img src="docs/readme/tile-artemis-light.svg" alt="Artemis Base evidence distance falls from 2.47 to 0.72 after the one suggested test, at 30% O2 and 10 psia." width="32%" /> </picture>
  <picture>   <source media="(prefers-color-scheme: dark)" srcset="docs/readme/tile-psi-dark.svg" />   <img src="docs/readme/tile-psi-light.svg" alt="24 investigations and 1,225 eligible rows: 1,967 test rows from the NASA PSI combustion repository, 1,225 eligible for habitat coverage." width="65%" /> </picture>
</p>

<p align="center"><sub>Numbers from the PSI data as HALO processes it; the Artemis Base figure is the brief's own "what would raise this grade" ladder on the live site.</sub></p>

<details>
<summary><sub><b>WHY IT MATTERS: THE FULL EVIDENCE GAP, WITH SOURCES</b></sub></summary>
<br>

NASA's fire-safety work focuses on prevention, detection and suppression; three spacecraft emergencies show why: [Apollo 1](https://sma.nasa.gov/sma-disciplines/accllp/apollo-1) (1967, a flash fire in a 100% oxygen cabin during a pre-launch test), [Apollo 13](https://sma.nasa.gov/sma-disciplines/accllp/apollo-13) (1970, an oxygen-tank failure and explosion, a fire hazard, after heaters degraded the tank's Teflon wire insulation) and the [Mir fire](https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/) (1997, a solid-fuel oxygen generator that filled the station with smoke).

- **No real cabin material in the PSI data was tested at Moon-base oxygen.** Real solid materials in the PSI test rows were never burned above 22.2% O2 (BASS-II 13.6–22.2%, Saffire-I/II/III 21.0–22.1%). Their pressure is not tabulated; HALO assumes cabin pressure of about 1 atm. Outside PSI, NASA technical reports on Saffire VI describe SIBAL fabric and PMMA burned at 30.3–31.0% O2 and about 7.9 psia (literature); those runs are not PSI test rows, so HALO states them but does not grade on them.
- **Only a surrogate reached Moon conditions.** In the Moon window (≥ 30% O2, ≤ 10.2 psia) there are 33 eligible rows: 20 ACME CFI-G gas flames and 13 ACME BRE rows. BRE is a gas-fed porous burner that emulates a burning solid, with pressure inferred from its stated objectives. None of the PSI rows is a real solid; the only real solids burned there are the Saffire VI literature runs above.
- **The ISS-style scatter detector read low on two cabin materials.** In SAME/SAME-R flight runs it read below the 2.0 V alarm proxy in 20 of 35 Kapton runs and 18 of 23 Teflon runs. All of those runs were in ISS air (21% O2, 1 atm), so smoke behavior at habitat atmospheres is untested.
- **No partial-gravity data.** PSI holds no partial-gravity combustion data, so lunar and Martian gravity are outside the evidence entirely. The challenge expects future PSI data from [LUCI](https://ntrs.nasa.gov/citations/20250010653) and [FM2](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/); [SoFIE](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/solid-fuel-ignition-and-extinction-sofie/) and the JAXA-led [FLARE](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-limits-at-reduced-g-experiment-flare/) study material flammability limits in microgravity. None has data in PSI yet, so HALO names them and grades on none of them.
- **Suppression: the inert gas matters.** In FLEX droplet burns, flames went out on their own more often when the inert gas was CO2 or helium instead of nitrogen, compared at the O2 levels all three were run at. These are flames self-extinguishing in a diluted atmosphere, not tests of an extinguisher (see the suppression card on `/findings`).
- **The standard screening test may not be conservative.** BASS results indicate that NASA-STD-6001 Test 1 ([NASA-STD-6001B](https://standards.nasa.gov/standard/NASA/NASA-STD-6001)) is not conservative: materials can burn at lower oxygen in microgravity than on Earth ([A Researcher's Guide to Combustion Science, 2015](https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/)).

</details>

<br>

<a id="what-a-fire-brief-tells-you"></a>

<img src="docs/readme/h-brief.svg" alt="What a Fire Brief tells you" width="100%" />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/grades-dark.svg" />
  <img src="docs/readme/grades-light.svg" alt="Readiness grades on the full dataset: Artemis Base D, ISS B, Moon envelope C, Rover C, EVA suit F. Grades describe evidence coverage, not safety." width="100%" />
</picture>

<p align="center"><sub>Readiness grades (A–F) on the full dataset. A grade describes how well tested evidence covers an atmosphere, not whether it is safe.</sub></p>

<a href="https://halo-fire-brief.vercel.app/brief?o2=34&p=8.2&f=10&m=kapton%2Cteflon%2Ccotton&d=scatter&l=0&n=Artemis+Base">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/shot-brief-dark.webp" />
  <img src="docs/readme/shot-brief-light.webp" alt="The Artemis Base Fire Brief: grade D, with the ladder of tests that would raise it." width="100%" />
</picture>
</a>

<p align="center"><sub>The Artemis Base brief (34% O2, 8.2 psia, Kapton, Teflon and cotton, scatter detector). Click to open it live.</sub></p>

| | |
|---|---|
| **Fire Brief** | A readiness grade, overall and per fuel class, with evidence distance to the nearest eligible test and whether its O2 and pressure were measured, assumed or inferred. |
| **Grade ladder** | "What would raise this grade": the step-by-step evidence distances behind the grade, and the test that would move it. |
| **Coverage map + "place your habitat"** | The O2 × pressure plane shaded by the grade a habitat there would get, with every tested condition, the Moon window and the presets. Drop your own habitat on it. |
| **Ask HALO** | Plain-words answers over the brief's computed facts, with suggested questions built from the brief's own grade and flags. Numbers are checked against the facts. |
| **Detection what-if** | How many flight runs the scatter detector would have missed for each material, and how many scatter plus ionization would have flagged. |
| **Next test to fly** | A computed candidate test, plus diverse runners-up, chosen to reduce evidence distance most. |
| **Earth spinoffs** | Four NASA Spinoff facts, each tied to the finding it answers. |
| **Explore, compare, materials, gravity** | All 24 investigations, habitats and investigations side by side, a material screener and the partial-gravity bounds. |
| **Print and CSV** | Print/PDF and a shareable URL for every brief; every test row with provenance as CSV. |

<details>
<summary><sub><b>EVERY SECTION OF THE FIRE BRIEF</b></sub></summary>
<br>

| Section | What it shows |
|---|---|
| **Readiness grade (A–F)** | How well tested evidence covers your atmosphere, overall and per fuel class. Grades describe evidence coverage, not safety. On the full dataset: ISS **B**, Moon envelope **C**, Rover **C**, Artemis base **D**, EVA suit **F**. |
| **Evidence distance** | Distance from your habitat to the nearest eligible test in each fuel class (solid, solid surrogate, droplet, gas), and whether that test's O2 and pressure were measured, assumed or inferred. |
| **Ranked investigations** | All 24 PSI investigations ordered by proximity, fuel relevance, hazard coverage and data richness, with short "why" notes. |
| **Detector blind spot + sensor what-if** | For each listed material with a SAME analog: how many flight runs the scatter detector would have missed, smoke particle size, and how many runs scatter plus ionization would have flagged. Shown as "x of y runs". |
| **Droplet self-extinction** | "Will it go out on its own?" for liquid droplet fuels: probability with a 95% bootstrap band from the FLEX model, flagged when your pressure is outside the tested 0.7–1.0 atm. |
| **Aftermath (Saffire VI)** | Literature results from Saffire VI (NASA reports, not PSI test rows): flame power and toxic-gas load from PMMA burns in an oxygen-enriched, low-pressure atmosphere inside the Moon envelope. Per [NTRS 20260001992](https://ntrs.nasa.gov/citations/20260001992), CO exceeded the 24-hour Spacecraft Maximum Allowable Concentration ([JSC 20584](https://ntrs.nasa.gov/citations/20240007713), 100 ppm) and approached, but did not exceed, the 1-hour SMAC (425 ppm); CO2 exceeded the NASA-STD-3001 Vol 2 1-hour limit (3 mmHg). Stated with a `literature` badge; not used for the grade. |
| **Cool-flame note** | When liquids are present: FLEX heptane droplets kept burning on an invisible ~500–800 K cool flame after the visible flame went out. |
| **Next test to fly** | A computed (not hand-written) candidate test, plus diverse runners-up, chosen to reduce evidence distance most across the habitat presets. |
| **Evidence coverage map** | On the landing page and `/findings`: the O2 × pressure plane shaded by the grade a habitat there would get from one fuel class's tests (real solids, surrogate, droplets, gas), with every tested condition, the Saffire report runs (not graded), the Moon window and the five presets. Drawn from the engine's own distance and grade rules. |
| **Earth relevance** | Four NASA Spinoff facts (air tanks, fire detector, firefighter gear, ISS water-mist extinguisher), each tied to the finding it answers. |
| **Citations** | Every number is a fact with a provenance and a source: PSI id, dataset DOI or NTRS/Spinoff URL. |
| **Print/PDF and shareable URL** | The full habitat is encoded in the query string, for example `/brief?o2=34&p=8.2&f=10&m=kapton,teflon,cotton&d=scatter&l=0&n=Artemis%20Base`. |

</details>

<br>

<a id="try-it"></a>

<img src="docs/readme/h-try.svg" alt="Try it" width="100%" />

<p align="center">
  <a href="https://halo-fire-brief.vercel.app"><img src="https://img.shields.io/badge/Open_HALO-halo--fire--brief.vercel.app-3A66FF?style=for-the-badge&labelColor=05080F" alt="Open HALO: halo-fire-brief.vercel.app" /></a>
</p>

<a href="https://halo-fire-brief.vercel.app">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/shot-home-dark.webp" />
  <img src="docs/readme/shot-home-light.webp" alt="HALO landing page: Where the evidence runs out." width="100%" />
</picture>
</a>

<p align="center"><sub><b>Home.</b> Why fire safety in space matters, the problem, a live mini brief and the habitat presets.</sub></p>

<img src="docs/readme/shot-coverage-dark.webp" alt="Where the tests stop: the evidence coverage map, with oxygen and pressure sliders to place your habitat." width="100%" />

<p align="center"><sub><b>Where the tests stop.</b> The evidence coverage map, drawn from the engine's own distance and grade rules. Move the sliders to place your habitat.</sub></p>

<p align="center">
  <img src="docs/readme/shot-detection-dark.webp" alt="Would your smoke detector notice? The detection card: Kapton 15 of 35 runs caught, Teflon 5 of 23, cotton 26 of 26." width="49%" />
  <img src="docs/readme/shot-ask-dark.webp" alt="Ask HALO, with suggested questions such as Why is the grade D? and What test would help most?" width="49%" />
</p>

<p align="center"><sub><b>Detection what-if</b> (left): Kapton 15 of 35 runs caught, Teflon 5 of 23, cotton 26 of 26. &nbsp;·&nbsp; <b>Ask HALO</b> (right): suggested questions from the brief's own grade and flags.</sub></p>

<details>
<summary><sub><b>EVERY PAGE</b></sub></summary>
<br>

| Route | What it is |
|---|---|
| `/` | Landing: why fire safety in space matters (Apollo 1, Apollo 13, Mir), the problem, a live mini brief and the habitat presets |
| `/build` | Habitat builder (atmosphere, materials, detectors, liquids) |
| `/brief` | The Fire Brief for a habitat (shareable URL), with Ask HALO |
| `/findings` | The headline evidence gaps and the suppression finding, each computed and cited |
| `/explore` | All 24 investigations, filterable and sortable |
| `/explore/[psiId]` | One investigation, for example `/explore/PSI-69`; unknown ids return a 404 |
| `/compare` | Two habitats side by side |
| `/investigations/compare?ids=…` | 2–4 investigations side by side, differences marked, overlaid O2 × pressure plot |
| `/materials?m=pmma&o2=34&p=8.2` | Material screener: every PSI row for the material, Saffire literature, SAME smoke stats, the Test 1 caveat and the distance to the nearest evidence |
| `/gravity` | Partial-gravity bounds: microgravity vs 1 g per material, the untested Moon/Mars band, the E-FIELD analogue, LUCI and FM2 |
| `/method` | Every formula, threshold and model |
| `/data` | Sources (PSI, Glenn fact sheets), partner agency research, provenance, fixes, downloads (including the `tests.csv` export) and every DOI |
| `/about` | Who it is for, why it was built, fire history, the challenge and its resources, use of SI, licence |
| `/design` | The living design system |

</details>

<br>

<a id="under-the-hood"></a>

<img src="docs/readme/h-hood.svg" alt="Under the hood" width="100%" />

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-3A66FF?style=for-the-badge&labelColor=05080F&logo=nextdotjs&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-3A66FF?style=for-the-badge&labelColor=05080F&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3A66FF?style=for-the-badge&labelColor=05080F&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind-4-3A66FF?style=for-the-badge&labelColor=05080F&logo=tailwindcss&logoColor=white" alt="Tailwind 4" />
  <img src="https://img.shields.io/badge/zod-4-3A66FF?style=for-the-badge&labelColor=05080F&logo=zod&logoColor=white" alt="zod 4" />
  <img src="https://img.shields.io/badge/Vercel-hosting-3A66FF?style=for-the-badge&labelColor=05080F&logo=vercel&logoColor=white" alt="Vercel hosting" />
  <img src="https://img.shields.io/badge/Python-3.14-4FD4A4?style=for-the-badge&labelColor=05080F&logo=python&logoColor=white" alt="Python 3.14" />
  <img src="https://img.shields.io/badge/pandas-3.1-4FD4A4?style=for-the-badge&labelColor=05080F&logo=pandas&logoColor=white" alt="pandas 3.1" />
  <img src="https://img.shields.io/badge/scikit--learn-1.9-4FD4A4?style=for-the-badge&labelColor=05080F&logo=scikitlearn&logoColor=white" alt="scikit-learn 1.9" />
  <img src="https://img.shields.io/badge/Vitest-5-7EA6FF?style=for-the-badge&labelColor=05080F&logo=vitest&logoColor=white" alt="Vitest 5" />
  <img src="https://img.shields.io/badge/Playwright-1.65-7EA6FF?style=for-the-badge&labelColor=05080F&logo=playwright&logoColor=white" alt="Playwright 1.65" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI-7EA6FF?style=for-the-badge&labelColor=05080F&logo=githubactions&logoColor=white" alt="GitHub Actions CI" />
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/hood-arch-dark.svg" />
  <img src="docs/readme/hood-arch-light.svg" alt="Architecture: NASA PSI (24 investigations, 22 tables plus the SAME workbook, CC0) to a Python pipeline (pandas, scikit-learn, 84 pytest tests) to a versioned JSON contract (1,967 rows in, 1,225 eligible, manifest sha256, zod-validated) to a pure TypeScript engine to facts with provenance, to the Fire Brief. Ask HALO branch: the LLM writes words only; a number validator passes the answer or a code-built fallback replaces it." width="100%" />
</picture>

1. **Pipeline** (`pipeline/`, Python). Reads the vendored PSI tables, detail records and the SAME workbook; normalizes units, records where each value came from, applies documented data-quality fixes and fits the extinction model.
2. **Contract** (`web/src/data/`). Static JSON plus a `manifest.json` with build time, row counts, each file's sha256 and every PSI dataset DOI, validated once with zod at build.
3. **Engine** (`web/src/lib/engine/`, TypeScript). Pure functions turn a habitat and the data into a `Brief`: no randomness, no network at run time.
4. **SI layer.** Numbers come from code; words come from SI. The LLM writes narrative over the frozen facts; a validator rejects any number that is not a fact value and the brief falls back to a template. The build-time summaries of all 24 investigations follow the same rule (closed tag vocabulary, quotes checked against the source).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/hood-grade-dark.svg" />
  <img src="docs/readme/hood-grade-light.svg" alt="How a grade is computed: evidence distance d = sqrt((dO2/10)^2 + (dp/3)^2); rings at 0.5 (A or B), 1 (C) and 2 (D), F beyond. Artemis Base (34% O2, 8.2 psia): nearest real solid BASS-II at 22.2% O2, 14.7 psia, d = 2.47, so F; the ACME BRE surrogate at d = 0 lifts it one step to D. A surrogate lifts a grade to C at most." width="100%" />
</picture>

<p align="center"><sub>Full rules, ranking and the extinction model: <a href="docs/METHOD.md">docs/METHOD.md</a>.</sub></p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/hood-trust-dark.svg" />
  <img src="docs/readme/hood-trust-light.svg" alt="Trust layers: 7 provenance badge kinds on every fact; SI number validator with a misfit citation sends the answer to the code fallback; web data rebuilt in CI from NASA's 22 raw tables and the SAME workbook; live NASA check of all 24 datasets with raw files byte-identical to psi.nasa.gov and all 1,225 rows rechecked; 577 tests (pytest 84, Vitest 377, Playwright 116); CodeQL, secret scanning and SHA-pinned actions." width="100%" />
</picture>

<details>
<summary><sub><b>SAME FLOW AS A TEXT DIAGRAM</b></sub></summary>
<br>

```mermaid
flowchart TD
    A["NASA PSI mirror<br/>24 investigations, CC0"] --> C["Python pipeline<br/>ingest, clean, provenance, models"]
    B["Saffire literature CSV<br/>NTRS reports"] --> C
    C --> D["Versioned JSON<br/>web/src/data + manifest sha256"]
    D --> E["TypeScript engine<br/>pure, deterministic functions"]
    E --> F["Facts<br/>every number with provenance and source"]
    F --> G["Fire Brief page"]
    F --> H["SI layer<br/>writes words only"]
    H --> V{"Number validator"}
    V -- "pass" --> G
    V -- "fail" --> T["Template fallback"]
    T --> G
```

</details>

<details>
<summary><sub><b>PROVENANCE BADGES</b></sub></summary>
<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/hood-prov-dark.svg" />
  <img src="docs/readme/hood-prov-light.svg" alt="Provenance badges: measured (filled dot), inferred (half dot), assumed (hollow dot), literature (square), computed (diamond), model (dashed diamond), SI (dashed chip)." width="100%" />
</picture>

Every number in a brief carries one of these badges.

| Badge | Meaning |
|---|---|
| `measured` | Reported in the PSI data tables. |
| `assumed` | Not recorded; assumed from the experiment's documented setup (for example ISS cabin pressure). |
| `inferred` | Derived from other recorded quantities or described only in text. |
| `literature` | Taken from a published paper or report. |
| `computed` | Arithmetic on the data (counts, distances, ranking, O2 partial pressure). |
| `model` | From the fitted FLEX droplet extinction model (extinction probability and its band). |
| `si` | Wording written by an LLM. It never introduces a number that is not a fact value. |

Method details: [docs/METHOD.md](docs/METHOD.md). Brief structure and flag rules: [docs/BRIEF.md](docs/BRIEF.md).

</details>

<details>
<summary><sub><b>REPOSITORY LAYOUT</b></sub></summary>
<br>

```
.
├── pipeline/     Python data pipeline: PSI tables -> versioned JSON (tests in pipeline/tests)
├── data/
│   ├── raw/      Vendored PSI experimental tables, trimmed detail records, SAME workbook
│   └── literature/  Saffire points transcribed from NTRS reports
├── web/          Next.js app
│   ├── src/data/        Generated JSON data contract (do not edit by hand)
│   ├── src/lib/engine/  Pure TypeScript engine that builds the Fire Brief
│   └── tests/           Vitest engine tests, Playwright e2e, fixtures
├── docs/         Data, method, brief and architecture documentation
├── .githooks/    Pre-commit secret guard
├── LICENSE       Apache-2.0
└── NOTICE        Attribution notices
```

</details>

<details>
<summary><sub><b>DOCUMENTATION</b></sub></summary>
<br>

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Repo layout, data flow, security headers, secrets and cost control. |
| [docs/DATA.md](docs/DATA.md) | Sources, column map per investigation, provenance rules, eligibility, data-quality fixes, DOIs. |
| [docs/DATA-CONTRACT.md](docs/DATA-CONTRACT.md) | Shape of every generated JSON file and the provenance vocabulary. |
| [docs/METHOD.md](docs/METHOD.md) | Evidence distance, grades, detector blind spot, ranking, extinction model, next test. |
| [docs/BRIEF.md](docs/BRIEF.md) | Fire Brief sections, flag rules, fact ids and URL parameters. |
| [docs/SI.md](docs/SI.md) | SI features: build-time summaries, Ask HALO, validators, evaluation and disclosure. |
| [docs/PAGES.md](docs/PAGES.md) | Every route, what it shows and the data it reads. |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system: tokens, type, components, motion and provenance markers. |
| [docs/FETCH.md](docs/FETCH.md) | How to re-fetch full PSI detail records. |
| [pipeline/README.md](pipeline/README.md) | Pipeline setup, modules and tests. |

</details>

<br>

<a id="data"></a>

<img src="docs/readme/h-data.svg" alt="Data" width="100%" />

- **Source.** The NASA Physical Sciences Informatics (PSI) combustion repository: 24 investigations, released under CC0 1.0. HALO cites each investigation by its PSI dataset DOI (`https://doi.org/<doi>`). The full list is in [docs/DATA.md](docs/DATA.md) and in `manifest.json`.
- **Literature.** Saffire IV, V and VI results (and Saffire I and II points) come from NASA technical reports on NTRS, with a URL on every row.
- **Challenge resources.** The [PSI combustion repository](https://psi.nasa.gov/physci/repo/search?q=combustion), the [NASA Glenn Combustion Science](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/) page and its investigation fact sheets, the [ScienceCast video](https://www.youtube.com/watch?v=W1oXykoz9zg), the [Researcher's Guide](https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/), the Apollo 1, Apollo 13 and Mir pages above, and the four NASA Spinoffs are all cited on the site (`/about` lists them with where each is used).
- **Adjacent record.** [PSI-179 ASE](https://doi.org/10.60555/pdgr-c961) (Aerosol Sampling Experiment, Complex Fluids) sampled ISS cabin dust, the background a smoke detector must reject. It is cited as context on `/data`; HALO computes nothing from it.
- **Partner agency research.** The [FLARE](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-limits-at-reduced-g-experiment-flare/) project, JAXA-led and joined by NASA, ESA and universities in Japan, the USA and France, aims to predict microgravity flammability limits from ground tests. Its results are not in PSI, so HALO cites it and does not grade on it.
- **CSV export.** Every test row with its provenance, flow, outcome, diluent, per-row geometry and dataset DOI, for modelers, at `/data/files/tests.csv` (one file per investigation at `/data/files/tests-PSI-n.csv`).
- **Processing.** Column maps, unit conversions, eligibility rules and every data-quality fix are documented in [docs/DATA.md](docs/DATA.md).

HALO summarizes published NASA test evidence. **It is not a safety certification.** HALO is not affiliated with or endorsed by NASA.

<br>

<a id="run-it"></a>

<img src="docs/readme/h-run.svg" alt="Run it" width="100%" />

Requirements: Python 3.12+, Node.js and pnpm.

**Pipeline** (rebuilds `web/src/data/*.json` from `data/`):

```bash
cd pipeline && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && make data
```

**Web app:**

```bash
cd web && pnpm install && pnpm dev
```

Then open http://localhost:3000.

**Tests:**

| Suite | Command | Count |
|---|---|---|
| Engine, page-fact and SI unit tests (Vitest) | `cd web && pnpm test` | 377 tests in 33 files |
| Pipeline tests (pytest) | `cd pipeline && .venv/bin/pytest -q` | 84 tests |
| End-to-end (Playwright, production build on port 3100) | `cd web && pnpm test:e2e` | 116 tests in 11 specs |
| Type check | `cd web && pnpm exec next typegen && pnpm exec tsc --noEmit` | |

**Environment.** Copy [`.env.example`](.env.example) to `.env` (gitignored). It holds the server-only LLM API key and `SI_LIVE` (set to `false` to serve precomputed text only). The data pipeline and the engine need no keys.

<br>

<a id="security"></a>

<img src="docs/readme/h-security.svg" alt="Security" width="100%" />

<details>
<summary><sub><b>HEADERS, SERVER-ONLY KEY, SECRET HOOK, RATE LIMITS, GITHUB</b></sub></summary>
<br>

- **Headers.** CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `X-Frame-Options` on every route, set in [`web/next.config.ts`](web/next.config.ts). HTML is never rendered from data or SI output. The e2e test asserts the headers on a production build.
- **Server-only key.** The LLM API key lives only in server environment variables, never in client code. `.env` is gitignored.
- **Pre-commit secret hook.** [`.githooks/pre-commit`](.githooks/pre-commit) rejects staged `.env` files and key-like strings. Enable it with `git config core.hooksPath .githooks`.
- **Rate and spend limits.** A monthly spend limit at the LLM provider, a Vercel Firewall rate limit on the explanation endpoint, a best-effort in-memory per-IP limit in the route and a kill switch (`SI_LIVE=false`).

- **GitHub.** CI runs the pipeline tests, checks that the web data rebuilds exactly from the raw NASA files, then type-checks, unit-tests, builds and end-to-end tests the app; it also scans the full history for secrets. CodeQL analyses the code and workflows, Dependabot watches dependencies, and every action is pinned to a commit SHA. Report vulnerabilities privately: [SECURITY.md](SECURITY.md).

Rationale: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

</details>

<br>

<a id="use-of-si"></a>

<img src="docs/readme/h-si.svg" alt="Use of SI" width="100%" />

**In the product.**
- *Build-time summaries (see [docs/SI.md](docs/SI.md)).* An LLM writes a short summary and habitat relevance note for each of the 24 investigations from its PSI record. Output is validated: hazard tags from a closed vocabulary, quotes must appear in the source text, no number the source lacks. All 24 pass the automatic checks; the author's manual read-through against PSI is in progress, so every summary stays labelled as SI output.
- *Live explanations ("Ask HALO" on `/brief`, via `/api/explain`).* An LLM writes a short narrative over the brief's computed facts. Every number it writes must match a fact value, or the brief uses a template instead; a number cited to a fact whose value it is not sends the answer back to the template, and values describing the habitat cite the `habitat-*` facts. The model sees every fact the page shows (grade, flags, detection, next test, archive what-if), and each brief offers suggested questions built from its own grade and flags.
- Every SI-written paragraph and summary carries the `si` badge. All numbers, grades, rankings and models come from deterministic code.

**In development.** An LLM coding assistant helped write code. All data processing, models and copy were reviewed by the author.

<br>

<p align="center">
  <sub>
    <b>TEAM</b> &nbsp; Maanav Krishna &nbsp;·&nbsp;
    <b>LICENSE</b> &nbsp; Apache-2.0, see <a href="LICENSE">LICENSE</a> and <a href="NOTICE">NOTICE</a>. PSI data is CC0 1.0.
  </sub>
</p>

<details>
<summary><sub><b>ACKNOWLEDGEMENTS</b></sub></summary>
<br>

- NASA Physical Sciences Informatics, for curating and openly releasing the combustion data.
- NASA Glenn Research Center combustion research, behind the investigations HALO draws on.
- The authors of the NASA Space Apps Challenge "Flame in Freefall".

</details>

<p align="center">
  <sub>HALO summarizes published NASA test evidence. <b>It is not a safety certification.</b> HALO is not affiliated with or endorsed by NASA.</sub>
</p>
