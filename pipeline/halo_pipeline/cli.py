"""Command line: `python -m halo_pipeline.cli all` rebuilds web/src/data/*.json;
`python -m halo_pipeline.cli si` writes web/src/data/summaries.json (see docs/SI.md)."""
from __future__ import annotations

import argparse
import sys

from . import paths


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="halo_pipeline", description=__doc__)
    ap.add_argument("command", choices=["all", "si"],
                    help="'all' writes the JSON contract and manifest; 'si' writes the investigation summaries")
    ap.add_argument("--out", default=str(paths.OUT_DIR), help="output directory (default: web/src/data)")
    si = ap.add_argument_group("si options")
    si.add_argument("--dry-run", action="store_true",
                    help="print the prompt for one investigation and validate hand-made samples; no API calls")
    si.add_argument("--check", action="store_true", help="re-validate summaries.json as it stands; no API calls")
    si.add_argument("--force", action="store_true", help="regenerate entries that are already valid or human-edited")
    si.add_argument("--only", action="append", metavar="PSI-ID", help="limit to these investigations (repeatable)")
    si.add_argument("--max-calls", type=int, default=None, help="API call cap for this run (default 60)")
    args = ap.parse_args(argv)

    if args.command == "si":
        from .si_build import MAX_CALLS, si_main
        return si_main(args.out, dry=args.dry_run, force=args.force, only=args.only, do_check=args.check,
                       max_calls=min(args.max_calls or MAX_CALLS, MAX_CALLS))

    from .export import export_all
    from .ingest import QA_NOTES

    sizes = export_all(args.out)
    for note in QA_NOTES:
        print(f"qa: {note}")
    for name, n in sizes.items():
        print(f"wrote {name:22s} {n / 1024:8.1f} KiB")
    print(f"total {sum(sizes.values()) / 1024:.1f} KiB -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
