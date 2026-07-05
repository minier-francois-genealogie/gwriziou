#!/usr/bin/env python3
"""Import complet : GEDCOM (local) + actes (GitHub distant) → SQLite."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent


def run_script(name: str, extra_args: list[str]) -> None:
    script = SCRIPTS_DIR / name
    cmd = [sys.executable, str(script), *extra_args]
    print(f"\n>>> {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import GEDCOM puis indexation actes GitHub → SQLite"
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=Path(os.environ.get("SQLITE_PATH", SCRIPTS_DIR.parent / "genealogie.sqlite")),
        help="Base SQLite cible",
    )
    parser.add_argument(
        "--gedcom",
        type=Path,
        default=None,
        help="GEDCOM local (transmis à import_gedcom.py)",
    )
    parser.add_argument(
        "--souche",
        default=os.environ.get("SOUCHE_GEDCOM_ID"),
        help="Id GEDCOM souche",
    )
    parser.add_argument(
        "--tree-url",
        default=os.environ.get("GITHUB_ACTES_TREE_URL"),
        help="URL API GitHub pour lister actes/",
    )
    args = parser.parse_args()

    gedcom_args = ["--db", str(args.db)]
    if args.gedcom:
        gedcom_args.extend(["--gedcom", str(args.gedcom)])
    if args.souche:
        gedcom_args.extend(["--souche", args.souche])

    actes_args = ["--db", str(args.db)]
    if args.tree_url:
        actes_args.extend(["--tree-url", args.tree_url])

    run_script("import_gedcom.py", gedcom_args)
    run_script("import_actes.py", actes_args)
    run_script("import_warnings.py", actes_args)
    run_script("import_geocode.py", actes_args)
    run_script("import_dates_vie.py", actes_args)
    print("\nImport complet terminé.")


if __name__ == "__main__":
    main()
