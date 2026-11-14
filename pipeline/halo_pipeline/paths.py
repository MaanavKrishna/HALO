"""Repo-relative paths. Every module reads and writes through these constants."""
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = PIPELINE_DIR.parent

DATA_DIR = REPO_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
RAW_ET = RAW_DIR / "et"          # PSI experimental tables (CSV)
RAW_DET = RAW_DIR / "det"        # PSI investigation detail records (JSON)
SAME_XLSX = RAW_DIR / "same" / "PSI-101_SAME_SAME-R_Results.xlsx"
LITERATURE_CSV = DATA_DIR / "literature" / "saffire_literature.csv"

OUT_DIR = REPO_ROOT / "web" / "src" / "data"
