import math

import pytest

from halo_pipeline.ingest import load_unified


@pytest.fixture(scope="module")
def U():
    return load_unified()


def test_row_counts(U):
    counts = U.acronym.value_counts().to_dict()
    expected = {"FLEX": 274, "BASS-II": 129, "SPICE": 435, "SAME-R": 109, "CFI": 87, "ACME BRE": 43}
    for acronym, n in expected.items():
        assert counts.get(acronym) == n, acronym
    assert len(U) == 1967


def test_flex_cp1252_and_bad_values(U):
    flex114 = U[(U.acronym == "FLEX") & (U.test_id.astype(str).str.strip() == "114")]
    assert len(flex114) == 1
    assert math.isnan(flex114.pressure_atm.iloc[0])
    assert math.isnan(flex114.pressure_psia.iloc[0])
    bre = U[U.acronym == "ACME BRE"]
    assert (bre.o2_pct.dropna() <= 100).all()
