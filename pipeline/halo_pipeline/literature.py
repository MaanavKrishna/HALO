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


def build_literature(csv: Path | None = None) -> list[dict]:
    d = pd.read_csv(csv or paths.LITERATURE_CSV, dtype=str, keep_default_na=False)
    out = []
    for r in d.itertuples():
        o2 = _f(r.o2_pct)
        if o2 is None:
            continue  # V-1: never ignited, material and atmosphere not reported
        out.append({
            "mission": r.mission,
            "sampleId": r.sample_id,
            "material": r.material,
            "o2Pct": o2,
            "pressurePsia": _f(r.pressure_psia),
            "flowCmS": _f(r.flow_cm_s),
            "spreadRateMmS": _f(r.spread_rate_mm_s),
            "outcome": r.outcome,
            # The CSV lists several reports separated by ';'; the first is the primary source.
            "sourceUrl": r.source_url.split(";")[0].strip(),
            "confidence": r.confidence,
        })
    return out
