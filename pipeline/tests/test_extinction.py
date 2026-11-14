import math

import numpy as np
import pytest

from halo_pipeline.extinction import fit_extinction


@pytest.fixture(scope="module")
def ext(unified):
    return fit_extinction(unified, n_boot=200, seed=7)


def p_ext(coefs, o2, d0=3.0, p_atm=1.0):
    b0, b_o2, b_d0, b_p = coefs
    z = b0 + b_o2 * o2 + b_d0 * math.log(d0) + b_p * math.log(p_atm)
    return 1 / (1 + math.exp(-z))


def test_boundary(ext):
    assert ext["o2At50"]["median"] == pytest.approx(22.8, abs=0.6)
    assert ext["o2At50"]["lo"] < ext["o2At50"]["median"] < ext["o2At50"]["hi"]
    C = np.array(ext["coefs"])
    assert C.shape == (200, 4)
    med = np.median(C, axis=0)
    probs = [p_ext(med, o2) for o2 in np.linspace(*ext["o2RangePct"], 50)]
    assert all(b <= a + 1e-12 for a, b in zip(probs, probs[1:]))


def test_contract(ext):
    assert ext["diluent"] == "N2" and ext["d0Mm"] == 3
    assert ext["features"] == ["o2Pct", "lnD0", "lnP"]
    assert ext["pRangeAtm"] == [0.7, 1.0]
    assert ext["n"] == 94 and ext["nExt"] == 54
    assert 0.5 < ext["cvAuc"] <= 1.0
    assert ext["source"]["psiId"] == "PSI-69" and ext["source"]["doi"].startswith("10.60555/")


def test_deterministic(unified, ext):
    again = fit_extinction(unified, n_boot=200, seed=7)
    assert again["coefs"] == ext["coefs"]
