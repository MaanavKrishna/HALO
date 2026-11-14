# Build-time SI summaries

Each of HALO's 24 PSI investigations has a short summary in `web/src/data/summaries.json`. An LLM writes them once, at build time, from the investigation's PSI record. Code then checks every answer, and the author reads all of them against PSI before they ship. The web app marks each sentence from this file with an "SI" chip.

This page covers the build-time summaries only, not the SI used at runtime.

## Model and call

| Setting | Value |
|---|---|
| Model | `claude-sonnet-5-5` |
| Output | JSON constrained to a schema (`output_config.format`), with the hazard field limited to the vocabulary below |
| Effort | medium |
| Refusal fallback | server-side default fallback, so a declined request is retried on a fallback model inside the same call. The entry's `model` field records the model that actually answered. |
| Code | `pipeline/halo_pipeline/si_build.py`, run with `make si` (see `pipeline/README.md`) |

## Inputs

For each investigation the prompt holds only text from its vendored PSI detail record (`data/raw/det/PSI-*.json`):

- title and acronym
- objective, approach, hypothesis and research impacts
- the titles of its publications

The prompt holds nothing else: no tables, no HALO numbers, no web content. `make si-dry` prints the exact prompt for one investigation.

## Prompt rules

The system prompt tells the model to:

- use only the given text and add nothing from memory;
- write no number unless that exact number appears in the text (no numbers at all is preferred);
- never call anything "safe" or "unsafe", and describe evidence instead;
- keep `summary` to 60 words or fewer;
- give `habitatRelevance` in one or two sentences, only as far as the text supports;
- pick `hazards` from the closed vocabulary `ignition`, `spread`, `extinction`, `smoke_detection`, `suppression`, `toxicity`;
- list in `sensors` only the instruments the text names;
- return one to three `quotes` copied verbatim from the text that support the summary.

## Validator

`validate_summary(summary, det)` returns a list of errors. An empty list means the answer passes. It flags:

| Check | Rule |
|---|---|
| Hazard vocabulary | every hazard is one of the six terms above |
| Quotes | each quote is an exact passage of the source text, after whitespace, dash and quote-mark normalization; at least one quote |
| Numbers | every number in `summary` and `habitatRelevance` also appears in the source text. Digits attached to letters (O2, CO2) are formula subscripts and are not counted. |
| Length | `summary` is 60 words or fewer |
| Verdict words | neither field uses "safe" or "unsafe" ("safety" is allowed) |
| Shape | text fields are non-empty strings and lists are lists of strings |

The validator cannot judge whether a summary is a fair reading of the record, and it does not catch spelled-out numbers ("two") or sensor names that differ from the text. The human review covers those.

## needsReview

If an answer fails validation, it is sent back once with the list of failed checks attached. If the second answer also fails, it is saved with `"needsReview": true`. Hazards outside the vocabulary are dropped before saving, so every entry still matches the web app's schema. Entries that pass carry no `needsReview` field.

## Human review

After `make si`, the author:

1. Runs `make si-check` to list every entry that fails a check or is flagged.
2. Reads all 24 summaries against their PSI records, not only the flagged ones.
3. Fixes or rewrites any entry that is wrong, removes `needsReview`, and sets `"model": "human-edited"`. Later runs of `make si` never overwrite a human-edited entry unless `--force` is given.
4. Runs `make si-check` again, then commits `summaries.json`.

## Cost and secrets

- One run makes at most 60 API requests, retries included. A full run needs about 24 to 48.
- The API key is read from the environment or a gitignored `.env` file and is never printed or written anywhere.
- `summaries.json` is static data, bundled at build time like the other data files. Showing a summary never calls the model.
