"""Command line: `python -m halo_pipeline.cli all` rebuilds web/src/data/*.json."""
from __future__ import annotations

import argparse
import sys

from . import paths
from .export import export_all
from .ingest import QA_NOTES


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="halo_pipeline", description=__doc__)
    ap.add_argument("command", choices=["all"], help="'all' writes the JSON contract and manifest")
    ap.add_argument("--out", default=str(paths.OUT_DIR), help="output directory (default: web/src/data)")
    args = ap.parse_args(argv)

    sizes = export_all(args.out)
    for note in QA_NOTES:
        print(f"qa: {note}")
    for name, n in sizes.items():
        print(f"wrote {name:22s} {n / 1024:8.1f} KiB")
    print(f"total {sum(sizes.values()) / 1024:.1f} KiB -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
