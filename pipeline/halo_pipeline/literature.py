"""Saffire IV-VI (and I-II) points transcribed from NASA technical reports."""
from __future__ import annotations

import math
from pathlib import Path

import pandas as pd

from . import paths


def _f(x) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(v) else v


# NTRS reports cited by the Saffire CSV, labelled by the paper itself (not by the first row that cites it).
# Titles checked against ntrs.nasa.gov on 2026-11-15.
NTRS_LABELS = {
    "20170008805": "Large-scale spacecraft flammability tests, Saffire I-III (ICES 2017)",
    "20210011521": "Saffire IV and V results (ICES 2021)",
    "20210017785": "Flame spread over structured PMMA, Saffire V (ICES 2021, Eigenbrod)",
    "20240002981": "Preliminary results from Saffire VI (ICES 2024)",
    "20250002675": "Vehicle modeling during the Saffire VI burns (ICES 2025)",
    "20260001992": "Heat and smoke emission from tests on Saffire VI, tables cover IV-VI (ICES 2026)",
}


def source_label(url: str) -> str:
    nid = url.rstrip("/").split("/")[-1]
    return f"NTRS {nid}: {NTRS_LABELS[nid]}" if nid in NTRS_LABELS else url


def build_literature(csv: Path | None = None) -> list[dict]:
    d = pd.read_csv(csv or paths.LITERATURE_CSV, dtype=str, keep_default_na=False)
    out = []
    for r in d.itertuples():
        o2 = _f(r.o2_pct)
        if o2 is None:
            continue  # V-1: never ignited, material and atmosphere not reported
        urls = [u.strip() for u in r.source_url.split(";") if u.strip()]
        out.append({
            "mission": r.mission,
            "sampleId": r.sample_id,
            "material": r.material,
            "o2Pct": o2,
            "pressurePsia": _f(r.pressure_psia),
            "flowCmS": _f(r.flow_cm_s),
            "spreadRateMmS": _f(r.spread_rate_mm_s),
            "outcome": r.outcome,
            # The CSV lists several reports separated by ';'; the first is the primary source
            # (the report that carries the row's numbers). `sources` keeps every report, labelled.
            "sourceUrl": urls[0],
            "sources": [{"url": u, "label": source_label(u)} for u in urls],
            "confidence": r.confidence,
        })
    return out
