#!/usr/bin/env python3
"""Indexe actes (N/M/D) et photos (P/A) depuis GitHub (API) dans SQLite."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

BDD_DIR = Path(__file__).resolve().parent.parent
WS_ROOT = BDD_DIR.parent
SCRIPTS_DIR = WS_ROOT / "scripts"
sys.path.insert(0, str(WS_ROOT))
sys.path.insert(0, str(SCRIPTS_DIR))

from act_path_normalize import normalize_commune, normalize_surname  # noqa: E402
from generate_ascendance_table import ACT_FILE_RE, birth_year, match_score, norm_tokens  # noqa: E402
from paths import ACTES_BASE_URL, DOCUMENTS_REL_PREFIX, GITHUB_API_TREE_URL  # noqa: E402

DEFAULT_DB = BDD_DIR / "genealogie.sqlite"
ACT_EXTENSIONS = {".jpg", ".jpeg", ".pdf", ".png"}
PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png"}
USER_AGENT = "genealogie-import/1.0"


@dataclass
class ParsedActe:
    nom: str
    prenoms: str
    nom_fichier: str
    chemin_relatif: str
    chemin_dossier: str
    cle_personne: str
    type: str
    date_acte_iso: str
    departement: str
    commune: str
    commune_affichage: str
    suffixe: str | None
    taille_fichier: int
    url: str


@dataclass
class PersonMatch:
    id_gedcom: str
    nom: str
    prenoms: str
    naissance_iso: str | None = None
    naissance_commune: str | None = None
    naissance_dept: str | None = None
    naissance_cp: str | None = None
    deces_iso: str | None = None
    deces_commune: str | None = None
    deces_dept: str | None = None
    mariages: list[tuple[str | None, str | None, str | None, str | None]] = field(
        default_factory=list
    )


def fetch_github_actes_tree(tree_url: str = GITHUB_API_TREE_URL) -> list[dict]:
    request = urllib.request.Request(
        tree_url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"GitHub API indisponible ({exc.code}) : {tree_url}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Impossible de joindre GitHub : {exc.reason}") from exc

    if payload.get("truncated"):
        raise SystemExit("Arbre GitHub tronqué — trop de fichiers ; contacter le maintainer.")

    prefix = f"{DOCUMENTS_REL_PREFIX}/"
    blobs: list[dict] = []
    for item in payload.get("tree", []):
        if item.get("type") != "blob":
            continue
        path = item.get("path", "")
        if not path.startswith(prefix):
            continue
        rel = path[len(prefix) :]
        suffix = PurePosixPath(rel).suffix.lower()
        if suffix not in ACT_EXTENSIONS:
            continue
        size = int(item.get("size") or 0)
        if size == 0:
            continue
        blobs.append({"path": rel, "size": size})
    return blobs


def tree_empreinte(entries: list[dict]) -> str:
    digest = hashlib.sha256()
    for entry in sorted(entries, key=lambda e: e["path"]):
        digest.update(f"{entry['path']}\t{entry['size']}\n".encode())
    return digest.hexdigest()


def parse_acte_blob(path: str, size: int) -> ParsedActe | None:
    rel = path.replace("\\", "/")
    parts = PurePosixPath(rel)
    nom_fichier = parts.name
    match = ACT_FILE_RE.match(nom_fichier)
    if not match:
        return None

    data = match.groupdict()
    chemin_dossier = str(parts.parent).replace("\\", "/")
    if chemin_dossier == ".":
        return None
    cle_personne = parts.parent.name
    commune_raw = data["commune"]
    url = f"{ACTES_BASE_URL.rstrip('/')}/{rel}"

    return ParsedActe(
        nom=data["nom"],
        prenoms=data["prenoms"],
        nom_fichier=nom_fichier,
        chemin_relatif=rel,
        chemin_dossier=chemin_dossier,
        cle_personne=cle_personne,
        type=data["type"].upper(),
        date_acte_iso=data["date"],
        departement=data["dept"],
        commune=commune_raw,
        commune_affichage=commune_raw.replace("_", " "),
        suffixe=data.get("suffix"),
        taille_fichier=size,
        url=url,
    )


def dept_matches(act_dept: str, dept: str | None, code_postal: str | None) -> bool:
    if act_dept in {"", "XX"}:
        return True
    if dept and act_dept == dept:
        return True
    if dept and act_dept in dept:
        return True
    if code_postal and code_postal.startswith(act_dept):
        return True
    return False


def commune_matches(act_commune: str, lieu_commune: str | None) -> bool:
    act_n = normalize_commune(act_commune)
    if not act_n or act_n == "X":
        return True
    if lieu_commune and normalize_commune(lieu_commune) == act_n:
        return True
    return False


def iso_prefix_match(a: str | None, b: str | None) -> bool:
    if not a or not b:
        return False
    for length in (10, 7, 4):
        if a[:length] == b[:length]:
            return True
    return False


def load_persons(conn: sqlite3.Connection) -> dict[str, PersonMatch]:
    persons: dict[str, PersonMatch] = {}
    for row in conn.execute("SELECT id_gedcom, nom, prenoms FROM personnes"):
        persons[row[0]] = PersonMatch(id_gedcom=row[0], nom=row[1], prenoms=row[2] or "")

    for row in conn.execute(
        """
        SELECT e.id_personne, e.type, e.date_iso,
               l.commune, l.departement, l.code_postal
        FROM evenements e
        LEFT JOIN lieux l ON l.id = e.id_lieu
        WHERE e.id_personne IS NOT NULL
          AND e.type IN ('NAISSANCE', 'DECES')
        """
    ):
        person = persons.get(row[0])
        if not person:
            continue
        if row[1] == "NAISSANCE":
            person.naissance_iso = row[2]
            person.naissance_commune = row[3]
            person.naissance_dept = row[4]
            person.naissance_cp = row[5]
        elif row[1] == "DECES":
            person.deces_iso = row[2]
            person.deces_commune = row[3]
            person.deces_dept = row[4]

    for row in conn.execute(
        """
        SELECT pu.id_personne, e.date_iso, l.commune, l.departement, l.code_postal
        FROM personne_unions pu
        JOIN evenements e ON e.id_famille = pu.id_famille AND e.type = 'MARIAGE'
        LEFT JOIN lieux l ON l.id = e.id_lieu
        """
    ):
        person = persons.get(row[0])
        if not person:
            continue
        person.mariages.append((row[1], row[2], row[3], row[4]))

    return persons


def identity_candidates(
    act: ParsedActe, persons: dict[str, PersonMatch]
) -> list[tuple[int, PersonMatch]]:
    surn = normalize_surname(act.nom)
    tokens = norm_tokens(act.prenoms.replace("_", " "))

    scored: list[tuple[int, PersonMatch]] = []
    for person in persons.values():
        if normalize_surname(person.nom) != surn:
            continue
        score = match_score(tokens, norm_tokens(person.prenoms))
        if score < 400:
            continue
        scored.append((score, person))
    scored.sort(key=lambda item: (-item[0], item[1].id_gedcom))
    return scored


def match_acte(
    act: ParsedActe, persons: dict[str, PersonMatch]
) -> tuple[str | None, str | None, int | None]:
    candidates = identity_candidates(act, persons)
    if not candidates:
        return None, None, None

    act_year = birth_year(act.date_acte_iso)

    if act.type == "N" or act.type == "P" or act.type == "A":
        for score, person in candidates:
            if act_year and person.naissance_iso:
                if birth_year(person.naissance_iso) != act_year:
                    continue
            if not dept_matches(act.departement, person.naissance_dept, person.naissance_cp):
                continue
            if not commune_matches(act.commune, person.naissance_commune):
                continue
            return person.id_gedcom, "cle_naissance", score
        return None, None, None

    if act.type == "D":
        for score, person in candidates:
            if act.date_acte_iso and person.deces_iso:
                if not iso_prefix_match(act.date_acte_iso, person.deces_iso):
                    continue
            if not dept_matches(act.departement, person.deces_dept, None):
                continue
            if not commune_matches(act.commune, person.deces_commune):
                continue
            return person.id_gedcom, "date_evenement", score
        best_score, best = candidates[0]
        if best_score >= 500:
            return best.id_gedcom, "date_evenement", best_score
        return None, None, None

    if act.type == "M":
        for score, person in candidates:
            for m_iso, m_commune, m_dept, m_cp in person.mariages:
                if act.date_acte_iso and m_iso and not iso_prefix_match(act.date_acte_iso, m_iso):
                    continue
                if not dept_matches(act.departement, m_dept, m_cp):
                    continue
                if not commune_matches(act.commune, m_commune):
                    continue
                return person.id_gedcom, "date_evenement", score
        best_score, best = candidates[0]
        if best_score >= 500:
            return best.id_gedcom, "date_evenement", best_score
        return None, None, None

    return None, None, None


def ensure_meta_row(conn: sqlite3.Connection) -> None:
    if conn.execute("SELECT id FROM meta WHERE id = 1").fetchone():
        return
    conn.execute(
        """
        INSERT INTO meta (
            id, version_schema, id_gedcom_racine, importe_le,
            nb_personnes, nb_familles, nb_actes, nb_photos
        ) VALUES (1, 1, '@655@', ?, 0, 0, 0, 0)
        """,
        (datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),),
    )


def import_actes(conn: sqlite3.Connection, blobs: list[dict]) -> dict[str, int]:
    persons = load_persons(conn)
    if not persons:
        raise SystemExit("Aucune personne en base — lancer import_gedcom.py d'abord.")

    conn.execute("DELETE FROM actes")
    conn.execute("DELETE FROM photos")
    parsed_actes: list[ParsedActe] = []
    parsed_photos: list[ParsedActe] = []
    skipped = 0
    for blob in blobs:
        acte = parse_acte_blob(blob["path"], blob["size"])
        if not acte:
            skipped += 1
            continue
        ext = PurePosixPath(acte.nom_fichier).suffix.lower()
        if acte.type in ("P", "A"):
            if ext not in PHOTO_EXTENSIONS:
                skipped += 1
                continue
            parsed_photos.append(acte)
        else:
            parsed_actes.append(acte)

    matched_actes = 0
    for acte in parsed_actes:
        id_gedcom, methode, score = match_acte(acte, persons)
        if id_gedcom:
            matched_actes += 1
        conn.execute(
            """
            INSERT INTO actes (
                type, cle_personne, chemin_dossier, nom_fichier, chemin_relatif, url,
                date_acte_iso, departement, commune, suffixe, taille_fichier,
                id_gedcom, methode_raccord, score_raccord
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                acte.type,
                acte.cle_personne,
                acte.chemin_dossier,
                acte.nom_fichier,
                acte.chemin_relatif,
                acte.url,
                acte.date_acte_iso,
                acte.departement,
                acte.commune_affichage,
                acte.suffixe,
                acte.taille_fichier,
                id_gedcom,
                methode,
                score,
            ),
        )

    matched_photos = 0
    for photo in parsed_photos:
        id_gedcom, _, _ = match_acte(photo, persons)
        if id_gedcom:
            matched_photos += 1
        conn.execute(
            """
            INSERT INTO photos (
                cle_personne, chemin_dossier, nom_fichier, chemin_relatif, url,
                suffixe, taille_fichier, id_gedcom
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                photo.cle_personne,
                photo.chemin_dossier,
                photo.nom_fichier,
                photo.chemin_relatif,
                photo.url,
                photo.suffixe,
                photo.taille_fichier,
                id_gedcom,
            ),
        )

    empreinte = tree_empreinte(blobs)
    imported_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    ensure_meta_row(conn)
    conn.execute(
        """
        UPDATE meta
        SET empreinte_actes = ?, nb_actes = ?, nb_photos = ?, importe_le = ?
        WHERE id = 1
        """,
        (empreinte, len(parsed_actes), len(parsed_photos), imported_at),
    )

    return {
        "fichiers_github": len(blobs),
        "actes_indexes": len(parsed_actes),
        "photos_indexes": len(parsed_photos),
        "fichiers_ignores": skipped,
        "actes_raccordes": matched_actes,
        "actes_non_raccordes": len(parsed_actes) - matched_actes,
        "photos_raccordees": matched_photos,
        "photos_non_raccordees": len(parsed_photos) - matched_photos,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Indexe actes (N/M/D) et photos (P) depuis GitHub dans SQLite"
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=Path(os.environ.get("SQLITE_PATH", DEFAULT_DB)),
        help="Base SQLite (doit contenir un import GEDCOM)",
    )
    parser.add_argument(
        "--tree-url",
        default=os.environ.get("GITHUB_ACTES_TREE_URL", GITHUB_API_TREE_URL),
        help="URL API GitHub git/trees?recursive=1",
    )
    args = parser.parse_args()

    if not args.db.is_file():
        raise SystemExit(f"Base introuvable : {args.db} — lancer import_gedcom.py d'abord.")

    print(f"Listing GitHub : {args.tree_url}")
    blobs = fetch_github_actes_tree(args.tree_url)
    print(f"Fichiers actes sur GitHub : {len(blobs)}")

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        stats = import_actes(conn, blobs)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    print(f"Base : {args.db.resolve()}")
    print(
        f"Indexés : {stats['actes_indexes']} actes "
        f"({stats['actes_raccordes']} raccordés, {stats['actes_non_raccordes']} sans id_gedcom)"
    )
    print(
        f"         {stats['photos_indexes']} photos "
        f"({stats['photos_raccordees']} raccordées, {stats['photos_non_raccordees']} sans id_gedcom)"
    )
    if stats["fichiers_ignores"]:
        print(f"Ignorés (nom non v2) : {stats['fichiers_ignores']}")


if __name__ == "__main__":
    main()
