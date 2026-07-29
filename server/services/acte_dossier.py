"""Chemin relatif du dossier sources/documents/ d'une personne (clé sémantique GEDCOM)."""

from __future__ import annotations

import re
import sqlite3

from act_path_normalize import normalize_commune, normalize_given_full, normalize_surname
from gedcom_dates import parse_gedcom_dates
from server.schemas.personnes import DossierActes

UNKNOWN_DATE = "XXXX-XX-XX"
UNKNOWN_DEPT = "XX"
UNKNOWN_COMMUNE = "X"


def _dept_from_lieu(
    *,
    code_postal: str | None,
    departement: str | None,
    libelle_brut: str | None,
) -> str:
    if code_postal and re.fullmatch(r"\d{5}", code_postal.strip()):
        return code_postal.strip()[:2]
    if departement:
        d = departement.strip()
        if re.fullmatch(r"\d{1,3}", d):
            return d.zfill(2) if len(d) == 1 else d
    if libelle_brut:
        parts = [p.strip() for p in libelle_brut.split(",") if p.strip()]
        for part in parts[1:]:
            if part.isdigit() and len(part) == 5:
                return part[:2]
        for part in parts:
            if part.isdigit() and len(part) <= 3:
                return part.zfill(2) if len(part) == 1 else part
    return UNKNOWN_DEPT


def _birth_date_folder(date_iso: str | None, date_brute: str | None) -> str:
    if date_iso and re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_iso.strip()):
        return date_iso.strip()
    parsed = parse_gedcom_dates(date_brute) or parse_gedcom_dates(date_iso)
    if parsed and re.fullmatch(r"\d{4}-\d{2}-\d{2}", parsed):
        return parsed
    return UNKNOWN_DATE


def compute_chemin_dossier_actes(
    nom: str,
    prenoms: str | None,
    *,
    date_iso: str | None = None,
    date_brute: str | None = None,
    commune: str | None = None,
    departement: str | None = None,
    code_postal: str | None = None,
    libelle_brut: str | None = None,
) -> str:
    """Retourne le chemin relatif sous sources/documents/ : {L}/{NOM}/{CLE}."""
    surname = normalize_surname(nom or "X")
    given = normalize_given_full(prenoms or "")
    if not given:
        given = "X"
    bdate = _birth_date_folder(date_iso, date_brute)
    dept = _dept_from_lieu(
        code_postal=code_postal,
        departement=departement,
        libelle_brut=libelle_brut,
    )
    commune_seg = normalize_commune(commune or "") if commune else UNKNOWN_COMMUNE
    if libelle_brut and commune_seg == UNKNOWN_COMMUNE:
        first = libelle_brut.split(",")[0].strip()
        if first:
            commune_seg = normalize_commune(first)
    cle = f"{surname}__{given}__{bdate}__{dept}__{commune_seg}"
    letter = surname[0].upper() if surname else "X"
    if not letter.isalpha():
        letter = "X"
    return f"{letter}/{surname}/{cle}"


def _dossier_existe(conn: sqlite3.Connection, chemin: str) -> bool:
    cle = chemin.rsplit("/", 1)[-1]
    row = conn.execute(
        """
        SELECT 1 AS ok FROM actes
        WHERE chemin_dossier = ? OR cle_personne = ?
        UNION ALL
        SELECT 1 AS ok FROM photos
        WHERE chemin_dossier = ? OR cle_personne = ?
        LIMIT 1
        """,
        (chemin, cle, chemin, cle),
    ).fetchone()
    return row is not None


def fetch_dossier_actes(
    conn: sqlite3.Connection,
    id_gedcom: str,
    nom: str,
    prenoms: str | None,
) -> DossierActes:
    row = conn.execute(
        """
        SELECT e.date_iso, e.date_brute,
               l.commune, l.departement, l.code_postal, l.libelle_brut
        FROM evenements e
        LEFT JOIN lieux l ON l.id = e.id_lieu
        WHERE e.id_personne = ? AND e.type = 'NAISSANCE'
        LIMIT 1
        """,
        (id_gedcom,),
    ).fetchone()

    chemin = compute_chemin_dossier_actes(
        nom,
        prenoms,
        date_iso=row["date_iso"] if row else None,
        date_brute=row["date_brute"] if row else None,
        commune=row["commune"] if row else None,
        departement=row["departement"] if row else None,
        code_postal=row["code_postal"] if row else None,
        libelle_brut=row["libelle_brut"] if row else None,
    )
    return DossierActes(chemin=chemin, existe=_dossier_existe(conn, chemin))
