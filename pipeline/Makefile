PY := .venv/bin/python

.PHONY: venv data test trim-raw si si-dry si-check

venv:
	python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# Writes the six JSON contract files plus manifest.json into ../web/src/data/.
# Never writes summaries.json (that file belongs to `make si`).
data:
	$(PY) -m halo_pipeline.cli all

test:
	.venv/bin/pytest -q

# Rewrites ../data/raw/det/*.json keeping only the fields HALO uses (see docs/FETCH.md).
trim-raw:
	$(PY) -m halo_pipeline.trim_raw

# Writes ../web/src/data/summaries.json with an LLM (needs ANTHROPIC_API_KEY in the
# environment or pipeline/.env). Resumable; stops after 60 API calls. See docs/SI.md.
si:
	$(PY) -m halo_pipeline.cli si

# Prints the prompt for one investigation and validates hand-made samples. No API calls.
si-dry:
	$(PY) -m halo_pipeline.cli si --dry-run

# Re-validates summaries.json as it stands (use after hand edits). No API calls.
si-check:
	$(PY) -m halo_pipeline.cli si --check
