import json

import pytest

from halo_pipeline import paths
from halo_pipeline.catalog import HAZARDS, build_investigations

VOCAB = {"ignition", "spread", "extinction", "smoke_detection", "suppression", "toxicity"}
KEYS = {"psiId", "acronym", "title", "hardware", "fuelClasses", "hazards", "objective", "researchImpacts", "nRows",
        "o2Range", "pRangePsia", "flowRangeCmS", "varied", "publications", "datasetDoi", "license", "startDate",
        "endDate", "dateNote", "acronymSource", "geometry"}


@pytest.fixture(scope="module")
def inv(unified):
    return build_investigations(unified)


def test_catalog_complete(inv):
    det_ids = {p.stem for p in paths.RAW_DET.glob("*.json")}
    assert len(det_ids) == 24
    assert set(HAZARDS) == det_ids
    assert len(inv) == 24
    for i in inv:
        assert set(i) == KEYS, i["psiId"]
        assert i["hazards"], i["psiId"]
        assert set(i["hazards"]) <= VOCAB, i["psiId"]
        assert i["datasetDoi"].startswith("10.60555/"), i["psiId"]
        assert i["acronym"], i["psiId"]
        assert set(i["fuelClasses"]) <= {"solid", "solid_surrogate", "droplet", "gas"}
        for pub in i["publications"]:
            assert set(pub) == {"title", "doi", "year"}
    by = {i["psiId"]: i for i in inv}
    assert "smoke_detection" in by["PSI-101"]["hazards"]
    assert "smoke_detection" in by["PSI-102"]["hazards"]
    # Smoke-point studies measure soot/smoke production (cabin particulate hazard), not detector response.
    assert by["PSI-107"]["hazards"] == ["toxicity"] and by["PSI-60"]["hazards"] == ["toxicity"]
    detection = {i["psiId"] for i in inv if "smoke_detection" in i["hazards"]}
    assert detection == {"PSI-47", "PSI-101", "PSI-102", "PSI-115"}
    assert by["PSI-106"]["hazards"] == ["extinction"] and by["PSI-22"]["hazards"] == ["extinction"]


def test_catalog_values(inv):
    by = {i["psiId"]: i for i in inv}
    assert by["PSI-69"]["nRows"] == 274
    assert by["PSI-25"]["o2Range"] == [13.6, 22.2]
    assert by["PSI-26"]["o2Range"] is None
    # Assumed values (cabin air, 1 atm) never appear as a tested range.
    assert by["PSI-107"]["o2Range"] is None and by["PSI-107"]["pRangePsia"] is None
    assert by["PSI-25"]["pRangePsia"] is None
    assert by["PSI-20"]["pRangePsia"] == [8.2, 10.2]  # inferred from the BRE objective text
    # Saffire-I dates in PSI are copied from SAME: blanked with a note.
    assert by["PSI-98"]["startDate"] is None and by["PSI-98"]["dateNote"]
    assert "2016" not in by["PSI-98"]["dateNote"] and "20170008805" in by["PSI-98"]["dateNote"]
    # Flame Design O2 is a burner-issued oxidizer, not a cabin atmosphere.
    assert by["PSI-10"]["o2Range"] is None and by["PSI-10"]["pRangePsia"] is None
    assert by["PSI-69"]["startDate"] == "2007-08-01"
    assert by["PSI-68"]["o2Range"] == [17.0, 30.0]
    # Inverse flames (burner-issued O2) do not widen the CFI-G range.
    assert by["PSI-159"]["o2Range"][1] <= 41
