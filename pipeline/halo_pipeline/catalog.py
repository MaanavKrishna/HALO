"""Investigation catalog: one entry per PSI combustion-science record (24 in total)."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from . import paths
from .coverage import FUEL_CLASS, source_class

# Fire-safety hazards each investigation informs, read from its PSI `objective` text.
# Closed vocabulary: ignition | spread | extinction | smoke_detection | suppression | toxicity.
HAZARDS: dict[str, list[str]] = {
    "PSI-10": ["extinction"],                    # Flame Design: soot-inception and extinction limits
    "PSI-20": ["extinction"],                    # BRE: burning in habitat atmospheres, extinction limits
    "PSI-21": ["extinction"],                    # CLD: lift-off and extinction limits of weak coflow flames
    "PSI-22": ["extinction"],                    # E-FIELD: stabilized near-limit lifted flames
    "PSI-23": ["extinction"],                    # s-Flame: convective and radiative extinction limits
    "PSI-25": ["ignition", "spread", "extinction", "suppression"],  # BASS-II: objective 1 + suppression design
    "PSI-26": ["spread", "suppression"],         # BASS: material flammability, inert extinguishing agent
    "PSI-39": ["extinction"],                    # CFI: droplet size, pressure and flame extinction
    "PSI-47": ["smoke_detection"],               # DAFT: smoke-aerosol counter validation for SAME
    "PSI-60": ["toxicity"],                      # SPICE analysis: smoke-point modelling = soot/smoke production
    "PSI-62": ["spread", "extinction"],          # BASS modelling: concurrent spread, flammability limits
    "PSI-68": ["extinction"],                    # FLEX-2: extinction mechanisms and flammability limits
    "PSI-69": ["extinction", "suppression"],     # FLEX: flammability limits, gaseous suppressants
    "PSI-98": ["spread", "extinction"],          # Saffire-I: large-scale fire growth, low-g flammability limits
    "PSI-99": ["spread", "extinction"],          # Saffire-II: same objectives
    "PSI-100": ["spread", "extinction"],         # Saffire-III: same objectives
    "PSI-101": ["smoke_detection"],              # SAME-R: smoke particle size for detection
    "PSI-102": ["smoke_detection"],              # SAME: smoke particle size for detection
    "PSI-106": ["extinction"],                   # SLICE: lift-off (blow-off) stability limits
    "PSI-107": ["toxicity"],                     # SPICE: smoke points = soot/smoke production, not detector data
    "PSI-115": ["smoke_detection"],              # SAME modelling: smoke generation in microgravity
    "PSI-117": ["ignition", "extinction"],       # FLEX cool-flame CFD: ignition windows and extinction
    "PSI-142": ["extinction"],                   # cool-flame counterflow: flammability and extinction limits
    "PSI-159": ["ignition", "extinction"],       # CFI-G: cool/hot ignition and self-extinction conditions
}

# Labels for ground/analysis grants whose PSI record has no acronym.
ACRONYM_FALLBACK = {
    "PSI-60": "SPICE analysis",
    "PSI-62": "BASS spread model",
    "PSI-115": "SAME smoke model",
    "PSI-117": "FLEX cool-flame CFD",
    "PSI-142": "Cool-flame counterflow",
}

# Sample geometry per investigation, read from the PSI tables (material/size columns) and, where the
# tables log none, from the PSI objective or hardware text. FLEX and SPICE ranges are computed from rows
# (see _geometry). Plain text, shown on /explore.
GEOMETRY: dict[str, str] = {
    "PSI-10": "Spherical and coflow gas diffusion flames (porous sphere burner; size not tabulated)",
    "PSI-20": "Porous circular burners, 25 and 50 mm diameter (gas surrogate for a burning solid)",
    "PSI-21": "Coflow jet diffusion flames (burner size not tabulated)",
    "PSI-22": "Coflow jet flames with an electrified mesh (burner size not tabulated)",
    "PSI-23": "Spherical diffusion flames (burner size not tabulated)",
    "PSI-25": "PMMA rods 1/4 to 1/2 in. diameter, PMMA films 0.1 to 0.4 mm thick (1 to 2 cm wide), "
              "PMMA slabs and spherical sections, SIBAL fabric 1 to 2 cm wide, Nomex, a Japan wax candle",
    "PSI-26": "PMMA spheres 1 and 2 cm, PMMA slabs, SIBAL and Nomex strips 1 to 2 cm, an Ultem sheet, "
              "paraffin and Japan wax candles and slabs",
    "PSI-39": "Free and fiber-supported droplets of n-dodecane and n-dodecane/iso-dodecane blends (diameter not tabulated)",
    "PSI-47": "Arizona Road Dust test aerosol (no flame)",
    "PSI-60": "Analysis of SPICE coflow jet flame images (no new samples)",
    "PSI-62": "Numerical model of concurrent flame spread over solids (no samples)",
    "PSI-68": "Droplets 1.5 to 5 mm initial diameter (design matrix)",
    "PSI-98": "SIBAL cotton/fiberglass fabric sheet, 40.6 × 94 cm (length × width as logged)",
    "PSI-99": "Strips 5 cm wide, 5 to 29 cm long: silicone, SIBAL, PMMA and Nomex, 0.27 mm to 1 cm thick",
    "PSI-100": "SIBAL cotton/fiberglass fabric sheet, 40.6 × 94 cm (logged as 94 cm long, 40.6 cm wide)",
    "PSI-101": "Heated solid samples, no flame: Kapton, Teflon, silicone, lampwick, Pyrell",
    "PSI-102": "Heated solid samples, no flame: Kapton, Teflon, silicone rubber, lampwick, dibutyl phthalate",
    "PSI-106": "Coflow jet diffusion flames, several burner diameters (not tabulated)",
    "PSI-115": "Numerical model of pyrolysis smoke (no samples)",
    "PSI-117": "Numerical model of FLEX droplet cool flames, small and large droplets",
    "PSI-142": "Ground counterflow flames, ozone-sensitized (laboratory)",
    "PSI-159": "Gaseous diffusion flames, normal and inverse (burner size not tabulated)",
}


def _geometry(pid: str, rows: pd.DataFrame) -> str:
    g = pd.to_numeric(rows.get("geometry_mm", pd.Series(dtype=float)), errors="coerce").dropna()
    if pid == "PSI-69" and len(g):
        return f"Free droplets, {g.min():g} to {g.max():g} mm initial diameter"
    if pid == "PSI-107" and len(g):
        sizes = [f"{x:.2f}" for x in sorted(g.unique())]
        listed = ", ".join(sizes[:-1]) + (" and " if len(sizes) > 1 else "") + sizes[-1]
        return f"Coflow jet flames from {listed} mm nozzles"
    return GEOMETRY[pid]


# Fuel classes for investigations without per-test rows in the unified table.
FUEL_CLASSES_EXTRA = {
    "PSI-10": ["gas"], "PSI-68": ["droplet"], "PSI-60": ["gas"], "PSI-62": ["solid"],
    "PSI-101": ["solid"], "PSI-102": ["solid"], "PSI-115": ["solid"], "PSI-117": ["droplet"],
    "PSI-142": ["droplet"], "PSI-47": [],
}

# FLEX-2 has a design matrix per fuel, not per-test rows.
FLEX2 = {"o2Range": [17.0, 30.0], "pRangePsia": [7.348, 44.088], "flowRangeCmS": [0.1, 5.0],
         "varied": ["o2", "pressure", "flow", "fuel", "diluent"]}

DATE_NOTES = {
    "PSI-98": "PSI date fields appear inconsistent with the flight; see NTRS 20170008805",
}

# Investigations whose O2 column is a burner-issued oxidizer, not the cabin atmosphere:
# their O2 and pressure ranges are not habitat conditions, so both are null.
NO_AMBIENT_RANGES = {"PSI-10"}


def load_det(det_dir: Path | None = None) -> dict[str, dict]:
    det_dir = det_dir or paths.RAW_DET
    return {p.stem: json.loads(p.read_text()) for p in sorted(det_dir.glob("*.json"))}


def _iso(mdy: str) -> str | None:
    """PSI dates are MM-DD-YYYY strings; blank means unknown."""
    s = (mdy or "").strip()
    if not s:
        return None
    m, d, y = s.split("-")
    return f"{y}-{m}-{d}"


def _not_assumed(src: pd.Series) -> pd.Series:
    """True where a value came from a table or an inference, False where it was assumed."""
    def ok(x) -> bool:
        try:
            return source_class(x) in ("measured", "inferred")
        except ValueError:
            return False
    return src.map(ok).astype(bool)


def _rng(s: pd.Series) -> list[float] | None:
    v = pd.to_numeric(s, errors="coerce").dropna()
    return [round(float(v.min()), 3), round(float(v.max()), 3)] if len(v) else None


def _varied(g: pd.DataFrame) -> list[str]:
    out = []
    for name, col in [("o2", "o2_pct"), ("pressure", "pressure_psia"), ("flow", "flow_cm_s"),
                      ("fuel", "fuel"), ("diluent", "diluent")]:
        if col in g and g[col].dropna().nunique() > 1:
            out.append(name)
    return out


def _psi_sort_key(pid: str) -> int:
    return int(pid.split("-")[1])


def build_investigations(U: pd.DataFrame, det: dict[str, dict] | None = None) -> list[dict]:
    det = det or load_det()
    out = []
    for pid in sorted(det, key=_psi_sort_key):
        rec = det[pid]
        rows = U[U.psi_id == pid]
        g = rows[rows.ambient_valid.astype(bool)]
        if pid == "PSI-68":
            ranges = FLEX2
        elif pid in NO_AMBIENT_RANGES:
            ranges = {"o2Range": None, "pRangePsia": None, "flowRangeCmS": _rng(g.flow_cm_s), "varied": _varied(g)}
        else:
            # O2 and pressure ranges cover only tabulated or inferred values; an all-assumed range is null.
            ranges = {"o2Range": _rng(g.o2_pct[_not_assumed(g.o2_src)]),
                      "pRangePsia": _rng(g.pressure_psia[_not_assumed(g.p_src)]),
                      "flowRangeCmS": _rng(g.flow_cm_s), "varied": _varied(g)}
        classes = sorted({FUEL_CLASS[a] for a in g.acronym.unique() if a in FUEL_CLASS}) or FUEL_CLASSES_EXTRA.get(pid, [])
        has_date_note = pid in DATE_NOTES
        out.append({
            "psiId": pid,
            "acronym": (rec.get("investigationAcronym") or "").strip() or ACRONYM_FALLBACK[pid],
            # "halo" marks a label HALO assigned because the PSI record's acronym is blank.
            "acronymSource": "psi" if (rec.get("investigationAcronym") or "").strip() else "halo",
            "geometry": _geometry(pid, rows),
            "title": rec["title"].strip(),
            "hardware": (rec.get("experimentHardware") or "").strip(),
            "fuelClasses": classes,
            "hazards": HAZARDS[pid],
            "objective": rec.get("objective", "").strip(),
            "researchImpacts": rec.get("researchImpacts", "").strip(),
            "nRows": int(len(rows)),
            **{k: ranges[k] for k in ("o2Range", "pRangePsia", "flowRangeCmS", "varied")},
            "publications": [
                {"title": p.get("title", "").strip(), "doi": (p.get("doi") or "").strip() or None, "year": None}
                for p in rec.get("publications", [])
            ],
            "datasetDoi": rec["doi"],
            "license": (rec.get("licenseIdentifier") or "").strip() or "unspecified",
            "startDate": None if has_date_note else _iso(rec.get("investigationStartDate", "")),
            "endDate": None if has_date_note else _iso(rec.get("investigationEndDate", "")),
            "dateNote": DATE_NOTES.get(pid),
        })
    return out


def dataset_dois(det: dict[str, dict] | None = None) -> dict[str, str]:
    det = det or load_det()
    return {pid: det[pid]["doi"] for pid in sorted(det, key=_psi_sort_key)}
