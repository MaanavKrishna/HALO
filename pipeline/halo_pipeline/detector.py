"""SAME / SAME-R smoke-detector response per run (PSI-101 analyzed results workbook)."""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pandas as pd

from . import paths

SHEET = "Material Sort"
COLS = {
    "Flight 1=same 2=sameR, g=ground": "flight",
    "Sample Type": "material",
    "ISS Detector Scatter (volts)": "scatter",
    "ISS Obscuration (volts)": "obscuration",
    "Ion B Delta (volts)": "ion",
    "M1/M0 (micro-m)--CMD": "cmd",
}
SCATTER_ALARM_V = 2.0


def load_runs(xlsx: Path | None = None) -> pd.DataFrame:
    """Flight runs only (SAME = 1, SAME-R = 2); ground runs are dropped."""
    d = pd.read_excel(xlsx or paths.SAME_XLSX, sheet_name=SHEET, header=1)
    d = d[list(COLS)].rename(columns=COLS)
    d["flight"] = pd.to_numeric(d.flight, errors="coerce")
    d = d[d.flight.isin([1, 2])].copy()
    d["material"] = d.material.astype(str).str.strip()
    for c in ("scatter", "obscuration", "ion", "cmd"):
        d[c] = pd.to_numeric(d[c], errors="coerce")
    d.loc[d.cmd <= 0, "cmd"] = np.nan  # zero/negative count-mean diameter = no measurement
    return d


def _v(x, nd: int = 4):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), nd)


def build_detector(xlsx: Path | None = None) -> dict:
    d = load_runs(xlsx)
    lamp = d[d.material.str.lower() == "lampwick"]
    lamp_ion = lamp.ion.dropna().to_numpy()
    ion_thr = float(np.percentile(lamp_ion, 10, method="lower"))
    lamp_obsc = lamp.obscuration.dropna()
    n_zero, n_obsc = int((lamp_obsc == 0).sum()), len(lamp_obsc)

    return {
        "ambient": {"o2Pct": 21, "pressurePsia": 14.7},
        "thresholds": {"scatterV": SCATTER_ALARM_V, "ionizationDV": round(ion_thr, 6)},
        "calibration": (
            "Voltages are per-run summary values from the 'Material Sort' sheet of the PSI-101 SAME/SAME-R "
            "analyzed results workbook (flight runs only). The ISS photoelectric detector's certified alarm is "
            "specified in obscuration (1%/ft), not volts, so a 2.0 V forward-scatter reading is used as a "
            "working alarm proxy; readings near 6.25 V appear to be sensor saturation (inferred). The ionization "
            "threshold is the 10th percentile ('lower' method) of Ion B delta-V over the Lampwick (cellulose) runs, "
            "a smoke the ISS detector reliably sees, so nearly all Lampwick runs exceed it by construction. Counts use only "
            "runs where the channel is non-null."
        ),
        "obscurationNote": (
            f"The ISS obscuration channel is omitted: Lampwick, a smoke every detector should see, reads 0 V in "
            f"{n_zero} of {n_obsc} runs, so no meaningful obscuration threshold exists."
        ),
        "runs": [
            {"material": r.material, "scatterV": _v(r.scatter), "ionizationDV": _v(r.ion, 6), "cmdUm": _v(r.cmd)}
            for r in d.itertuples()
        ],
    }
