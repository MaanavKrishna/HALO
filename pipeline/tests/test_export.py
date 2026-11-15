import hashlib
import json

import pytest

from halo_pipeline.export import CONTRACT_FILES, EXPORT_FILES, export_all


@pytest.fixture(scope="module")
def out(tmp_path_factory):
    d = tmp_path_factory.mktemp("data")
    (d / "summaries.json").write_text('{"keep": true}')
    export_all(d)
    return d


def test_files_written(out):
    names = {p.name for p in out.glob("*.json")}
    assert names == set(CONTRACT_FILES) | {"manifest.json", "summaries.json"}
    total = sum(p.stat().st_size for p in out.glob("*.json"))
    assert total < 1.5 * 1024 * 1024


def test_summaries_untouched(out):
    assert json.loads((out / "summaries.json").read_text()) == {"keep": True}


def test_manifest(out):
    m = json.loads((out / "manifest.json").read_text())
    assert m["totalRows"] == 1967 and m["eligibleRows"] == 1225
    assert set(m["files"]) == set(CONTRACT_FILES) | set(EXPORT_FILES)
    for name, sha in m["files"].items():
        assert hashlib.sha256((out / name).read_bytes()).hexdigest() == sha
    assert len(m["psiDatasetDois"]) == 24
    assert "summaries.json" not in m["files"]


def test_tests_json(out):
    tests = json.loads((out / "tests.json").read_text())
    assert len(tests) == 1225


def test_tests_csv(out):
    import csv

    rows = list(csv.DictReader((out / "tests.csv").read_text().splitlines()))
    assert len(rows) == 1225
    assert list(rows[0]) == ["id", "psiId", "acronym", "fuelClass", "fuel", "geometry", "o2Pct", "o2Src", "pressurePsia",
                             "pSrc", "flowCmS", "flowSrc", "outcome", "diluent", "datasetDoi"]
    tests = json.loads((out / "tests.json").read_text())
    assert [r["id"] for r in rows] == [t["id"] for t in tests]
    assert all(r["id"].startswith(r["psiId"] + ":") for r in rows)
    assert all(r["datasetDoi"].startswith("10.60555/") for r in rows)
    flex = next(r for r in rows if r["acronym"] == "FLEX")
    assert flex["geometry"].startswith("droplet d0 ") and flex["flowSrc"] == "assumed"


def test_investigation_fields(out):
    invs = json.loads((out / "investigations.json").read_text())
    halo = sorted(i["psiId"] for i in invs if i["acronymSource"] == "halo")
    assert halo == ["PSI-115", "PSI-117", "PSI-142", "PSI-60", "PSI-62"]
    assert all(i["geometry"].strip() for i in invs)
    flex = next(i for i in invs if i["psiId"] == "PSI-69")
    assert flex["geometry"] == "Free droplets, 1.1 to 4.67 mm initial diameter"
    assert "suppression" in flex["hazards"]
