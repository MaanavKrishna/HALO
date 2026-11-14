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

**Caveat.** SAME ran at ISS air (21% O2, 1 atm). Smoke behavior at a habitat atmosphere is untested, so these numbers describe detector response in ISS air only.

## Investigation ranking

HALO ranks the NASA investigations by how useful they are for a given habitat. The score is a transparent weighted sum of four parts, each between 0 and 1:

`score = 0.4 * proximity + 0.3 * fuel + 0.2 * hazard + 0.1 * richness`

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

