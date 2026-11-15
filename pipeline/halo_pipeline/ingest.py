"""Read every PSI experimental table and normalise it into one row-per-test frame.

Ported from the exploratory build script. The output has the same columns as the
original ``psi_unified_tests.csv``: normalised O2 / pressure / flow plus the
provenance strings ``o2_src``, ``p_src`` and ``flow_src``.
"""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd

from . import paths

ATM_PSIA = 14.696

# Filled by read_csv: file name -> encoding that worked.
ENCODINGS: dict[str, str] = {}
# Filled by load_unified: human-readable notes on every data-quality fix applied.
QA_NOTES: list[str] = []


def read_csv(path: Path) -> pd.DataFrame:
    """Read a PSI table as strings. Most are UTF-8 (some with BOM); FLEX is cp1252."""
    for enc in ("utf-8-sig", "cp1252"):
        try:
            df = pd.read_csv(path, encoding=enc, dtype=str, keep_default_na=False)
        except UnicodeDecodeError:
            continue
        ENCODINGS[path.name] = enc
        return df
    raise ValueError(f"could not decode {path}")


def _table(prefix: str, raw_et: Path) -> pd.DataFrame:
    matches = sorted(raw_et.glob(prefix + "*"))
    if not matches:
        raise FileNotFoundError(f"no experimental table matching {prefix!r} in {raw_et}")
    return read_csv(matches[0])


def num(s) -> float:
    """First number in a free-text cell ("1 atm" -> 1.0), NaN if none."""
    m = re.search(r"-?\d*\.?\d+", str(s).replace(",", ""))
    return float(m.group(0)) if m else np.nan


def nums(s) -> list[float]:
    """Every unsigned number in a cell ("21; 26.5; 40" -> [21, 26.5, 40])."""
    return [float(x) for x in re.findall(r"\d*\.?\d+", str(s))]


# BASS-II "Fan display" counts sit around 40-120; air speeds in "Air display" are mostly below 40 cm/s.
FAN_COUNT_MIN = 40.0


def air_display_flow(text: str) -> float:
    """Initial forced-flow speed (cm/s) from BASS-II's free-text "Air display" cell, NaN when ambiguous.

    1. A number followed by "cm/s" wins ("49   5 cm/s" -> 5).
    2. A cell that starts by ramping ("incr to 28") or with an upper bound ("<1") has no initial value -> NaN.
    3. When the leading number looks like a fan count (>= FAN_COUNT_MIN), use the first number in
       parentheses ("49  44 ... (5   2   0)" -> 5); with no parenthesised value the cell is ambiguous -> NaN.
    4. Otherwise the first number is the initial air speed ("4 incr to 26.5" -> 4).
    """
    t = str(text).strip()
    m = re.search(r"(\d*\.?\d+)\s*cm/s", t)
    if m:
        return float(m.group(1))
    if re.match(r"(incr|decr|down|up)\b", t, re.I) or t.startswith("<"):
        return np.nan  # a ramp with no start value, or only an upper bound ("<1")
    vals = nums(t.split("(")[0])
    if not vals:
        return np.nan
    if vals[0] >= FAN_COUNT_MIN:
        inner = re.search(r"\(([^)]*)", t)
        par = nums(inner.group(1)) if inner else []
        return par[0] if par else np.nan
    return vals[0]


def load_unified(raw_et: Path | None = None) -> pd.DataFrame:
    raw_et = raw_et or paths.RAW_ET
    QA_NOTES.clear()
    rd = lambda name: _table(name, raw_et)  # noqa: E731
    R: list[dict] = []
    add = lambda **k: R.append(k)  # noqa: E731

    # FLEX PSI-69 (cp1252)
    for _, r in rd("PSI-69").iterrows():
        p_atm = num(r["Ambient pressure; mmHg"]) / 760
        if num(r["He initial ambient composition; mole fraction"]) > 0:
            dil = "He"
        elif num(r["CO initial ambient composition; mole fraction"]) > 0:
            dil = "CO2"
        else:
            dil = "N2"
        add(psi_id="PSI-69", acronym="FLEX", test_id=r["FLEX Test #"], date=r["Test Date"], fuel=r["Fuel"].strip(),
            fuel_class="liquid droplet", o2_pct=100 * num(r["O initial ambient composition; mole fraction"]),
            pressure_atm=p_atm, flow_cm_s=0.0, diluent=dil, geometry_mm=num(r["Droplet initial diameter; mm"]),
            ext_diam_mm=num(r["Visible flame extinction diameter; mm"]), burning_rate_mm2_s=num(r["Burning rate; mm"]),
            burn_time_s=num(r["Burn time; s"]), outcome=r["Test end"].strip(),
            o2_src="table", p_src="table", flow_src="quiescent (droplet, no forced flow)")

    # CFI PSI-39
    for _, r in rd("PSI-39").iterrows():
        dil = "He" if num(r["Helium"]) > 0 else "N2"
        add(psi_id="PSI-39", acronym="CFI", test_id=r["Flex Number"], date=r["Test Date"], fuel=r["Fuel "].strip(),
            fuel_class="liquid droplet", o2_pct=100 * num(r["Oxygen"]), pressure_atm=num(r["Pressure"]), flow_cm_s=0.0,
            diluent=dil, outcome="fiber-supported" if r["Fiber"].strip().lower() == "yes" else "free droplet",
            o2_src="table", p_src="table", flow_src="quiescent")

    # ACME Flame Design PSI-10 (normal + inverse)
    for _, r in rd("PSI-10_Experimental_table_Flame_Design_Normal").iterrows():
        add(psi_id="PSI-10", acronym="ACME Flame Design", test_id=r["Test"], date=r["Day"], fuel=r["Fuel"], fuel_class="gas",
            o2_pct=100 * num(r["XO2 (init)"]), pressure_atm=num(r["pmean (atm)"]), flow_cm_s=np.nan, diluent="N2",
            fuel_flow_mg_s=num(r["mtot (mg/s)"]), outcome="normal flame", flame_type="Normal", o2_src="table",
            p_src="table", flow_src="none (porous sphere burner; mass flow only)")
    for _, r in rd("PSI-10_Experimental_table_Flame_Design_Inverse").iterrows():
        add(psi_id="PSI-10", acronym="ACME Flame Design", test_id=r["Test"], date=r["Day"], fuel="C2H4", fuel_class="gas",
            o2_pct=100 * num(r["XO2"]), pressure_atm=num(r["pmean (atm)"]), flow_cm_s=np.nan, diluent="N2",
            outcome="inverse flame (O2 issued into fuel ambient)", flame_type="Inverse",
            o2_src="table (XO2 = burner-issued oxidizer)", p_src="table", flow_src="none")

    # ACME CFI-G PSI-159 (normal + inverse; the inverse table is mostly blank rows)
    for name, o2c, sec in [("PSI-159_Experimental_table_CFI-G_Normal", " XO2 before test", "Self-ext or flow term"),
                           ("PSI-159_Experimental_table_CFI-G_Inverse", "XO2", "Self -ext or flow term")]:
        d = rd(name)
        n0 = len(d)
        d = d[d["Test"].str.strip() != ""]
        QA_NOTES.append(f"{name}: dropped {n0 - len(d)} blank rows of {n0}")
        for _, r in d.iterrows():
            add(psi_id="PSI-159", acronym="ACME CFI-G", test_id=r["Test"], date=r["Day"], fuel=r["Fuel"].strip(),
                fuel_class="gas", o2_pct=100 * num(r[o2c]), pressure_atm=num(r["approx p (bar)"]) / 1.01325,
                flow_cm_s=np.nan, diluent="N2",
                ignited={"yes": 1, "no": 0}.get(r["Hot ignition"].strip().lower(), np.nan),
                burn_time_s=num(r["burn time (sec)"]), outcome=r[sec].strip(), flame_type=r["Flame Type"],
                comments=r.get("Comments", "").strip(),
                o2_src="table", p_src="table (bar)", flow_src="none")

    # ACME BRE PSI-20: one row per (test day, listed O2)
    for _, r in rd("PSI-20").iterrows():
        raw = r["Oxygen Conc (percent)"]
        vals = [v / 100 if v > 100 else v for v in nums(raw)]  # "3400%" -> 34 (Excel percent-format error)
        for v in vals:
            p = {26.5: 10.2 / ATM_PSIA, 34: 8.2 / ATM_PSIA}.get(v, np.nan)
            day = f"{r['Year']}-{r['Month']}-{r['Date']}"
            add(psi_id="PSI-20", acronym="ACME BRE", test_id=day, date=day, fuel=r["Fuel Bottle"],
                fuel_class="gas (condensed-fuel surrogate, porous plate)", o2_pct=v, pressure_atm=p, flow_cm_s=0.0,
                diluent="N2", geometry_mm=num(r["Burner Size (mm)"]), n_tests_day=int(num(r["Flames Ignited"])),
                n_tests=int(num(r["Flames Ignited"])) / len(vals), o2_src="table (list per day)",
                p_src=("INFERRED from objective pairing 26.5%/10.2psia, 34%/8.2psia" if not pd.isna(p) else "not reported"),
                flow_src="quiescent burner")

    # ACME s-Flame PSI-23
    for _, r in rd("PSI-23").iterrows():
        o2s = nums(r["Atmosphere*"].split("O2")[0])
        for v in o2s:
            add(psi_id="PSI-23", acronym="ACME s-Flame", test_id=r["Test Day*"], date=r["Test Day*"],
                fuel=r["Fuel Bottle"], fuel_class="gas", o2_pct=v, pressure_atm=1.0, flow_cm_s=np.nan,
                diluent="He" if "He" in r["Atmosphere*"] else "N2", n_tests=int(num(r["Flames Ignited*"])) / len(o2s),
                o2_src="table (approx)", p_src="table note (~1 atm)", flow_src="none")

    # ACME CLD PSI-21 and E-FIELD PSI-22 (no O2 column: chamber air assumed)
    for pid, ac, name, fcol, ncol in [("PSI-21", "ACME CLD Flame", "PSI-21", "Fuel Bottle", "Flames ignited"),
                                      ("PSI-22", "ACME E-FIELD", "PSI-22", "Fuel Bottle", "Flames Ignited")]:
        d = rd(name)
        d = d[d["Test Day"].str.strip() != ""].drop_duplicates()
        for _, r in d.iterrows():
            add(psi_id=pid, acronym=ac, test_id=r["Test Day"], date=r["Test Day"], fuel=r[fcol], fuel_class="gas",
                o2_pct=21.0, pressure_atm=1.0, flow_cm_s=np.nan, n_tests=num(r[ncol]),
                o2_src="ASSUMED air (no column)", p_src="ASSUMED 1 atm", flow_src="coflow not tabulated")

    # SPICE PSI-107 (34 exact duplicate rows dropped)
    d = rd("PSI-107")
    n0 = len(d)
    d = d.drop_duplicates()
    QA_NOTES.append(f"SPICE: dropped {n0 - len(d)} exact duplicate rows")
    for _, r in d.iterrows():
        add(psi_id="PSI-107", acronym="SPICE", test_id=f"{r['GMT date']} {r['GMT ignition']}", date=r["GMT date"],
            fuel=r["Fuel"].strip(), fuel_class="gas", o2_pct=21.0, pressure_atm=1.0,
            flow_cm_s=num(r["Air Rate (cm/s)"]), geometry_mm=num(r["Nozzle (mm)"]),
            fuel_flow_mg_s=num(r["Fuel Rate (mg/s)"]), o2_src="ASSUMED MSG cabin air", p_src="ASSUMED",
            flow_src="table (coflow)")

    # SLICE PSI-106
    for _, r in rd("PSI-106").iterrows():
        add(psi_id="PSI-106", acronym="SLICE", test_id=r["Test Date"], date=r["Test Date"][:11],
            fuel=r["Fuel Type"][:60], fuel_class="gas", o2_pct=21.0, pressure_atm=1.0,
            o2_src="ASSUMED", p_src="ASSUMED", flow_src="not tabulated")

    # BASS PSI-26 (no O2 or flow columns)
    for _, r in rd("PSI-26").iterrows():
        m = r["Fuel Sample Material"]
        fc = "solid thin" if re.search(r"SIBAL|film|cotton|fabric", m, re.I) else "solid thick"
        add(psi_id="PSI-26", acronym="BASS", test_id=r["As Run Test #"], date=r["Date"], fuel=m, fuel_class=fc,
            o2_pct=np.nan, pressure_atm=1.0, flow_cm_s=np.nan, o2_src="not tabulated (Guide: 17-21%)",
            p_src="ASSUMED MSG 1 atm", flow_src="not tabulated (Guide: <1-12 cm/s)")

    # BASS-II PSI-25
    d = rd("PSI-25")
    d.columns = [c.strip() for c in d.columns]
    for _, r in d.iterrows():
        m = r["Fuel Sample Material"]
        fc = "solid thin" if re.search(r"micron|film|SIBAL|0\.1 mm|nomex|cotton", m, re.I) else "solid thick"
        air = nums(r["Air display"])
        flow0 = air_display_flow(r["Air display"])
        txt = (r["Fan display"] + " " + r["Air display"]).lower()
        no_ign = 1 if re.search(r"no ign", txt) else 0
        ext = 0 if no_ign else (1 if re.search(r"ext|blowoff|blow off|out\b|would not", txt) else 0)
        add(psi_id="PSI-25", acronym="BASS-II", test_id=r["Test #"], date=r["Date"], fuel=m, fuel_class=fc,
            o2_pct=num(r["Calibrated  initial O2 % by vol"]), o2_final_pct=num(r["Calibrated final O2 % by vol"]),
            pressure_atm=1.0, flow_cm_s=flow0, flow_min_cm_s=min(air) if air else np.nan,
            ext_flag_text=ext, no_ignition_text=no_ign, o2_src="table (calibrated initial)", p_src="ASSUMED MSG 1 atm",
            flow_src="'Air display' initial value (free text; units assumed cm/s; see air_display_flow)")

    # Saffire I-III
    for pid, ac, name in [("PSI-98", "Saffire-I", "PSI-98"), ("PSI-99", "Saffire-II", "PSI-99"),
                          ("PSI-100", "Saffire-III", "PSI-100")]:
        d = rd(name)
        d.columns = [c.strip() for c in d.columns]
        d = d[d[d.columns[0]].str.match(r"^(S\d|2-\d)")]
        o2c = [c for c in d.columns if c.startswith("Percent O2")]
        for _, r in d.iterrows():
            thk_col = [c for c in d.columns if "hick" in c][0]
            thk = r[thk_col]
            thk_unit = "cm" if "(cm)" in thk_col else ""
            spread = r.get("?-g Spread Length", "")
            add(psi_id=pid, acronym=ac, test_id=r[d.columns[0]], fuel=r["Material"] or "(see previous row)",
                fuel_class=("solid thin" if re.search("SIBAL|Silicone|Fabric", r["Material"] or "SIBAL", re.I)
                            and "1 cm" not in thk else "solid thick"),
                o2_pct=np.mean(nums(r[o2c[0]])) if o2c else 21.0, pressure_atm=1.0,
                flow_cm_s=num(r[[c for c in d.columns if c.startswith("Air Flow")][0]]), thickness=thk,
                thickness_unit=thk_unit,
                outcome=r.get("Burn Time (s)", ""),
                spread_rate_mm_s=num(spread) if "mm/s" in spread else np.nan,
                o2_src="table" if o2c else "ASSUMED", p_src="ASSUMED Cygnus cabin ~1 atm", flow_src="table")

    # SAME / SAME-R (overheated solids, no flame; detection data)
    for _, r in rd("PSI-102").iterrows():
        add(psi_id="PSI-102", acronym="SAME", test_id=r["Sample #"], fuel=r["Sample Material  "].split(":")[0],
            fuel_class="smoke (overheated solid, no flame)", o2_pct=21.0, pressure_atm=1.0,
            flow_cm_s=num(r["Air Flow (cm/s)"]) if r["Air Flow (cm/s)"] else 5.0,
            o2_src="ASSUMED", p_src="ASSUMED", flow_src="table")
    for _, r in rd("PSI-101").iterrows():
        add(psi_id="PSI-101", acronym="SAME-R", test_id=r["SAME Test #"], date=r["Date"], fuel=r["Sample Type"],
            fuel_class="smoke (overheated solid, no flame)", o2_pct=21.0, pressure_atm=1.0,
            flow_cm_s=num(r["Inlet velocity (cm/s)"]), heater_Rt_R0=num(r["Rt/R0"]),
            o2_src="ASSUMED", p_src="ASSUMED", flow_src="table")

    U = pd.DataFrame(R)

    # Data-quality fixes
    bad = (U.acronym == "FLEX") & (U.pressure_atm <= 0.05)
    QA_NOTES.append(f"FLEX rows with pressure 0 mmHg set NaN: {list(U.test_id[bad])}")
    U.loc[bad, "pressure_atm"] = np.nan
    bad = (U.acronym == "SPICE") & (U.flow_cm_s < 0)
    QA_NOTES.append(f"SPICE rows with negative Air Rate set NaN: {int(bad.sum())}")
    U.loc[bad, "flow_cm_s"] = np.nan

    U["flame_type"] = U["flame_type"].fillna("").astype(str).str.title()
    # Inverse flames: XO2 is the burner-issued oxidizer, not the cabin atmosphere.
    U["ambient_valid"] = U.flame_type != "Inverse"
    U["n_tests"] = U["n_tests"].fillna(1.0)
    U["pressure_psia"] = U["pressure_atm"] * ATM_PSIA
    U["ppO2_psia"] = U["o2_pct"] / 100 * U["pressure_psia"]
    return U
