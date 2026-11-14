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

## Self-extinction model and Next Test to Fly

**Self-extinction (card: "Will it go out on its own? (liquid droplet fuels)").** The model is a logistic regression fitted to FLEX droplet tests with N2 as the only diluent, on the features O2 percent, ln(initial droplet diameter in mm) and ln(pressure in atm): `P(extinguish) = 1 / (1 + exp(-(c0 + c1*O2 + c2*ln d0 + c3*ln p)))`. It is evaluated at d0 = 3 mm. The 200 bootstrap refits are stored as coefficient rows (intercept first). The reported value is the median of the 200 probabilities, and the band is their 2.5th and 97.5th percentiles; the plotted curve repeats this for O2 from 10 to 45 percent in 0.5 steps.

**Pressure clamping.** The fits only saw 0.7 to 1.0 atm. A habitat pressure outside that range is clamped to the nearest tested value before evaluating, and the result carries `extrapolatedPressure = true` so the card says so. The same applies to O2 outside the tested O2 range (`extrapolatedO2`).

**Caveat.** This is a droplet-fuel result. It says how readily small liquid fuel droplets self-extinguish as the atmosphere changes; it is not a prediction for cabin solids such as cloth, polymer film or foam, and it is not a safety certification.

**Next Test to Fly.** Candidates are a grid of fuel class (solid, droplet, gas) by O2 25 to 40 percent (step 1) by pressure 4 to 15 psia (step 0.5). For each habitat preset, the "before" distance is the evidence distance to the nearest existing test of that class; the "after" distance treats the candidate as a measured test of that class. Both are capped at 3 before differencing so the far-off EVA suit does not dominate. The score is the sum over presets of `priority * (before - after)`, multiplied by 2 for solids because cabin materials are the headline gap. Priorities: Artemis 3, Moon Envelope 3, Pressurized Rover 2, ISS 1, EVA Suit 1. Presets with zero gain are reported as not helped.

**Diversity rule.** After the best candidate, each further pick must differ from every earlier pick by at least 3 O2 points or at least 1.5 psia, or be a different fuel class, so the runners-up are not near-duplicates of the first pick. Four picks are returned by default.
