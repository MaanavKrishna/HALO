from halo_pipeline.literature import build_literature

KEYS = {"mission", "sampleId", "material", "o2Pct", "pressurePsia", "flowCmS", "spreadRateMmS", "outcome",
        "sourceUrl", "confidence"}


def test_literature_shape():
    lit = build_literature()
    assert len(lit) == 14  # 15 CSV rows; V-1 has no O2 and no identified material
    for r in lit:
        assert set(r) == KEYS
        assert isinstance(r["o2Pct"], float)
        assert r["sourceUrl"].startswith("https://ntrs.nasa.gov/")
        assert r["confidence"] in {"high", "medium", "low"}
    vi2 = next(r for r in lit if r["sampleId"] == "VI-2")
    assert vi2["o2Pct"] == 31.0 and vi2["pressurePsia"] == 7.85 and vi2["spreadRateMmS"] == 4.05
