#!/usr/bin/env python3
"""Recalcule date_naissance_min / date_deces_max et warnings associés."""

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

from gedcom_dates import year_from_iso  # noqa: E402
from vie_dates_constants import compute_vie_dates  # noqa: E402

DEFAULT_DB = BDD_DIR / "genealogie.sqlite"

_ACTE_DATE_RE = __import__("re").compile(r"__[NMD]__(\d{4}(?:-\d{2}(?:-\d{2})?)?)__")

BORNE_WARNING_CODES = frozenset({"MANQUE_BORNE_NAISSANCE", "MANQUE_BORNE_DECES"})


def _date_brute_from_nom_fichier(nom_fichier: str) -> str | None:
    match = _ACTE_DATE_RE.search(nom_fichier)
    return match.group(1) if match else None


def _ensure_columns(conn: sqlite3.Connection) -> None:
    cols = {r[1] for r in conn.execute("PRAGMA table_info(personnes)")}
    renames = [
        ("approximation_date_naissance_min", "date_naissance_min_approximation"),
        ("approximation_date_deces_max", "date_deces_max_approximation"),
    ]
    for old, new in renames:
        if old in cols and new not in cols:
            conn.execute(f"ALTER TABLE personnes RENAME COLUMN {old} TO {new}")
            cols.remove(old)
            cols.add(new)
    alters = [
        ("date_naissance_min", "TEXT"),
        ("date_naissance_min_approximation", "TEXT"),
        ("date_naissance_min_regle", "TEXT"),
        ("date_deces_max", "TEXT"),
        ("date_deces_max_approximation", "TEXT"),
        ("date_deces_max_regle", "TEXT"),
    ]
    for name, typ in alters:
        if name not in cols:
            conn.execute(f"ALTER TABLE personnes ADD COLUMN {name} {typ}")


def _fetch_evt(
    conn: sqlite3.Connection, id_personne: str, type_evt: str
) -> tuple[str | None, str | None]:
    row = conn.execute(
        """
        SELECT date_iso, date_brute FROM evenements
        WHERE id_personne = ? AND type = ?
        """,
        (id_personne, type_evt),
    ).fetchone()
    if not row:
        return None, None
    return row["date_iso"], row["date_brute"]


def _fetch_acte_iso(conn: sqlite3.Connection, id_gedcom: str, type_acte: str) -> str | None:
    row = conn.execute(
        """
        SELECT date_acte_iso, nom_fichier FROM actes
        WHERE id_gedcom = ? AND type = ?
        ORDER BY id LIMIT 1
        """,
        (id_gedcom, type_acte),
    ).fetchone()
    if not row:
        return None
    return row["date_acte_iso"] or _date_brute_from_nom_fichier(row["nom_fichier"])


def _earliest_marriage_year(conn: sqlite3.Connection, id_gedcom: str) -> int | None:
    row = conn.execute(
        """
        SELECT e.date_iso
        FROM personne_unions pu
        JOIN evenements e ON e.id_famille = pu.id_famille AND e.type = 'MARIAGE'
        WHERE pu.id_personne = ?
        ORDER BY e.date_tri, pu.id_famille
        LIMIT 1
        """,
        (id_gedcom,),
    ).fetchone()
    return year_from_iso(row["date_iso"]) if row else None


def _child_birth_iso(
    conn: sqlite3.Connection, id_gedcom: str, *, first: bool
) -> str | None:
    order = "ASC" if first else "DESC"
    row = conn.execute(
        f"""
        SELECT e.date_iso
        FROM personne_unions pu
        JOIN famille_enfants fe ON fe.id_famille = pu.id_famille
        JOIN evenements e ON e.id_personne = fe.id_enfant AND e.type = 'NAISSANCE'
        WHERE pu.id_personne = ? AND e.date_iso IS NOT NULL
        ORDER BY e.date_tri {order}, fe.id_enfant {order}
        LIMIT 1
        """,
        (id_gedcom,),
    ).fetchone()
    return row["date_iso"] if row else None


def _clear_borne_warnings(conn: sqlite3.Connection) -> None:
    placeholders = ",".join("?" for _ in BORNE_WARNING_CODES)
    conn.execute(
        f"DELETE FROM warnings WHERE code IN ({placeholders})",
        tuple(BORNE_WARNING_CODES),
    )


def import_dates_vie(conn: sqlite3.Connection) -> int:
    _ensure_columns(conn)
    _clear_borne_warnings(conn)

    personnes = conn.execute(
        "SELECT id_gedcom, sexe FROM personnes ORDER BY id_gedcom"
    ).fetchall()
    updated = 0

    for row in personnes:
        pid = row["id_gedcom"]
        birth_iso, birth_brute = _fetch_evt(conn, pid, "NAISSANCE")
        death_iso, death_brute = _fetch_evt(conn, pid, "DECES")
        calc = compute_vie_dates(
            sexe=row["sexe"],
            birth_iso=birth_iso,
            birth_brute=birth_brute,
            death_iso=death_iso,
            death_brute=death_brute,
            acte_birth_iso=_fetch_acte_iso(conn, pid, "N"),
            acte_death_iso=_fetch_acte_iso(conn, pid, "D"),
            earliest_marriage_year=_earliest_marriage_year(conn, pid),
            last_child_birth_iso=_child_birth_iso(conn, pid, first=False),
            first_child_birth_iso=_child_birth_iso(conn, pid, first=True),
        )
        conn.execute(
            """
            UPDATE personnes SET
                date_naissance_min = ?,
                date_naissance_min_approximation = ?,
                date_naissance_min_regle = ?,
                date_deces_max = ?,
                date_deces_max_approximation = ?,
                date_deces_max_regle = ?
            WHERE id_gedcom = ?
            """,
            (
                calc.date_naissance_min,
                calc.date_naissance_min_approximation,
                calc.date_naissance_min_regle,
                calc.date_deces_max,
                calc.date_deces_max_approximation,
                calc.date_deces_max_regle,
                pid,
            ),
        )
        updated += 1

        if calc.date_naissance_min is None:
            conn.execute(
                """
                INSERT OR IGNORE INTO warnings (
                    id_gedcom, type_evenement, id_famille, code, message, detail
                ) VALUES (?, 'NAISSANCE', '', 'MANQUE_BORNE_NAISSANCE',
                    'Borne naissance impossible à estimer', NULL)
                """,
                (pid,),
            )
        if calc.date_deces_max is None:
            conn.execute(
                """
                INSERT OR IGNORE INTO warnings (
                    id_gedcom, type_evenement, id_famille, code, message, detail
                ) VALUES (?, 'DECES', '', 'MANQUE_BORNE_DECES',
                    'Borne décès impossible à estimer', NULL)
                """,
                (pid,),
            )

    conn.commit()
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Recalcule bornes de vie")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    if not args.db.is_file():
        raise SystemExit(f"Base introuvable : {args.db}")

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    try:
        n = import_dates_vie(conn)
        print(f"Bornes de vie recalculées pour {n} personne(s)")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
