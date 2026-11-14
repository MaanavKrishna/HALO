import hashlib
import json

import pytest

from halo_pipeline.export import CONTRACT_FILES, export_all


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
    assert set(m["files"]) == set(CONTRACT_FILES)
    for name, sha in m["files"].items():
        assert hashlib.sha256((out / name).read_bytes()).hexdigest() == sha
    assert len(m["psiDatasetDois"]) == 24
    assert "summaries.json" not in m["files"]


def test_tests_json(out):
    tests = json.loads((out / "tests.json").read_text())
    assert len(tests) == 1225
