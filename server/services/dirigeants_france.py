"""Dirigeants français — fiche personne et page liste."""

from __future__ import annotations

import json
from datetime import date

import sqlite3

from server.schemas.dirigeants_france import (
    DirigeantFranceLigne,
    DirigeantsFranceListResponse,
    DirigeantsFranceStatsResponse,
)


def _format_periode(debut: str, fin: str) -> str:
    if debut == fin or not fin or fin == "????":
        return debut
    return f"{debut} – {fin}"


def _format_vie(naissance: str | None, deces: str | None) -> str | None:
    birth = (naissance or "").strip()
    death = (deces or "").strip()
    if birth and death:
        return f"{birth} – {death}"
    if birth:
        return f"{birth} –"
    if death:
        return f"– {death}"
    return None


def _year_from(value: str | None) -> int | None:
    if not value or len(value) < 4:
        return None
    try:
        return int(value[:4])
    except ValueError:
        return None


def _life_bounds(
    birth_iso: str | None, death_iso: str | None
) -> tuple[int, int]:
    birth = _year_from(birth_iso) or 1500
    death = _year_from(death_iso) or date.today().year
    return birth, death


def _overlaps_life(
    birth_iso: str | None,
    death_iso: str | None,
    debut: str,
    fin: str,
) -> bool:
    life_start, life_end = _life_bounds(birth_iso, death_iso)
    reign_start = _year_from(debut)
    reign_end = _year_from(fin) or reign_start
    if reign_start is None:
        return True
    return reign_start <= life_end and (reign_end or reign_start) >= life_start


def _parse_faits_json(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [str(item).strip() for item in data if str(item).strip()]


def _row_to_ligne(row: sqlite3.Row) -> DirigeantFranceLigne:
    naissance = row["naissance"]
    deces = row["deces"]
    return DirigeantFranceLigne(
        slug=row["slug"],
        nom=row["nom"],
        titre=row["titre"],
        debut=row["debut"],
        fin=row["fin"],
        periode=_format_periode(row["debut"], row["fin"]),
        naissance=naissance,
        deces=deces or None,
        vie=_format_vie(naissance, deces),
        regime=row["regime"],
        lien_predecesseur=row["lien_predecesseur"],
        faits_positifs=_parse_faits_json(row["faits_positifs"]),
        faits_negatifs=_parse_faits_json(row["faits_negatifs"]),
        photo_url=row["photo_url"],
    )


def _arbre_personne_ids(
    conn: sqlite3.Connection,
    ancre: str,
    ancetres: int,
    descendants: int,
) -> set[str]:
    from server.services.personnes import get_arbre

    arbre = get_arbre(conn, ancre, ancetres, descendants)
    if not arbre:
        return set()
    return {n.id_gedcom for n in arbre.noeuds}


def _tree_life_bounds(
    conn: sqlite3.Connection, zone_ids: set[str]
) -> list[tuple[int, int]]:
    if not zone_ids:
        return []
    placeholders = ",".join("?" for _ in zone_ids)
    params = tuple(zone_ids)
    bounds: list[tuple[int, int]] = []
    for row in conn.execute(
        f"""
        SELECT date_naissance_min, date_deces_max
        FROM personnes
        WHERE id_gedcom IN ({placeholders})
        """,
        params,
    ):
        bounds.append(_life_bounds(row["date_naissance_min"], row["date_deces_max"]))
    return bounds


def _reign_overlaps_tree(
    bounds_list: list[tuple[int, int]], debut: str, fin: str
) -> bool:
    if not bounds_list:
        return False
    reign_start = _year_from(debut)
    reign_end = _year_from(fin) or reign_start
    if reign_start is None:
        return False
    for life_start, life_end in bounds_list:
        if reign_start <= life_end and (reign_end or reign_start) >= life_start:
            return True
    return False


def _all_dirigeant_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return list(
        conn.execute(
            """
            SELECT slug, nom, titre, debut, fin,
                   naissance, deces, regime, lien_predecesseur,
                   faits_positifs, faits_negatifs, photo_url
            FROM dirigeants_france
            ORDER BY debut, nom
            """
        )
    )


def get_dirigeants_france_stats(
    conn: sqlite3.Connection,
    ancre: str,
    ancetres: int,
    descendants: int,
) -> DirigeantsFranceStatsResponse:
    rows = _all_dirigeant_rows(conn)
    nombre_dirigeants_total = len(rows)
    zone_ids = _arbre_personne_ids(conn, ancre, ancetres, descendants)
    if not zone_ids:
        return DirigeantsFranceStatsResponse(
            nombre_dirigeants_total=nombre_dirigeants_total,
            nombre_dirigeants_zone=0,
        )
    bounds = _tree_life_bounds(conn, zone_ids)
    nombre_dirigeants_zone = sum(
        1 for row in rows if _reign_overlaps_tree(bounds, row["debut"], row["fin"])
    )
    return DirigeantsFranceStatsResponse(
        nombre_dirigeants_total=nombre_dirigeants_total,
        nombre_dirigeants_zone=nombre_dirigeants_zone,
    )


def list_dirigeants_france(
    conn: sqlite3.Connection,
    *,
    zone: bool,
    ancre: str,
    ancetres: int,
    descendants: int,
) -> DirigeantsFranceListResponse:
    stats = get_dirigeants_france_stats(conn, ancre, ancetres, descendants)
    rows = _all_dirigeant_rows(conn)
    if zone:
        zone_ids = _arbre_personne_ids(conn, ancre, ancetres, descendants)
        if not zone_ids:
            return DirigeantsFranceListResponse(
                lignes=[],
                nombre_dirigeants_total=stats.nombre_dirigeants_total,
                nombre_dirigeants_zone=stats.nombre_dirigeants_zone,
            )
        bounds = _tree_life_bounds(conn, zone_ids)
        rows = [
            row
            for row in rows
            if _reign_overlaps_tree(bounds, row["debut"], row["fin"])
        ]
    return DirigeantsFranceListResponse(
        lignes=[_row_to_ligne(row) for row in rows],
        nombre_dirigeants_total=stats.nombre_dirigeants_total,
        nombre_dirigeants_zone=stats.nombre_dirigeants_zone,
    )


def get_dirigeants_france_personne(
    conn: sqlite3.Connection, id_gedcom: str
) -> list[DirigeantFranceLigne]:
    row = conn.execute(
        """
        SELECT date_naissance_min, date_deces_max
        FROM personnes WHERE id_gedcom = ?
        """,
        (id_gedcom,),
    ).fetchone()
    if not row:
        return []

    birth_iso = row["date_naissance_min"]
    death_iso = row["date_deces_max"]

    dirigeants: list[DirigeantFranceLigne] = []
    for d in _all_dirigeant_rows(conn):
        if not _overlaps_life(birth_iso, death_iso, d["debut"], d["fin"]):
            continue
        dirigeants.append(_row_to_ligne(d))
    return dirigeants
