"""Mapping professions brutes → libellés du nuage."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime

from act_path_normalize import ascii_fold

from server.schemas.profession_mapping import (
    ProfessionMappingLigne,
    ProfessionMappingListResponse,
    ProfessionMappingUpdate,
)

_FEMININE_SUFFIXES = (
    ("trice", "teur"),
    ("euse", "eur"),
    ("ière", "ier"),
    ("ere", "er"),
)


def ensure_profession_mapping_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS profession_mapping (
            profession_brute TEXT PRIMARY KEY,
            libelle_nuage    TEXT NOT NULL,
            modifie_le       TEXT NOT NULL
        )
        """
    )


def premier_mot(raw: str) -> str:
    parts = raw.strip().split()
    return parts[0] if parts else raw.strip()


def _capitalize_like(source: str, target: str) -> str:
    if not target:
        return target
    if source[:1].isupper():
        return target[:1].upper() + target[1:]
    return target


def masculiniser_mot(mot: str) -> str:
    m = mot.strip()
    if not m:
        return m
    folded = ascii_fold(m).casefold()
    for fem, masc in _FEMININE_SUFFIXES:
        if len(folded) > len(fem) and folded.endswith(fem):
            base = m[: -len(fem)]
            return _capitalize_like(m, base + masc)
    return m


def libelle_nuage_defaut(raw: str) -> str:
    return masculiniser_mot(premier_mot(raw))


def libelle_nuage_key(libelle: str) -> str:
    return ascii_fold(libelle.strip()).casefold()


def load_mapping_dict(conn: sqlite3.Connection) -> dict[str, str]:
    ensure_profession_mapping_table(conn)
    return {
        row["profession_brute"]: row["libelle_nuage"]
        for row in conn.execute(
            "SELECT profession_brute, libelle_nuage FROM profession_mapping"
        )
    }


def resolve_libelle_nuage(raw: str, mapping: dict[str, str]) -> str:
    brut = raw.strip()
    if not brut:
        return brut
    if brut in mapping:
        custom = mapping[brut].strip()
        if custom:
            return custom
    return libelle_nuage_defaut(brut)


def list_distinct_professions(conn: sqlite3.Connection) -> list[tuple[str, int]]:
    rows = conn.execute(
        """
        SELECT profession, COUNT(*) AS effectif
        FROM personnes
        WHERE profession IS NOT NULL AND TRIM(profession) != ''
        GROUP BY profession
        ORDER BY effectif DESC, profession COLLATE NOCASE
        """
    ).fetchall()
    return [(row["profession"], int(row["effectif"])) for row in rows]


def list_profession_mappings(conn: sqlite3.Connection) -> ProfessionMappingListResponse:
    ensure_profession_mapping_table(conn)
    mapping = load_mapping_dict(conn)
    lignes: list[ProfessionMappingLigne] = []
    for profession_brute, effectif in list_distinct_professions(conn):
        libelle_defaut = libelle_nuage_defaut(profession_brute)
        override = profession_brute in mapping
        libelle_nuage = mapping[profession_brute] if override else libelle_defaut
        lignes.append(
            ProfessionMappingLigne(
                profession_brute=profession_brute,
                effectif=effectif,
                libelle_nuage=libelle_nuage,
                libelle_defaut=libelle_defaut,
                override=override,
            )
        )
    return ProfessionMappingListResponse(
        lignes=lignes,
        nombre_professions_distinctes=len(lignes),
        nombre_overrides=sum(1 for line in lignes if line.override),
    )


def upsert_profession_mapping(
    conn: sqlite3.Connection, payload: ProfessionMappingUpdate
) -> ProfessionMappingLigne:
    ensure_profession_mapping_table(conn)
    brut = payload.profession_brute.strip()
    libelle = payload.libelle_nuage.strip()
    if not brut:
        raise ValueError("Profession brute requise")
    if not libelle:
        raise ValueError("Libellé nuage requis")

    row = conn.execute(
        "SELECT COUNT(*) FROM personnes WHERE profession = ?",
        (brut,),
    ).fetchone()
    if not row or row[0] == 0:
        raise ValueError("Profession inconnue dans la base")

    libelle_defaut = libelle_nuage_defaut(brut)
    now = datetime.now(UTC).replace(microsecond=0).isoformat()
    if libelle_nuage_key(libelle) == libelle_nuage_key(libelle_defaut):
        conn.execute(
            "DELETE FROM profession_mapping WHERE profession_brute = ?",
            (brut,),
        )
        override = False
        libelle_effectif = libelle_defaut
    else:
        conn.execute(
            """
            INSERT INTO profession_mapping (profession_brute, libelle_nuage, modifie_le)
            VALUES (?, ?, ?)
            ON CONFLICT(profession_brute) DO UPDATE SET
                libelle_nuage = excluded.libelle_nuage,
                modifie_le = excluded.modifie_le
            """,
            (brut, libelle, now),
        )
        override = True
        libelle_effectif = libelle

    conn.commit()
    return ProfessionMappingLigne(
        profession_brute=brut,
        effectif=int(row[0]),
        libelle_nuage=libelle_effectif,
        libelle_defaut=libelle_defaut,
        override=override,
    )


def reset_profession_mapping(conn: sqlite3.Connection, profession_brute: str) -> None:
    ensure_profession_mapping_table(conn)
    brut = profession_brute.strip()
    if not brut:
        raise ValueError("Profession brute requise")
    conn.execute(
        "DELETE FROM profession_mapping WHERE profession_brute = ?",
        (brut,),
    )
    conn.commit()
