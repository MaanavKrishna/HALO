import json

from halo_pipeline import paths
from halo_pipeline.trim_raw import KEEP_KEYS, trim_record

REQUIRED = {"accession", "doi", "title", "investigationAcronym", "objective", "approach", "hypothesis",
            "researchImpacts", "publications", "experimentHardware", "licenseIdentifier",
            "investigationStartDate", "investigationEndDate", "contacts", "version", "description"}


def test_keep_keys_cover_required():
    assert REQUIRED <= set(KEEP_KEYS)


def test_vendored_records_are_trimmed():
    files = sorted(paths.RAW_DET.glob("*.json"))
    assert len(files) == 24
    for p in files:
        rec = json.loads(p.read_text())
        assert REQUIRED <= set(rec), p.name
        assert set(rec) <= set(KEEP_KEYS), p.name
        assert "added" not in rec and "removed" not in rec
    assert sum(p.stat().st_size for p in files) < 2 * 1024 * 1024


def test_trim_record_drops_version_diffs():
    rec = {"accession": "PSI-1", "doi": "x", "added": [1] * 10, "removed": [], "objective": "o"}
    assert trim_record(rec) == {"accession": "PSI-1", "doi": "x", "objective": "o"}
