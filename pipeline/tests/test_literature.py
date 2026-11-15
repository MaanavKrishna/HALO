from halo_pipeline.literature import build_literature

KEYS = {"mission", "sampleId", "material", "o2Pct", "pressurePsia", "flowCmS", "spreadRateMmS", "outcome",
        "sourceUrl", "sources", "confidence"}


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


def test_literature_sources():
    lit = {r["sampleId"]: r for r in build_literature()}
    for r in lit.values():
        assert r["sources"][0]["url"] == r["sourceUrl"]
        assert all(s["url"].startswith("https://ntrs.nasa.gov/citations/") and s["label"].startswith("NTRS ") for s in r["sources"])
    # V-4's spread rate comes from Eigenbrod (NTRS 20210017785), which is now its primary source.
    assert lit["V-4"]["sourceUrl"].endswith("20210017785")
    assert [s["url"][-11:] for s in lit["V-4"]["sources"]] == ["20210017785", "20210011521"]
    labels = {s["url"][-11:]: s["label"] for r in lit.values() for s in r["sources"]}
    assert "Saffire VI" in labels["20260001992"] and "Saffire-IV" not in labels["20260001992"]
