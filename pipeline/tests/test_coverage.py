import pytest

from halo_pipeline.coverage import eligible_tests

SRC = {"measured", "assumed", "inferred"}
CLASSES = {"solid", "solid_surrogate", "droplet", "gas"}


@pytest.fixture(scope="module")
def tests(unified):
    return eligible_tests(unified)


def test_eligibility(tests):
    assert len(tests) == 1225
    assert all(t["o2Pct"] is not None and t["o2Pct"] <= 100 for t in tests)
    assert all(t["pressurePsia"] is not None for t in tests)
    assert not any(t["acronym"] == "ACME Flame Design" for t in tests)
    assert not any(t["acronym"] in ("SAME", "SAME-R") for t in tests)
    # CFI-G inverse flames carry burner-issued O2, so none may survive.
    cfig = [t for t in tests if t["acronym"] == "ACME CFI-G"]
    assert len(cfig) == 179
    assert max(t["o2Pct"] for t in tests if t["acronym"] == "BASS-II") == pytest.approx(22.2)
    bre = [t for t in tests if t["acronym"] == "ACME BRE"]
    assert bre and all(t["fuelClass"] == "solid_surrogate" for t in bre)
    assert {t["fuelClass"] for t in tests} <= CLASSES
    assert all(t["o2Src"] in SRC and t["pSrc"] in SRC for t in tests)
    assert len({t["id"] for t in tests}) == len(tests)
    keys = {"id", "psiId", "acronym", "fuelClass", "fuel", "o2Pct", "pressurePsia", "o2Src", "pSrc",
            "flowCmS", "flowSrc", "outcome", "diluent"}
    assert all(set(t) == keys for t in tests)


def test_moon_window(tests):
    win = [t for t in tests if t["o2Pct"] >= 30 and t["pressurePsia"] <= 10.2]
    assert sum(t["fuelClass"] == "solid" for t in win) == 0
    assert sum(t["acronym"] == "ACME CFI-G" for t in win) == 20
    assert sum(t["acronym"] == "ACME BRE" for t in win) == 13
    assert len(win) == 33
    assert all(t["pSrc"] == "inferred" for t in win if t["acronym"] == "ACME BRE")


def test_source_vocabulary(tests):
    by = {t["acronym"]: t for t in tests}
    assert by["FLEX"]["o2Src"] == "measured" and by["FLEX"]["pSrc"] == "measured"
    assert by["SPICE"]["o2Src"] == "assumed"
    assert by["BASS-II"]["o2Src"] == "measured" and by["BASS-II"]["pSrc"] == "assumed"


def test_fuel_whitespace_collapsed(tests):
    assert all(t["fuel"] == " ".join(t["fuel"].split()) for t in tests)


OUTCOMES = {"extinguished", "burned-out", "flow-stopped", "no-ignition", "no-hot-ignition", "cool-flame", "disrupted",
            "spread", "unknown"}


def test_new_fields(tests):
    assert all(t["outcome"] in OUTCOMES for t in tests)
    assert all(t["flowSrc"] in SRC | {None} for t in tests)
    assert all((t["flowCmS"] is None) == (t["flowSrc"] is None) for t in tests)
    by = lambda a: [t for t in tests if t["acronym"] == a]  # noqa: E731
    assert {t["flowSrc"] for t in by("SPICE")} == {"measured", None}  # 8 negative + duplicates set null
    assert all(t["flowSrc"] == "assumed" and t["flowCmS"] == 0 for t in by("FLEX"))
    assert {t["flowSrc"] for t in by("BASS-II") if t["flowCmS"] is not None} == {"inferred"}
    assert all(t["flowSrc"] is None for t in by("ACME CFI-G"))
    assert {t["diluent"] for t in by("FLEX")} == {"N2", "CO2", "He"}
    assert all(t["diluent"] is None for t in tests if t["acronym"] != "FLEX")


def test_flex_diluent_extinction(tests):
    """Suppression finding: FLEX runs ending in self-extinction, by diluent (B3)."""
    flex = [t for t in tests if t["acronym"] == "FLEX"]
    share = {}
    for d in ("N2", "CO2", "He"):
        rows = [t for t in flex if t["diluent"] == d]
        share[d] = (sum(t["outcome"] == "extinguished" for t in rows), len(rows))
    # 1 CO2 run (FLEX 114, logged at 0 mmHg) has no pressure and is not eligible: 88/123 in the raw table.
    assert share == {"N2": (58, 101), "CO2": (87, 122), "He": (40, 50)}
    # O2 levels all three diluents were run at: CO2 and He still end in extinction more often than N2.
    levels = set.intersection(*({round(t["o2Pct"], 1) for t in flex if t["diluent"] == d} for d in ("N2", "CO2", "He")))
    m = {d: [t for t in flex if t["diluent"] == d and round(t["o2Pct"], 1) in levels] for d in ("N2", "CO2", "He")}
    assert levels == {14.0, 15.0, 16.0, 18.0, 20.0, 21.0}
    ext = {d: (sum(t["outcome"] == "extinguished" for t in m[d]), len(m[d])) for d in m}
    assert ext == {"N2": (40, 61), "CO2": (57, 68), "He": (28, 31)}


def test_cfig_moon_window_outcomes(tests):
    """B4: the 20 CFI-G rows inside the Moon window, by recorded test end."""
    win = [t for t in tests if t["acronym"] == "ACME CFI-G" and t["o2Pct"] >= 30 and t["pressurePsia"] <= 10.2]
    from collections import Counter
    assert Counter(t["outcome"] for t in win) == {"extinguished": 13, "flow-stopped": 5, "cool-flame": 2}
    by = {t["id"]: t["outcome"] for t in win}
    # "-" with "direct cool - no hot ignition" is a cool flame, not a failed ignition.
    assert by["PSI-159:21106 F2"] == by["PSI-159:21106 F5"] == "cool-flame"
    # "Hot ignition: no" but the SE/FT column says FT: kept as flow-stopped.
    assert by["PSI-159:21106 F4"] == "flow-stopped"
    cfig = [t for t in tests if t["acronym"] == "ACME CFI-G"]
    assert "no-ignition" not in {t["outcome"] for t in cfig}
    assert sum(t["outcome"] == "no-hot-ignition" for t in cfig) == 44


def test_bass2_flow_and_no_ignition(tests):
    b = {t["id"].split(":", 1)[1]: t for t in tests if t["acronym"] == "BASS-II"}
    assert b["O5b"]["flowCmS"] == 5          # "49   5 cm/s": the cm/s value, not the fan count
    assert b["O13a"]["flowCmS"] == 5         # fan counts first, initial air speed in parentheses
    assert b["O21"]["flowCmS"] is None       # "incr to 28": no initial value
    assert b["O22"]["flowCmS"] == 4          # "4 incr to 26.5": initial value
    assert b["O12"]["outcome"] == "no-ignition" and b["O12"]["flowCmS"] is None
    assert max(t["flowCmS"] for t in b.values() if t["flowCmS"] is not None) < 40
