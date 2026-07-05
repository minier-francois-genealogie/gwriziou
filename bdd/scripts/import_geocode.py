#!/usr/bin/env python3
"""Géocode les lieux en attente (BAN / Nominatim) → latitude, longitude."""

from __future__ import annotations

import argparse
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

BDD_DIR = Path(__file__).resolve().parent.parent
WS_ROOT = BDD_DIR.parent
SCRIPTS_DIR = WS_ROOT / "scripts"
sys.path.insert(0, str(WS_ROOT))
sys.path.insert(0, str(SCRIPTS_DIR))

from geocode_lieu import geocode_lieu  # noqa: E402

DEFAULT_DB = BDD_DIR / "genealogie.sqlite"


def import_geocode(conn: sqlite3.Connection) -> tuple[int, int]:
    rows = conn.execute(
        """
        SELECT id, commune, code_postal, departement, pays
        FROM lieux
        WHERE latitude IS NULL
           OR statut_geocodage IS NULL
           OR statut_geocodage = 'en_attente'
        ORDER BY id
        """
    ).fetchall()
    ok = 0
    failed = 0
    now = datetime.now(UTC).replace(microsecond=0).isoformat()
    for row in rows:
        coords = geocode_lieu(
            commune=row["commune"],
            code_postal=row["code_postal"],
            departement=row["departement"],
            pays=row["pays"],
        )
        if coords:
            lat, lon = coords
            conn.execute(
                """
                UPDATE lieux
                SET latitude = ?, longitude = ?, geocode_le = ?, statut_geocodage = 'ok'
                WHERE id = ?
                """,
                (lat, lon, now, row["id"]),
            )
            ok += 1
        else:
            conn.execute(
                """
                UPDATE lieux
                SET geocode_le = ?, statut_geocodage = 'echec'
                WHERE id = ?
                """,
                (now, row["id"]),
            )
            failed += 1
    conn.commit()
    return ok, failed


def main() -> None:
    parser = argparse.ArgumentParser(description="Géocode les lieux SQLite")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    if not args.db.is_file():
        raise SystemExit(f"Base introuvable : {args.db}")

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    try:
        ok, failed = import_geocode(conn)
        print(f"Géocodage : {ok} ok, {failed} échec(s)")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
