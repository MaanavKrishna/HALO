"""Habitat-coverage eligibility: which unified rows describe a real burn atmosphere."""
from __future__ import annotations

import math

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
        })
    return out
