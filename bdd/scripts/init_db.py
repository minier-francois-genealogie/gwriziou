"""Crée une base SQLite vide à partir de bdd/schema.sql."""
from __future__ import annotations

import sqlite3
from pathlib import Path

BDD_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BDD_DIR / "genealogie.sqlite"
SCHEMA_PATH = BDD_DIR / "schema.sql"


def main() -> None:
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(schema)
    conn.execute("PRAGMA foreign_keys = ON")

    tables = [
        row[0]
        for row in conn.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            ORDER BY 1
            """
        )
    ]
    counts = {
        table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        for table in tables
    }
    conn.close()

    print(f"Base créée : {DB_PATH}")
    print(f"Tables ({len(tables)}) : {', '.join(tables)}")
    print(f"Lignes : {counts}")


if __name__ == "__main__":
    main()
