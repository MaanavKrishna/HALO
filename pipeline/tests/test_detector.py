import pytest

from halo_pipeline.detector import build_detector


@pytest.fixture(scope="module")
def det():
    return build_detector()


def _below(det, material, field, thr):
    vals = [r[field] for r in det["runs"] if r["material"] == material and r[field] is not None]
    return sum(v < thr for v in vals), len(vals)


def test_blind_spot(det):
    assert det["ambient"] == {"o2Pct": 21, "pressurePsia": 14.7}
    assert det["thresholds"]["scatterV"] == 2.0
    assert _below(det, "Kapton", "scatterV", 2.0) == (20, 35)
    assert _below(det, "Teflon", "scatterV", 2.0) == (18, 23)
    assert _below(det, "Lampwick", "scatterV", 2.0) == (0, 26)
    thr = det["thresholds"]["ionizationDV"]
    assert thr == pytest.approx(0.248, abs=5e-4)
    lw = [r["ionizationDV"] for r in det["runs"] if r["material"] == "Lampwick" and r["ionizationDV"] is not None]
    assert len(lw) == 26 and sum(v >= thr for v in lw) == 24
    # Obscuration is deliberately not offered.
    assert all("obscurationV" not in r and "obscuration" not in r for r in det["runs"])
    assert set(det["runs"][0]) == {"material", "scatterV", "ionizationDV", "cmdUm"}
    assert "20 of 26" in det["obscurationNote"]
    assert isinstance(det["calibration"], str) and det["calibration"]


def test_run_count(det):
    assert len(det["runs"]) == 154
    kapton = [r for r in det["runs"] if r["material"] == "Kapton"]
    assert len(kapton) == 36
    assert all(r["cmdUm"] is None or r["cmdUm"] > 0 for r in det["runs"])
