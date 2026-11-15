"""Habitat-coverage eligibility: which unified rows describe a real burn atmosphere."""
from __future__ import annotations

import math
import re

import pandas as pd

# Investigations whose rows never count toward habitat coverage.
EXCLUDED_ACRONYMS = {
    "ACME Flame Design",  # porous-sphere burner; normal/inverse labelling is unreliable for ambient O2
    "SAME", "SAME-R",     # overheated solids without flame: detection data, not burn conditions
}

FUEL_CLASS = {
    "BASS": "solid", "BASS-II": "solid",
    "Saffire-I": "solid", "Saffire-II": "solid", "Saffire-III": "solid",
    "ACME BRE": "solid_surrogate",
    "FLEX": "droplet", "FLEX-2": "droplet", "CFI": "droplet",
    "ACME CFI-G": "gas", "ACME CLD Flame": "gas", "ACME s-Flame": "gas", "ACME E-FIELD": "gas",
    "SPICE": "gas", "SLICE": "gas",
}


def source_class(src: str) -> str | None:
    """Map a free-text provenance string onto measured | assumed | inferred.

    Returns None for burner-issued values, which never describe the ambient.
    Order matters: "table (XO2 = burner-issued oxidizer)" starts with "table".
    """
    s = str(src)
    if "burner-issued" in s:
        return None
    if s.startswith("table"):
        return "measured"
    if "ASSUMED" in s:
        return "assumed"
    if "INFERRED" in s or "not tabulated" in s:
        return "inferred"
    raise ValueError(f"unmapped provenance string: {src!r}")


# Closed outcome vocabulary for tests.json (see docs/DATA-CONTRACT.md).
OUTCOMES = ("extinguished", "burned-out", "flow-stopped", "no-ignition", "no-hot-ignition", "cool-flame", "disrupted",
            "spread", "unknown")

# FLEX "Test end": Extinction = the flame went out before the droplet was consumed.
_FLEX_END = {"extinction": "extinguished", "completion": "burned-out", "disruption": "disrupted"}
# CFI-G "Self-ext or flow term": SE the hot flame self-extinguished, FT the run ended by stopping the fuel flow,
# "-" no hot ignition. "-" is not "no ignition": some of those rows burned as cool flames (see _cfig_outcome).
_CFIG_END = {"se": "extinguished", "ft": "flow-stopped", "-": "no-hot-ignition"}


def _isnan(x) -> bool:
    try:
        return math.isnan(float(x))
    except (TypeError, ValueError):
        return False


def outcome_class(r) -> str:
    """Normalise a row's recorded test end onto OUTCOMES. Only values a PSI table states are mapped."""
    acr, raw = r.acronym, str(r.get("outcome", "") if hasattr(r, "get") else getattr(r, "outcome", "")).strip()
    if raw == "nan":
        raw = ""
    if acr == "FLEX":
        return _FLEX_END.get(raw.lower(), "unknown")
    if acr == "ACME CFI-G":
        out = _CFIG_END.get(raw.lower(), "unknown")
        # Comments "direct cool - no hot ignition" (21106 F2, F5): a cool flame burned, no hot flame formed.
        if out == "no-hot-ignition" and "direct cool" in str(r.get("comments", "")).lower():
            return "cool-flame"
        # The SE/FT column wins over "Hot ignition": 21106 F4 logs "Hot ignition: no" yet FT and a 22 s burn
        # time, so it is kept as flow-stopped (the run ended when the fuel flow was stopped).
        return out
    if acr == "BASS-II":
        if r.get("no_ignition_text") == 1:
            return "no-ignition"  # "no ign at any flow" (O12)
        # The free-text fan/air notes mark the flow at which the flame went out ("ext", "blowoff", ...).
        return "extinguished" if r.get("ext_flag_text") == 1 else "unknown"
    if acr.startswith("Saffire"):
        rate = r.get("spread_rate_mm_s")
        return "spread" if rate is not None and not _isnan(rate) else "unknown"
    return "unknown"


def flow_class(flow, src) -> str | None:
    """Provenance of a row's flow velocity, or None when no flow value exists."""
    if flow is None or _isnan(flow):
        return None
    s = str(src)
    if s.startswith("table"):
        return "measured"
    if s.startswith("quiescent"):
        return "assumed"  # 0 cm/s by design (quiescent droplet or burner), not a logged reading
    if s.startswith("'Air display'"):
        return "inferred"  # first number of a free-text display reading; units assumed cm/s
    raise ValueError(f"unmapped flow provenance string: {src!r}")


def _fmt_mm(x: float) -> str:
    return f"{float(x):g}"


def row_geometry(r) -> str:
    """Per-row sample geometry where the table logs one; empty otherwise."""
    g = r.get("geometry_mm")
    if g is not None and not _isnan(g):
        if r.acronym == "FLEX":
            return f"droplet d0 {_fmt_mm(g)} mm"
        if r.acronym == "SPICE":
            return f"nozzle {_fmt_mm(round(float(g), 2))} mm"
        if r.acronym == "ACME BRE":
            return f"porous burner {_fmt_mm(g)} mm dia"
    t = r.get("thickness")
    if isinstance(t, str) and t.strip():
        raw = t.strip()
        unit = r.get("thickness_unit") or ""
        shown = f"{raw} {unit}" if unit and not re.search(r"[a-z]", raw, re.I) else raw
        note = ""
        if re.match(r"^0\d", raw):  # Saffire-II logs "037 mm"; the same SIBAL fabric is 0.37 mm elsewhere
            note = f"; likely 0.{raw[1:]}"
        return f"thickness {shown} (as logged{note})"
    return ""


def eligibility_mask(U: pd.DataFrame) -> pd.Series:
    return (
        U.ambient_valid.astype(bool)
        & ~U.acronym.isin(EXCLUDED_ACRONYMS)
        & U.o2_pct.notna()
        & U.pressure_psia.notna()
        & (U.o2_pct <= 100)
    )


def _r(x: float, nd: int = 3) -> float:
    return round(float(x), nd)


def eligible_tests(df: pd.DataFrame) -> list[dict]:
    """Rows that count toward habitat coverage, shaped for tests.json."""
    E = df[eligibility_mask(df)]
    out: list[dict] = []
    seen: dict[str, int] = {}
    for _, r in E.iterrows():
        o2_src, p_src = source_class(r.o2_src), source_class(r.p_src)
        if o2_src is None or p_src is None:
            continue
        base = f"{r.psi_id}:{str(r.test_id).strip()}"
        k = seen.get(base, 0)
        seen[base] = k + 1
        o2, p = float(r.o2_pct), float(r.pressure_psia)
        assert not (math.isnan(o2) or math.isnan(p))
        out.append({
            "id": base if k == 0 else f"{base}#{k + 1}",
            "psiId": r.psi_id,
            "acronym": r.acronym,
            "fuelClass": FUEL_CLASS[r.acronym],
            "fuel": " ".join(str(r.fuel).split()),
            "o2Pct": _r(o2),
            "pressurePsia": _r(p),
            "o2Src": o2_src,
            "pSrc": p_src,
            "flowCmS": None if flow_class(r.flow_cm_s, r.flow_src) is None else _r(r.flow_cm_s),
            "flowSrc": flow_class(r.flow_cm_s, r.flow_src),
            "outcome": outcome_class(r),
            # Only FLEX logs the diluent per test (from the ambient composition columns).
            "diluent": r.diluent if r.acronym == "FLEX" else None,
        })
    return out


def tests_csv(df: pd.DataFrame, dois: dict[str, str]) -> str:
    """The eligible rows as CSV for modelers: the tests.json columns plus per-row geometry and the dataset DOI."""
    import csv
    import io

    E = df[eligibility_mask(df)]
    geo = {}
    seen: dict[str, int] = {}
    for _, r in E.iterrows():
        if source_class(r.o2_src) is None or source_class(r.p_src) is None:
            continue
        base = f"{r.psi_id}:{str(r.test_id).strip()}"
        k = seen.get(base, 0)
        seen[base] = k + 1
        geo[base if k == 0 else f"{base}#{k + 1}"] = row_geometry(r)
    cols = ["id", "psiId", "acronym", "fuelClass", "fuel", "geometry", "o2Pct", "o2Src", "pressurePsia", "pSrc",
            "flowCmS", "flowSrc", "outcome", "diluent", "datasetDoi"]
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(cols)
    for t in eligible_tests(df):
        row = {**t, "geometry": geo[t["id"]], "datasetDoi": dois.get(t["psiId"], "")}
        w.writerow(["" if row[c] is None else row[c] for c in cols])
    return buf.getvalue()
