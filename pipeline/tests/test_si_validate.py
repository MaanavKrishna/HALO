"""validate_summary: the guard between generated summaries and summaries.json."""
import pytest

from halo_pipeline.catalog import load_det
from halo_pipeline.si_build import HAZARD_VOCAB, source_text, validate_summary

DET = {
    "title": "Burning and Suppression of Solids",
    "investigationAcronym": "BASS",
    "objective": "Assess the effectiveness of an inert,\n    gaseous extinguishing agent in putting out flames.",
    "approach": "Samples burned in flows up to 40 cm/s at 21% oxygen.",
    "hypothesis": "Flames over thick fuels behave differently in low gravity.",
    "researchImpacts": "Material selection follows NASA–STD–6001 Test 1.",
    "publications": [{"title": "Flame spread over PMMA in microgravity"}],
}


def good(**over):
    s = {
        "summary": "BASS burned solid samples in microgravity and tested an inert gaseous agent at 21% oxygen.",
        "habitatRelevance": "It shows how a gaseous extinguishing agent acts on flames over thick fuels.",
        "hazards": ["spread", "suppression"],
        "sensors": [],
        "quotes": ["gaseous extinguishing agent in putting out flames"],
    }
    s.update(over)
    return s


def test_clean_summary_passes():
    assert validate_summary(good(), DET) == []


def test_vocabulary_is_the_catalog_vocabulary():
    assert set(HAZARD_VOCAB) == {"ignition", "spread", "extinction", "smoke_detection", "suppression", "toxicity"}


def test_hazard_outside_vocabulary_is_flagged():
    errs = validate_summary(good(hazards=["spread", "explosion"]), DET)
    assert len(errs) == 1 and "explosion" in errs[0]


def test_quote_not_in_source_is_flagged():
    errs = validate_summary(good(quotes=["the agent always extinguished every flame"]), DET)
    assert len(errs) == 1 and "quote" in errs[0]


def test_quote_matching_after_whitespace_normalization_passes():
    # The source breaks this phrase across a newline and indentation.
    assert validate_summary(good(quotes=["an inert, gaseous extinguishing agent"]), DET) == []


def test_quote_with_ascii_dashes_matches_typographic_source():
    assert validate_summary(good(quotes=["NASA-STD-6001 Test 1"]), DET) == []


def test_empty_quote_is_flagged():
    assert validate_summary(good(quotes=["  "]), DET)


def test_no_quotes_is_flagged():
    assert validate_summary(good(quotes=[]), DET)


def test_number_absent_from_source_is_flagged_in_summary():
    errs = validate_summary(good(summary="BASS burned samples at 30% oxygen."), DET)
    assert len(errs) == 1 and "30" in errs[0]


def test_number_absent_from_source_is_flagged_in_habitat_relevance():
    errs = validate_summary(good(habitatRelevance="Flows above 55 cm/s were not tested."), DET)
    assert len(errs) == 1 and "55" in errs[0]


def test_numbers_present_in_source_pass():
    assert validate_summary(good(summary="Samples burned in flows up to 40 cm/s at 21% oxygen."), DET) == []


def test_chemical_formula_digits_are_not_numbers():
    assert validate_summary(good(summary="BASS tested flames in O2 and CO2 mixtures."), DET) == []


def test_decimal_must_match_exactly():
    errs = validate_summary(good(summary="Flows up to 40.5 cm/s."), DET)
    assert len(errs) == 1 and "40.5" in errs[0]


def test_summary_over_sixty_words_is_flagged():
    errs = validate_summary(good(summary=" ".join(["flame"] * 61)), DET)
    assert len(errs) == 1 and "61" in errs[0]


def test_summary_of_exactly_sixty_words_passes():
    assert validate_summary(good(summary=" ".join(["flame"] * 60)), DET) == []


@pytest.mark.parametrize("word", ["safe", "Unsafe", "SAFE"])
def test_verdict_words_are_flagged(word):
    assert validate_summary(good(habitatRelevance=f"Cabins are {word} at this oxygen level."), DET)


def test_safety_is_not_a_verdict_word():
    assert validate_summary(good(habitatRelevance="It informs crew fire safety planning."), DET) == []


def test_wrong_types_are_flagged_not_raised():
    errs = validate_summary({"summary": 3, "habitatRelevance": "", "hazards": "spread", "sensors": None, "quotes": "x"}, DET)
    assert len(errs) >= 4


def test_source_text_includes_every_input_field():
    t = source_text(DET)
    for part in ("Burning and Suppression", "inert,", "40 cm/s", "thick fuels", "6001", "PMMA"):
        assert part in t


def test_real_record_quote_passes():
    det = load_det()["PSI-26"]
    s = good(summary="BASS studied burning and suppression of solids.", quotes=[
        "Assess the effectiveness of an inert, gaseous extinguishing agent",
    ])
    assert validate_summary(s, det) == []
