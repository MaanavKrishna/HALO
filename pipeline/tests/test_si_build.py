"""The `si` run loop, with a fake model call: no network, no key."""
import json

import pytest

from halo_pipeline import si_build
from halo_pipeline.si_build import (
    BudgetExceeded, CallBudget, build_prompt, load_summaries, read_api_key, run, write_summaries,
)

DET = {
    "PSI-1": {"title": "Alpha flames", "objective": "Measure flame spread over cotton in low gravity.",
              "approach": "", "hypothesis": "", "researchImpacts": "", "publications": []},
    "PSI-2": {"title": "Beta flames", "objective": "Find extinction limits of droplet flames.",
              "approach": "", "hypothesis": "", "researchImpacts": "", "publications": []},
}

OK = {"summary": "Alpha measured flame spread over cotton.", "habitatRelevance": "Cotton spread informs cabin fires.",
      "hazards": ["spread"], "sensors": [], "quotes": ["flame spread over cotton"]}
BAD = dict(OK, summary="Alpha measured spread at 99 cm/s.")


class FakeCall:
    """Returns queued responses; counts calls through the shared budget."""

    def __init__(self, responses, budget):
        self.responses, self.budget, self.prompts = list(responses), budget, []

    def __call__(self, system, user):
        self.budget.spend()
        self.prompts.append(user)
        return dict(self.responses.pop(0)), "test-model"


def test_prompt_carries_source_and_rules():
    system, user = build_prompt("PSI-1", DET["PSI-1"])
    assert "flame spread over cotton" in user
    assert "verbatim" in system.lower() and "60 words" in system


def test_valid_first_answer_is_written_without_review_flag(tmp_path):
    out = tmp_path / "summaries.json"
    budget = CallBudget(10)
    stats = run({"PSI-1": DET["PSI-1"]}, out, FakeCall([OK], budget))
    data = json.loads(out.read_text())
    assert stats["written"] == 1 and budget.used == 1
    e = data["PSI-1"]
    assert e["model"] == "test-model" and "needsReview" not in e and e["generatedAt"].endswith("Z")
    assert set(e) == {"summary", "habitatRelevance", "hazards", "sensors", "quotes", "model", "generatedAt"}


def test_invalid_answer_is_reasked_once_with_errors(tmp_path):
    out = tmp_path / "summaries.json"
    budget = CallBudget(10)
    call = FakeCall([BAD, OK], budget)
    run({"PSI-1": DET["PSI-1"]}, out, call)
    assert budget.used == 2 and "99" in call.prompts[1]
    assert "needsReview" not in json.loads(out.read_text())["PSI-1"]


def test_twice_invalid_answer_is_marked_needs_review(tmp_path):
    out = tmp_path / "summaries.json"
    run({"PSI-1": DET["PSI-1"]}, out, FakeCall([BAD, BAD], CallBudget(10)))
    assert json.loads(out.read_text())["PSI-1"]["needsReview"] is True


def test_out_of_vocab_hazard_never_reaches_the_file(tmp_path):
    out = tmp_path / "summaries.json"
    weird = dict(OK, hazards=["spread", "explosion"])
    run({"PSI-1": DET["PSI-1"]}, out, FakeCall([weird, weird], CallBudget(10)))
    assert json.loads(out.read_text())["PSI-1"]["hazards"] == ["spread"]


def test_valid_existing_entries_are_skipped_unless_forced(tmp_path):
    out = tmp_path / "summaries.json"
    run({"PSI-1": DET["PSI-1"]}, out, FakeCall([OK], CallBudget(10)))
    budget = CallBudget(10)
    stats = run(DET, out, FakeCall([dict(OK, summary="Beta found extinction limits.",
                                         quotes=["extinction limits of droplet flames"])], budget))
    assert budget.used == 1 and stats["skipped"] == 1 and set(json.loads(out.read_text())) == {"PSI-1", "PSI-2"}
    budget = CallBudget(10)
    run({"PSI-1": DET["PSI-1"]}, out, FakeCall([OK], budget), force=True)
    assert budget.used == 1


def test_human_edited_entries_are_never_regenerated_without_force(tmp_path):
    out = tmp_path / "summaries.json"
    write_summaries(out, {"PSI-1": dict(BAD, model="human-edited", generatedAt="2026-11-15T08:00:00Z")})
    budget = CallBudget(10)
    run({"PSI-1": DET["PSI-1"]}, out, FakeCall([], budget))
    assert budget.used == 0


def test_cost_cap_stops_the_run_and_keeps_finished_entries(tmp_path):
    out = tmp_path / "summaries.json"
    budget = CallBudget(1)
    with pytest.raises(BudgetExceeded):
        run(DET, out, FakeCall([OK, OK], budget))
    assert set(json.loads(out.read_text())) == {"PSI-1"}


def test_budget_counts_and_refuses_past_cap():
    b = CallBudget(2)
    b.spend(); b.spend()
    with pytest.raises(BudgetExceeded):
        b.spend()
    assert b.used == 2


def test_write_is_atomic_and_leaves_no_temp_files(tmp_path, monkeypatch):
    out = tmp_path / "summaries.json"
    write_summaries(out, {"PSI-1": dict(OK, model="m", generatedAt="t")})

    def boom(*a, **k):
        raise OSError("disk full")
    monkeypatch.setattr(si_build.os, "replace", boom)
    with pytest.raises(OSError):
        write_summaries(out, {"PSI-2": {}})
    assert set(json.loads(out.read_text())) == {"PSI-1"}
    assert [p.name for p in tmp_path.iterdir()] == ["summaries.json"]


def test_load_missing_or_empty_file_is_empty_dict(tmp_path):
    assert load_summaries(tmp_path / "nope.json") == {}
    (tmp_path / "e.json").write_text("{}")
    assert load_summaries(tmp_path / "e.json") == {}


def test_entries_are_written_in_psi_order(tmp_path):
    out = tmp_path / "s.json"
    write_summaries(out, {"PSI-100": {}, "PSI-9": {}, "PSI-20": {}})
    assert list(json.loads(out.read_text())) == ["PSI-9", "PSI-20", "PSI-100"]


def test_key_from_env_wins(tmp_path):
    f = tmp_path / ".env"
    f.write_text("ANTHROPIC_API_KEY=from-file\n")
    assert read_api_key({"ANTHROPIC_API_KEY": "from-env"}, [f]) == "from-env"


def test_key_from_env_file_with_quotes_and_comments(tmp_path):
    f = tmp_path / ".env"
    f.write_text('# comment\nOTHER=1\nexport ANTHROPIC_API_KEY="from-file"\n')
    assert read_api_key({}, [tmp_path / "missing", f]) == "from-file"


def test_missing_or_placeholder_key_is_none(tmp_path):
    f = tmp_path / ".env"
    f.write_text("ANTHROPIC_API_KEY=your-key-here\n")
    assert read_api_key({}, [f]) is None
    assert read_api_key({"ANTHROPIC_API_KEY": ""}, []) is None


# ---- the real call wrapper, with the SDK client replaced by a fake

class _Block:
    def __init__(self, text):
        self.type, self.text = "text", text


class _Resp:
    def __init__(self, text, stop="end_turn", model="claude-sonnet-5-5"):
        self.content, self.stop_reason, self.model = [_Block(text)], stop, model


def _fake_client(monkeypatch, outcomes, seen):
    import anthropic

    class Msgs:
        def create(self, **kw):
            seen.append(kw)
            o = outcomes.pop(0)
            if isinstance(o, Exception):
                raise o
            return o

    class Fake:
        def __init__(self, **kw):
            assert kw["max_retries"] == 0
            self.messages = Msgs()

    monkeypatch.setattr(anthropic, "Anthropic", Fake)


def _conn_err():
    import anthropic
    import httpx2 as httpx
    return anthropic.APIConnectionError(request=httpx.Request("POST", "https://example.invalid"))


def _status_err(code):
    import anthropic
    import httpx2 as httpx
    req = httpx.Request("POST", "https://example.invalid")
    return anthropic.APIStatusError("err", response=httpx.Response(code, request=req), body=None)


def test_transient_errors_retry_twice_and_count_every_attempt(monkeypatch):
    seen, sleeps = [], []
    _fake_client(monkeypatch, [_conn_err(), _status_err(529), _Resp(json.dumps(OK))], seen)
    budget = CallBudget(10)
    call = si_build.make_api_call("k", budget, sleep=sleeps.append)
    answer, model = call("sys", "user")
    assert answer == OK and model == "claude-sonnet-5-5"
    assert budget.used == 3 and sleeps == list(si_build.BACKOFF_S)
    kw = seen[0]
    assert kw["model"] == "claude-sonnet-5-5" and kw["output_config"]["format"]["schema"] == si_build.SCHEMA
    assert "betas" not in kw and "fallbacks" not in kw


def test_third_transient_error_gives_up(monkeypatch):
    _fake_client(monkeypatch, [_conn_err(), _conn_err(), _conn_err()], [])
    with pytest.raises(Exception):
        si_build.make_api_call("k", CallBudget(10), sleep=lambda s: None)("s", "u")


def test_bad_request_is_not_retried(monkeypatch):
    _fake_client(monkeypatch, [_status_err(400)], [])
    budget = CallBudget(10)
    with pytest.raises(Exception):
        si_build.make_api_call("k", budget, sleep=lambda s: None)("s", "u")
    assert budget.used == 1


@pytest.mark.parametrize("resp", [_Resp("", stop="refusal"), _Resp('{"summary": ', stop="max_tokens"), _Resp("not json")])
def test_unusable_answers_raise_model_output_error(monkeypatch, resp):
    _fake_client(monkeypatch, [resp], [])
    with pytest.raises(si_build.ModelOutputError):
        si_build.make_api_call("k", CallBudget(10), sleep=lambda s: None)("s", "u")


def test_missing_key_exits_2_without_traceback(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(si_build, "read_api_key", lambda *a, **k: None)
    assert si_build.si_main(tmp_path) == 2
    assert "ANTHROPIC_API_KEY is not set" in capsys.readouterr().err


def test_written_file_is_world_readable(tmp_path):
    import stat
    out = tmp_path / "s.json"
    write_summaries(out, {})
    assert stat.S_IMODE(out.stat().st_mode) == 0o644


def test_check_on_corrupt_file_is_a_friendly_error(tmp_path, capsys):
    (tmp_path / "summaries.json").write_text("{not json")
    assert si_build.si_main(tmp_path, do_check=True) == 1
    assert "not valid JSON" in capsys.readouterr().err


def test_max_calls_zero_means_zero(monkeypatch):
    from halo_pipeline import cli
    seen = {}
    monkeypatch.setattr(si_build, "si_main", lambda out, **kw: seen.update(kw) or 0)
    cli.main(["si", "--max-calls", "0"])
    assert seen["max_calls"] == 0
    cli.main(["si", "--max-calls", "500"])
    assert seen["max_calls"] == 60
    cli.main(["si"])
    assert seen["max_calls"] == 60


def test_system_prompt_says_source_is_data():
    system, _ = build_prompt("PSI-1", DET["PSI-1"])
    assert "never instructions" in system
