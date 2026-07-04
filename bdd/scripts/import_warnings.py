#!/usr/bin/env python3
"""Recalcule la table warnings (GEDCOM vs acte) après import GEDCOM + actes."""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

BDD_DIR = Path(__file__).resolve().parent.parent
WS_ROOT = BDD_DIR.parent
SCRIPTS_DIR = WS_ROOT / "scripts"
sys.path.insert(0, str(WS_ROOT))
sys.path.insert(0, str(SCRIPTS_DIR))

from warning_rules import WarningRecord, compute_event_warnings  # noqa: E402

DEFAULT_DB = BDD_DIR / "genealogie.sqlite"

_ACTE_DATE_RE = __import__("re").compile(r"__[NMD]__(\d{4}(?:-\d{2}(?:-\d{2})?)?)__")


def _date_brute_from_nom_fichier(nom_fichier: str) -> str | None:
    match = _ACTE_DATE_RE.search(nom_fichier)
    return match.group(1) if match else None


def _fetch_evenement(
    conn: sqlite3.Connection, id_personne: str, type_evenement: str
) -> tuple[str | None, str | None, str | None]:
    row = conn.execute(
        """
        SELECT e.date_iso, e.date_brute, l.commune
        FROM evenements e
        LEFT JOIN lieux l ON l.id = e.id_lieu
        WHERE e.id_personne = ? AND e.type = ?
        """,
        (id_personne, type_evenement),
    ).fetchone()
    if not row:
        return None, None, None
    return row["date_iso"], row["date_brute"], row["commune"]


def _fetch_mariage_evenement(
    conn: sqlite3.Connection, id_famille: str
) -> tuple[str | None, str | None, str | None]:
    row = conn.execute(
        """
        SELECT e.date_iso, e.date_brute, l.commune
        FROM evenements e
        LEFT JOIN lieux l ON l.id = e.id_lieu
        WHERE e.id_famille = ? AND e.type = 'MARIAGE'
        """,
        (id_famille,),
    ).fetchone()
    if not row:
        return None, None, None
    return row["date_iso"], row["date_brute"], row["commune"]


def _fetch_acte_personne(
    conn: sqlite3.Connection, id_gedcom: str, type_acte: str
) -> tuple[bool, str | None, str | None, str | None]:
    row = conn.execute(
        """
        SELECT date_acte_iso, commune, nom_fichier
        FROM actes
        WHERE id_gedcom = ? AND type = ?
        ORDER BY id
        LIMIT 1
        """,
        (id_gedcom, type_acte),
    ).fetchone()
    if not row:
        return False, None, None, None
    date_brute = _date_brute_from_nom_fichier(row["nom_fichier"]) or row["date_acte_iso"]
    return True, row["date_acte_iso"], date_brute, row["commune"]


def _fetch_mariage_acte(
    conn: sqlite3.Connection, id_gedcom: str, id_famille: str
) -> tuple[bool, str | None, str | None, str | None]:
    row = conn.execute(
        """
        SELECT a.date_acte_iso, a.commune, a.nom_fichier
        FROM actes a
        JOIN famille_conjoints fc ON fc.id_personne = a.id_gedcom
        WHERE fc.id_famille = ? AND a.id_gedcom = ? AND a.type = 'M'
        ORDER BY a.id
        LIMIT 1
        """,
        (id_famille, id_gedcom),
    ).fetchone()
    if not row:
        row = conn.execute(
            """
            SELECT a.date_acte_iso, a.commune, a.nom_fichier
            FROM actes a
            JOIN famille_conjoints fc ON fc.id_personne = a.id_gedcom
            JOIN famille_conjoints moi ON moi.id_famille = fc.id_famille
            WHERE moi.id_personne = ? AND fc.id_famille = ? AND a.type = 'M'
            ORDER BY a.id
            LIMIT 1
            """,
            (id_gedcom, id_famille),
        ).fetchone()
    if not row:
        return False, None, None, None
    date_brute = _date_brute_from_nom_fichier(row["nom_fichier"]) or row["date_acte_iso"]
    return True, row["date_acte_iso"], date_brute, row["commune"]


def _collect_person_warnings(
    conn: sqlite3.Connection, id_gedcom: str
) -> list[WarningRecord]:
    records: list[WarningRecord] = []

    for type_evt, type_acte in (("NAISSANCE", "N"), ("DECES", "D")):
        d_iso, d_brute, lieu = _fetch_evenement(conn, id_gedcom, type_evt)
        has_acte, a_iso, a_brute, a_lieu = _fetch_acte_personne(conn, id_gedcom, type_acte)
        records.extend(
            compute_event_warnings(
                id_gedcom=id_gedcom,
                type_evenement=type_evt,
                gedcom_date_iso=d_iso,
                gedcom_date_brute=d_brute,
                gedcom_lieu=lieu,
                acte_date_iso=a_iso,
                acte_date_brute=a_brute,
                acte_lieu=a_lieu,
                has_acte=has_acte,
            )
        )

    for row in conn.execute(
        "SELECT id_famille FROM personne_unions WHERE id_personne = ? ORDER BY id_famille",
        (id_gedcom,),
    ):
        id_famille = row["id_famille"]
        d_iso, d_brute, lieu = _fetch_mariage_evenement(conn, id_famille)
        has_acte, a_iso, a_brute, a_lieu = _fetch_mariage_acte(
            conn, id_gedcom, id_famille
        )
        records.extend(
            compute_event_warnings(
                id_gedcom=id_gedcom,
                type_evenement="MARIAGE",
                id_famille=id_famille,
                gedcom_date_iso=d_iso,
                gedcom_date_brute=d_brute,
                gedcom_lieu=lieu,
                acte_date_iso=a_iso,
                acte_date_brute=a_brute,
                acte_lieu=a_lieu,
                has_acte=has_acte,
            )
        )

    return records


def _ensure_warnings_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS warnings (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            id_gedcom       TEXT NOT NULL REFERENCES personnes (id_gedcom),
            type_evenement  TEXT NOT NULL CHECK (type_evenement IN ('NAISSANCE', 'DECES', 'MARIAGE')),
            id_famille      TEXT NOT NULL DEFAULT '',
            code            TEXT NOT NULL,
            message         TEXT NOT NULL,
            detail          TEXT,
            UNIQUE (id_gedcom, type_evenement, id_famille, code)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_warnings_personne ON warnings (id_gedcom)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_warnings_type ON warnings (type_evenement)"
    )


def import_warnings(conn: sqlite3.Connection) -> int:
    _ensure_warnings_table(conn)
    conn.execute("DELETE FROM warnings")
    total = 0
    personnes = [
        r["id_gedcom"]
        for r in conn.execute("SELECT id_gedcom FROM personnes ORDER BY id_gedcom")
    ]
    for pid in personnes:
        for rec in _collect_person_warnings(conn, pid):
            conn.execute(
                """
                INSERT OR IGNORE INTO warnings (
                    id_gedcom, type_evenement, id_famille, code, message, detail
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    rec.id_gedcom,
                    rec.type_evenement,
                    rec.id_famille,
                    rec.code,
                    rec.message,
                    rec.detail,
                ),
            )
            total += 1
    conn.commit()
    return total


def main() -> None:
    parser = argparse.ArgumentParser(description="Recalcule warnings GEDCOM vs acte")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    if not args.db.is_file():
        raise SystemExit(f"Base introuvable : {args.db}")

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        n = import_warnings(conn)
    finally:
        conn.close()
    print(f"Warnings indexés : {n}")


if __name__ == "__main__":
    main()
