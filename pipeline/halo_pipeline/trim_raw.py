"""Trim vendored PSI detail records (data/raw/det/*.json) to the fields HALO uses.

PSI records carry `added`/`removed` version-diff arrays that are megabytes long and
unused. This keeps the keys the pipeline reads, plus the descriptive text the summary
step needs, and rewrites each file in place. Run with `make trim-raw`.
To restore full records, re-fetch them as described in docs/FETCH.md.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from . import paths

KEEP_KEYS = (
    # read by the pipeline
    "accession", "doi", "title", "investigationAcronym", "experimentHardware", "objective",
    "researchImpacts", "publications", "licenseIdentifier", "licenseName", "licenseLink",
    "investigationStartDate", "investigationEndDate",
    # kept for later summaries and attribution
    "description", "approach", "hypothesis", "contacts", "version",
)


def trim_record(rec: dict) -> dict:
    return {k: rec[k] for k in KEEP_KEYS if k in rec}


def trim_dir(det_dir: Path | None = None) -> tuple[int, int]:
    det_dir = det_dir or paths.RAW_DET
    before = after = 0
    for p in sorted(det_dir.glob("*.json")):
        raw = p.read_bytes()
        before += len(raw)
        data = (json.dumps(trim_record(json.loads(raw)), ensure_ascii=False, indent=1) + "\n").encode("utf-8")
        p.write_bytes(data)
        after += len(data)
    return before, after


if __name__ == "__main__":
    b, a = trim_dir(Path(sys.argv[1]) if len(sys.argv) > 1 else None)
    print(f"trimmed {paths.RAW_DET if len(sys.argv) < 2 else sys.argv[1]}: {b / 1024:.0f} KiB -> {a / 1024:.0f} KiB")
