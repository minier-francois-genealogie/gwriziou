#!/usr/bin/env python3
"""Importe les dirigeants français (JSON) dans SQLite."""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

BDD_DIR = Path(__file__).resolve().parent.parent
WS_ROOT = BDD_DIR.parent
sys.path.insert(0, str(WS_ROOT))

from paths import (  # noqa: E402
    DIRIGEANTS_FRANCE_FILE,
    DIRIGEANTS_FRANCE_RAW_URL,
    DIRIGEANTS_FRANCE_REL_PATH,
)

DEFAULT_DB = BDD_DIR / "genealogie.sqlite"
USER_AGENT = "genealogie-import/1.0"


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS dirigeants_france (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            slug            TEXT NOT NULL UNIQUE,
            nom             TEXT NOT NULL,
            titre           TEXT NOT NULL,
            debut           TEXT NOT NULL,
            fin             TEXT NOT NULL,
            photo_url       TEXT,
            source_fichier  TEXT NOT NULL
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_dirigeants_debut ON dirigeants_france (debut)"
    )
    cols = {row[1] for row in conn.execute("PRAGMA table_info(meta)")}
    if "empreinte_dirigeants" not in cols:
        conn.execute("ALTER TABLE meta ADD COLUMN empreinte_dirigeants TEXT")
    if "nb_dirigeants_france" not in cols:
        conn.execute("ALTER TABLE meta ADD COLUMN nb_dirigeants_france INTEGER")


def file_empreinte(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def load_json_remote() -> bytes:
    request = urllib.request.Request(
        DIRIGEANTS_FRANCE_RAW_URL,
        headers={"User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def load_source() -> tuple[bytes, str]:
    if DIRIGEANTS_FRANCE_FILE.is_file():
        return DIRIGEANTS_FRANCE_FILE.read_bytes(), DIRIGEANTS_FRANCE_REL_PATH
    try:
        return load_json_remote(), DIRIGEANTS_FRANCE_REL_PATH
    except (urllib.error.HTTPError, OSError) as exc:
        raise SystemExit(
            f"Source dirigeants introuvable : {DIRIGEANTS_FRANCE_FILE} "
            f"ou {DIRIGEANTS_FRANCE_RAW_URL}"
        ) from exc


def import_dirigeants_france(conn: sqlite3.Connection) -> dict[str, int]:
    ensure_schema(conn)
    content, source_label = load_source()
    empreinte = file_empreinte(content)
    data = json.loads(content.decode("utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"{DIRIGEANTS_FRANCE_REL_PATH} doit être un tableau JSON")

    conn.execute("DELETE FROM dirigeants_france")
    count = 0
    for row in data:
        if not isinstance(row, dict):
            continue
        slug = (row.get("slug") or "").strip()
        nom = (row.get("nom") or "").strip()
        titre = (row.get("titre") or "").strip()
        debut = (row.get("debut") or "").strip() or "????"
        fin = (row.get("fin") or row.get("debut") or "").strip() or "????"
        if not slug or not nom or not titre:
            continue
        photo_url = (row.get("photo_url") or "").strip() or None
        conn.execute(
            """
            INSERT INTO dirigeants_france (
                slug, nom, titre, debut, fin, photo_url, source_fichier
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (slug, nom, titre, debut, fin, photo_url, source_label),
        )
        count += 1

    imported_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    conn.execute(
        """
        UPDATE meta
        SET empreinte_dirigeants = ?, nb_dirigeants_france = ?, importe_le = ?
        WHERE id = 1
        """,
        (empreinte, count, imported_at),
    )
    return {"dirigeants_france": count}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import dirigeants France → SQLite")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()

    if not args.db.is_file():
        raise SystemExit(f"Base introuvable : {args.db}")

    conn = sqlite3.connect(args.db)
    try:
        counts = import_dirigeants_france(conn)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    print(f"Base : {args.db.resolve()}")
    print(f"Importé : {counts['dirigeants_france']} dirigeants")


if __name__ == "__main__":
    main()
