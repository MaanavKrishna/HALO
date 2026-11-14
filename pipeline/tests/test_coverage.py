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
    keys = {"id", "psiId", "acronym", "fuelClass", "fuel", "o2Pct", "pressurePsia", "o2Src", "pSrc"}
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
