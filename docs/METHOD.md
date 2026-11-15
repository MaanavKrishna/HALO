# HALO method

## Evidence distance and readiness grade

**Evidence distance.** Each eligible NASA test point is a pair (O2 %, pressure psia). The distance between a habitat and a test is

    d = sqrt( ((O2_h - O2_t) / 10)^2 + ((p_h - p_t) / 3)^2 )

so 10 O2 percentage points count the same as 3 psia. The scaling is a judgement call, not a physical law: it puts the two axes on comparable footing so one number can rank "how close was this test". Flow speed and material are not part of d.

**Eligible tests.** A row counts only if its ambient conditions are valid (CFI-G inverse flames are excluded because their O2 is burner-issued), it is not ACME Flame Design, it is not a SAME/SAME-R detection row, O2 <= 100, and both O2 and pressure are present.

**Per-class grade.** For each fuel class (solid, solid_surrogate, droplet, gas) the nearest test sets the grade:

| Grade | Condition |
|---|---|
| A | d <= 0.5, and O2 and pressure both measured (not assumed or inferred) |
| B | d <= 0.5 |
| C | d <= 1.0 |
| D | d <= 2.0 |
| F | d > 2.0, or no tests |

Grades describe evidence coverage, not safety.

**Overall grade.** The grade of the `solid` class, raised one step (and never above C) when the `solid_surrogate` class has a test with d <= 0.5. Surrogate fuels (for example the BRE tests) burn differently from real habitat materials, so they can strengthen the case that a regime has been explored but cannot, alone, earn a B or A. The cap at C encodes that.

Expected overall grades on the full dataset: ISS B, Moon Envelope C, Artemis Base D, EVA Suit F.



## Detector blind spot

**Data.** The detector analysis uses the NASA SAME and SAME-R smoke-detection runs (the same PSI data, kept out of habitat coverage). Each run records the scatter channel (V), the ionization channel (delta V) and the count median diameter (um) for one smoke source.

**Channels and thresholds.** Two detector channels are offered. `scatter` models an ISS-style photoelectric detector and alarms at 2.0 V or more. `ionization` alarms at or above a threshold calibrated to Lampwick: the 10th percentile (lower method) of Lampwick ionization delta V, which flags 24 of 26 Lampwick runs. The values live in `detector.json` and the engine reads them from there. A run is "caught" by a combination of detectors if any channel in it reaches its threshold.

**Why obscuration is omitted.** Lampwick reads 0 V on the obscuration channel in 20 of 26 runs, so no meaningful alarm threshold can be set. HALO does not offer the channel rather than invent one.

**Denominators.** Every count and percentage uses only the runs where the relevant channel (or all channels in the combination) is non-null, and the interface shows "x of y runs". For example Kapton scatter is 20 of 35 runs (36 runs in total, one null). "Scatter low" means a scatter reading below 2.0 V, i.e. the photoelectric detector would not alarm. Materials with no SAME analog (PMMA, Nomex) report no detector result rather than a guess.

**"Would likely miss".** The brief says the selected detectors "would likely miss" a material's smoke when they catch fewer than half of that material's SAME runs (caught / runs with every selected channel recorded < 50%). The same rule raises the critical detector flag. A material with no runs is "no SAME data", never 0%.

**Caveat.** SAME ran at ISS air (21% O2, 1 atm). Smoke behavior at a habitat atmosphere is untested, so these numbers describe detector response in ISS air only.

## Investigation ranking

HALO ranks the NASA investigations by how useful they are for a given habitat. The score is a transparent weighted sum of four parts, each between 0 and 1:

`score = 0.4 * proximity + 0.3 * fuel + 0.2 * hazard + 0.1 * richness`

On screen (/method and the brief) the four parts are named Closeness (proximity), Fuel match (fuel), Hazards (hazard) and Evidence size (richness).

The weights are defaults and can be overridden; the interface shows each part so the ordering can be audited.

| Part | Definition |
|---|---|
| proximity | `1 / (1 + d)`, where d is the evidence distance from the habitat to the investigation's nearest eligible test. No eligible tests gives 0. |
| fuel | 1 if any of the investigation's fuel classes matches the habitat: `solid` or `solid_surrogate` when materials are listed, `droplet` when liquids are present. `gas` counts 0.5. Otherwise 0. |
| hazard | The number of the investigation's hazards in {spread, extinction, smoke_detection, toxicity}, divided by 4. |
| richness | `log10(1 + rows + 5 * publications) / log10(1 + max)`, where max is the largest such value across all investigations. |

**Detection-proximity rule.** Smoke-detection investigations (hazard `smoke_detection`, for example SAME and SAME-R) have no rows in the coverage set, because they are detection data. Their proximity uses the ambient atmosphere they ran in, 21% O2 and 14.7 psia, measured against the habitat with the same distance scaling. Their fuel part is 1 when the habitat lists at least one detector, otherwise 0.

**Tie-break.** Equal scores are ordered by psiId ascending (string order), so the ranking is deterministic.

Each ranked entry carries short, deterministic "why" strings for the parts that scored strongly (for example the tested atmosphere and whether it was measured). The ranking describes relevance of evidence, not a safety judgement.


## Self-extinction model and Next Test to Fly

**Self-extinction (card: "Will it go out on its own? (liquid droplet fuels)").** The model is a logistic regression fitted to FLEX droplet tests with N2 as the only diluent, on the features O2 percent, ln(initial droplet diameter in mm) and ln(pressure in atm): `P(extinguish) = 1 / (1 + exp(-(c0 + c1*O2 + c2*ln d0 + c3*ln p)))`. It is evaluated at d0 = 3 mm. The 200 bootstrap refits are stored as coefficient rows (intercept first). The reported value is the median of the 200 probabilities, and the band is their 2.5th and 97.5th percentiles; the plotted curve repeats this for O2 from 10 to 45 percent in 0.5 steps.

**Pressure clamping.** The fits only saw 0.7 to 1.0 atm. A habitat pressure outside that range is clamped to the nearest tested value before evaluating, and the result carries `extrapolatedPressure = true` so the card says so. The same applies to O2 outside the tested O2 range (`extrapolatedO2`).

**Caveat.** This is a droplet-fuel result. It says how readily small liquid fuel droplets self-extinguish as the atmosphere changes; it is not a prediction for cabin solids such as cloth, polymer film or foam, and it is not a safety certification.

**Next Test to Fly.** Candidates are a grid of fuel class (solid, droplet, gas) by O2 25 to 40 percent (step 1) by pressure 4 to 15 psia (step 0.5). For each habitat preset, the "before" distance is the evidence distance to the nearest existing test of that class; the "after" distance treats the candidate as a measured test of that class. Both are capped at 3 before differencing so the far-off EVA suit does not dominate. The score is the sum over presets of `priority * (before - after)`, multiplied by 2 for solids because cabin materials are the headline gap. Priorities: Artemis 3, Moon Envelope 3, Pressurized Rover 2, ISS 1, EVA Suit 1. Presets with zero gain are reported as not helped.

**Diversity rule.** After the best candidate, each further pick must differ from every earlier pick by at least 3 O2 points or at least 1.5 psia, or be a different fuel class, so the runners-up are not near-duplicates of the first pick. Four picks are returned by default.


## Sources for presets, standards and limits

- **Artemis Base preset (34% O2, 8.2 psia).** The exploration atmosphere NASA recommended for EVA-intensive mission phases after its 2012 re-evaluation of the earlier 8.0 psia / 32% O2 proposal: Norcross, Conkin and Wessel, *Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere* ([NTRS 20150021491](https://ntrs.nasa.gov/citations/20150021491)).
- **Moon Envelope and Pressurized Rover presets (30% O2, 10.2 psia).** The edge of the range the [challenge statement](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) gives for the Moon base and rovers: 30% O2 or more at 10.2 psi or less.
- **Material screening standard.** Spacecraft materials are screened with Test 1 (upward flame spread, in normal gravity) of [NASA-STD-6001B](https://standards.nasa.gov/standard/NASA/NASA-STD-6001). BASS found that Test 1 "is not conservative, and materials can burn at lower oxygen levels in microgravity than on Earth" ([A Researcher's Guide to Combustion Science, 2015](https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/)). HALO grades say where microgravity tests exist; they do not replace Test 1.
- **Crew exposure limits.** The Saffire VI aftermath statement ("CO and CO2 exceeded crew limits") uses the limits stated in [NTRS 20260001992](https://ntrs.nasa.gov/citations/20260001992): Spacecraft Maximum Allowable Concentrations (JSC 20584; current revision [NTRS 20240007713](https://ntrs.nasa.gov/citations/20240007713)) for CO, 425 ppm over 1 hour and 100 ppm over 24 hours, and NASA-STD-3001 Volume 2 for CO2, 3 mmHg averaged over 1 hour. HALO quotes the report's comparison and does not recompute it.

## Data HALO cannot use yet

PSI holds no partial-gravity combustion data. These investigations are named on `/method#limits` and graded on by nothing, because none has data in PSI:

| Investigation | What it is | Source |
|---|---|---|
| LUCI, Lunar Combustion Investigation | Cotton-fiberglass fabric and acrylic burned in simulated lunar gravity on a spinning sounding rocket | [NTRS 20250010653](https://ntrs.nasa.gov/citations/20250010653) |
| FM2, Flammability of Materials on the Moon | The first combustion experiment planned on another planetary body, at 1/6 g | [NASA Glenn](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/) |
| SoFIE, Solid Fuel Ignition and Extinction | ISS studies of solid-material ignition, spread and extinction | [NASA Glenn](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/solid-fuel-ignition-and-extinction-sofie/) |
| FLARE, Flammability Limits at Reduced-g (JAXA-led, with NASA, ESA and universities) | A method to estimate microgravity flammability limits from ground tests | [NASA Glenn](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-limits-at-reduced-g-experiment-flare/) |
