PY := .venv/bin/python

.PHONY: venv data test trim-raw

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
