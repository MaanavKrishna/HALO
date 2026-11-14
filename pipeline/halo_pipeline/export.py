"""Write the static JSON contract consumed by the web app (web/src/data/)."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from . import paths
from .catalog import build_investigations, dataset_dois, load_det
from .coverage import eligible_tests
from .detector import build_detector
from .extinction import fit_extinction
from .ingest import load_unified
from .literature import build_literature

CONTRACT_FILES = ("tests.json", "investigations.json", "detector.json", "extinction.json", "literature.json")
# summaries.json is owned by the SI build step; this module must never write it.
FORBIDDEN = {"summaries.json"}


def _dump(obj) -> bytes:
    return (json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")


def build_all() -> dict[str, object]:
    U = load_unified()
    det = load_det()
    return {
        "tests.json": eligible_tests(U),
        "investigations.json": build_investigations(U, det),
        "detector.json": build_detector(),
        "extinction.json": fit_extinction(U, n_boot=200, seed=7),
        "literature.json": build_literature(),
        "_meta": {"totalRows": int(len(U)), "psiDatasetDois": dataset_dois(det)},
    }


def export_all(out_dir: Path | None = None) -> dict[str, int]:
    out_dir = Path(out_dir or paths.OUT_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)
    built = build_all()
    meta = built.pop("_meta")
    sizes, shas = {}, {}
    for name in CONTRACT_FILES:
        assert name not in FORBIDDEN
        data = _dump(built[name])
        (out_dir / name).write_bytes(data)
        sizes[name] = len(data)
        shas[name] = hashlib.sha256(data).hexdigest()
    manifest = {
        "builtAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "totalRows": meta["totalRows"],
        "eligibleRows": len(built["tests.json"]),
        "files": shas,
        "psiDatasetDois": meta["psiDatasetDois"],
    }
    data = _dump(manifest)
    (out_dir / "manifest.json").write_bytes(data)
    sizes["manifest.json"] = len(data)
    return sizes
