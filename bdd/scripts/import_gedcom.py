#!/usr/bin/env python3
"""Purge et import GEDCOM → SQLite (bdd/genealogie.sqlite)."""

from __future__ import annotations

import argparse
import hashlib
import os
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

BDD_DIR = Path(__file__).resolve().parent.parent
WS_ROOT = BDD_DIR.parent
SCRIPTS_DIR = WS_ROOT / "scripts"
sys.path.insert(0, str(WS_ROOT))
sys.path.insert(0, str(SCRIPTS_DIR))

from paths import GEDCOM_PATH as DEFAULT_GEDCOM  # noqa: E402

DEFAULT_DB = BDD_DIR / "genealogie.sqlite"
SCHEMA_PATH = BDD_DIR / "schema.sql"
SCHEMA_VERSION = 6

from act_path_normalize import ascii_fold  # noqa: E402
from analyze_ascendance import find_root  # noqa: E402
from gedcom_dates import parse_gedcom_dates  # noqa: E402
from generate_ascendance_table import load_gedcom, ville_only  # noqa: E402


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def date_tri(date_iso: str | None) -> str | None:
    if not date_iso:
        return None
    if len(date_iso) == 4:
        return f"{date_iso}-00-00"
    if len(date_iso) == 7:
        return f"{date_iso}-00"
    return date_iso


def parse_plac(raw: str) -> tuple[str, str | None, str | None, str | None, str | None]:
    parts = [p.strip() for p in raw.split(",")]
    commune = ville_only(parts[0]) if parts else ""
    code_postal = parts[1] if len(parts) > 1 and parts[1].isdigit() else None
    departement = parts[2] if len(parts) > 2 else None
    region = parts[3] if len(parts) > 3 else None
    pays = parts[4] if len(parts) > 4 else None
    return commune, code_postal, departement, region, pays


def texte_recherche(nom: str, prenoms: str, profession: str | None = None) -> str:
    parts = [ascii_fold(nom), ascii_fold(prenoms)]
    if profession:
        parts.append(ascii_fold(profession))
    return " ".join(p.lower().strip() for p in parts if p.strip())


def normalize_profession(raw: str | None) -> str | None:
    if not raw:
        return None
    val = raw.strip().strip('"')
    return val or None


def normalize_sexe(sex: str) -> str:
    s = (sex or "").strip().upper()
    if s in {"M", "F"}:
        return s
    return "U"


def resolve_root_id(individuals: dict[str, dict], configured: str | None) -> str:
    if configured:
        root = configured.strip()
        if root not in individuals:
            raise SystemExit(f"Souche introuvable dans le GEDCOM : {root}")
        return root
    return find_root(individuals)


def purge_database(db_path: Path) -> sqlite3.Connection:
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(schema)
    return conn


class LieuCache:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn
        self._ids: dict[str, int] = {}

    def get_or_create(self, libelle_brut: str | None) -> int | None:
        if not libelle_brut or not libelle_brut.strip():
            return None
        key = libelle_brut.strip()
        if key in self._ids:
            return self._ids[key]
        commune, code_postal, departement, region, pays = parse_plac(key)
        cur = self.conn.execute(
            """
            INSERT INTO lieux (
                libelle_brut, commune, code_postal, departement, region, pays, statut_geocodage
            ) VALUES (?, ?, ?, ?, ?, ?, 'en_attente')
            """,
            (key, commune or None, code_postal, departement, region, pays),
        )
        row_id = int(cur.lastrowid)
        self._ids[key] = row_id
        return row_id


def insert_evenement(
    conn: sqlite3.Connection,
    lieux: LieuCache,
    *,
    type_: str,
    id_personne: str | None,
    id_famille: str | None,
    date_brute: str | None,
    plac: str | None,
) -> None:
    if not date_brute and not plac:
        return
    date_iso = parse_gedcom_dates(date_brute) if date_brute else None
    conn.execute(
        """
        INSERT INTO evenements (
            type, id_personne, id_famille, id_lieu, date_brute, date_iso, date_tri
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            type_,
            id_personne,
            id_famille,
            lieux.get_or_create(plac),
            date_brute,
            date_iso,
            date_tri(date_iso),
        ),
    )


def import_gedcom(conn: sqlite3.Connection, gedcom_path: Path, root_id: str) -> dict[str, int]:
    individuals, families = load_gedcom(gedcom_path)
    family_ids = set(families)
    person_ids = set(individuals)

    conn.executemany(
        "INSERT INTO familles (id_gedcom) VALUES (?)",
        [(fid,) for fid in families],
    )

    for person in individuals.values():
        famc = person.get("famc")
        if famc and famc not in family_ids:
            famc = None
        nom = (person.get("surn") or "?").strip()
        prenoms = (person.get("given") or "").strip()
        profession = normalize_profession(person.get("occu"))
        conn.execute(
            """
            INSERT INTO personnes (
                id_gedcom, nom, prenoms, sexe, profession, id_famille_enfant,
                nom_tri, texte_recherche
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                person["id"],
                nom,
                prenoms or None,
                normalize_sexe(person.get("sex", "")),
                profession,
                famc,
                f"{nom}/{prenoms}" if prenoms else nom,
                texte_recherche(nom, prenoms, profession),
            ),
        )

    for fam in families.values():
        fid = fam["id"]
        if fam.get("husb") and fam["husb"] in person_ids:
            conn.execute(
                """
                INSERT OR IGNORE INTO famille_conjoints (id_famille, id_personne, role)
                VALUES (?, ?, 'epoux')
                """,
                (fid, fam["husb"]),
            )
        if fam.get("wife") and fam["wife"] in person_ids:
            conn.execute(
                """
                INSERT OR IGNORE INTO famille_conjoints (id_famille, id_personne, role)
                VALUES (?, ?, 'epouse')
                """,
                (fid, fam["wife"]),
            )
        for ordre, child_id in enumerate(fam.get("chil") or [], start=1):
            if child_id not in person_ids:
                continue
            conn.execute(
                """
                INSERT OR IGNORE INTO famille_enfants (id_famille, id_enfant, ordre)
                VALUES (?, ?, ?)
                """,
                (fid, child_id, ordre),
            )

    for person in individuals.values():
        for fam_id in person.get("fams") or []:
            if fam_id not in family_ids:
                continue
            conn.execute(
                """
                INSERT OR IGNORE INTO personne_unions (id_personne, id_famille)
                VALUES (?, ?)
                """,
                (person["id"], fam_id),
            )

    lieux = LieuCache(conn)

    for person in individuals.values():
        pid = person["id"]
        insert_evenement(
            conn,
            lieux,
            type_="NAISSANCE",
            id_personne=pid,
            id_famille=None,
            date_brute=person.get("birt"),
            plac=person.get("birt_plac"),
        )
        insert_evenement(
            conn,
            lieux,
            type_="DECES",
            id_personne=pid,
            id_famille=None,
            date_brute=person.get("deat"),
            plac=person.get("deat_plac"),
        )

    for fam in families.values():
        insert_evenement(
            conn,
            lieux,
            type_="MARIAGE",
            id_personne=None,
            id_famille=fam["id"],
            date_brute=fam.get("marr"),
            plac=fam.get("marr_plac"),
        )

    imported_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    counts = {
        "personnes": len(individuals),
        "familles": len(families),
        "lieux": conn.execute("SELECT COUNT(*) FROM lieux").fetchone()[0],
        "evenements": conn.execute("SELECT COUNT(*) FROM evenements").fetchone()[0],
    }

    conn.execute(
        """
        INSERT INTO meta (
            id, version_schema, id_gedcom_racine, chemin_gedcom, empreinte_gedcom,
            empreinte_actes, importe_le, nb_personnes, nb_familles, nb_actes, nb_photos
        ) VALUES (1, ?, ?, ?, ?, NULL, ?, ?, ?, 0, 0)
        """,
        (
            SCHEMA_VERSION,
            root_id,
            str(gedcom_path.resolve()),
            sha256_file(gedcom_path),
            imported_at,
            counts["personnes"],
            counts["familles"],
        ),
    )

    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Import GEDCOM → SQLite (purge puis import)")
    parser.add_argument(
        "--gedcom",
        type=Path,
        default=Path(os.environ.get("GEDCOM_PATH", DEFAULT_GEDCOM)),
        help="Chemin du fichier GEDCOM",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB,
        help="Chemin de la base SQLite",
    )
    parser.add_argument(
        "--souche",
        default=os.environ.get("SOUCHE_GEDCOM_ID"),
        help="Id GEDCOM de la souche (sinon détection automatique)",
    )
    args = parser.parse_args()

    if not args.gedcom.is_file():
        raise SystemExit(f"GEDCOM introuvable : {args.gedcom}")
    if not SCHEMA_PATH.is_file():
        raise SystemExit(f"Schéma introuvable : {SCHEMA_PATH}")

    individuals, _ = load_gedcom(args.gedcom)
    root_id = resolve_root_id(individuals, args.souche)
    root = individuals[root_id]

    conn = purge_database(args.db)
    try:
        counts = import_gedcom(conn, args.gedcom, root_id)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    print(f"Base : {args.db.resolve()}")
    print(f"GEDCOM : {args.gedcom.resolve()}")
    print(f"Souche : {root.get('given', '')} {root.get('surn', '')} ({root_id})")
    print(
        "Importé : "
        f"{counts['personnes']} personnes, "
        f"{counts['familles']} familles, "
        f"{counts['lieux']} lieux, "
        f"{counts['evenements']} événements"
    )


if __name__ == "__main__":
    main()
