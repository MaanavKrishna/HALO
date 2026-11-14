"""FLEX droplet self-extinction boundary: bootstrapped logistic regression.

P(flame extinguishes before burnout) ~ o2Pct + ln(d0 mm) + ln(p atm), N2-diluent FLEX
rows only. The 200 bootstrap coefficient vectors are exported so the web app can
evaluate the curve and its band at any O2 without re-fitting.
"""
from __future__ import annotations

import json
import warnings

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from . import paths

D0_MM = 3
P_RANGE_ATM = [0.7, 1.0]
SOURCE_PSI = "PSI-69"


def _model() -> LogisticRegression:
    # C=1e6: effectively unregularised; the features are on very different scales.
    return LogisticRegression(C=1e6, max_iter=10000)


def flex_n2(df: pd.DataFrame) -> pd.DataFrame:
    F = df[(df.acronym == "FLEX") & (df.diluent == "N2")]
    return F[F.pressure_atm.notna() & F.geometry_mm.notna() & F.o2_pct.notna()].copy()


def fit_extinction(df: pd.DataFrame, n_boot: int = 200, seed: int = 7) -> dict:
    F = flex_n2(df)
    X = np.c_[F.o2_pct.to_numpy(float), np.log(F.geometry_mm.to_numpy(float)), np.log(F.pressure_atm.to_numpy(float))]
    y = (F.outcome.str.lower() == "extinction").astype(int).to_numpy()

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        auc = cross_val_score(_model(), X, y, cv=StratifiedKFold(5, shuffle=True, random_state=0), scoring="roc_auc")

        rng = np.random.default_rng(seed)
        coefs: list[list[float]] = []
        while len(coefs) < n_boot:
            i = rng.integers(0, len(y), len(y))
            if y[i].min() == y[i].max():
                continue  # a one-class resample cannot be fit
            lr = _model().fit(X[i], y[i])
            coefs.append([float(lr.intercept_[0]), *map(float, lr.coef_[0])])

    C = np.array(coefs)
    # O2 where P = 0.5 at d0 = 3 mm, p = 1 atm (ln p = 0).
    o2_50 = -(C[:, 0] + C[:, 2] * np.log(D0_MM)) / C[:, 1]
    det = json.loads((paths.RAW_DET / f"{SOURCE_PSI}.json").read_text())

    return {
        "diluent": "N2",
        "d0Mm": D0_MM,
        "features": ["o2Pct", "lnD0", "lnP"],
        "coefs": [[round(v, 8) for v in row] for row in coefs],
        "o2RangePct": [round(float(F.o2_pct.min()), 3), round(float(F.o2_pct.max()), 3)],
        "pRangeAtm": P_RANGE_ATM,
        "n": int(len(y)),
        "nExt": int(y.sum()),
        "cvAuc": round(float(auc.mean()), 3),
        "o2At50": {
            "median": round(float(np.median(o2_50)), 2),
            "lo": round(float(np.percentile(o2_50, 2.5)), 2),
            "hi": round(float(np.percentile(o2_50, 97.5)), 2),
        },
        "source": {"psiId": SOURCE_PSI, "doi": det["doi"]},
    }
