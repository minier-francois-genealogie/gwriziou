"""Faits historiques contextualisés pour une personne."""

from __future__ import annotations

from datetime import date

import sqlite3

from act_path_normalize import normalize_commune

from server.schemas.personnes import FaitHistorique
from server.schemas.faits_historiques import (
    FaitHistoriqueLigne,
    FaitsHistoriquesListResponse,
    FaitsHistoriquesStatsResponse,
)

_NIVEAU_LABELS = {
    "COMMUNAL": "Commune",
    "DEPARTEMENT": "Département",
    "REGIONAL": "Région",
    "NATIONAL": "France",
    "MONDE": "Monde",
}

_CATEGORIE_LABELS = {
    "ADMINISTRATION": "Administration",
    "GUERRE": "Guerre",
    "PANDEMIE": "Épidémie",
    "RELIGION": "Religion",
    "ECONOMIE": "Économie",
    "SOCIETE": "Société",
    "CATASTROPHE": "Catastrophe",
    "CRISE": "Crise",
    "CULTURE": "Culture",
    "EVENEMENT": "Événement",
    "POLITIQUE": "Politique",
    "REGNE": "Règne",
    "SCIENCE": "Science",
    "AUTRE": "Autre",
}


def _format_periode(debut: str, fin: str) -> str:
    if debut == fin or not fin or fin == "????":
        return debut
    return f"{debut} – {fin}"


def _normalize_pays_label(niveau: str, slug: str, pays: str | None) -> str | None:
    raw = (pays or "").strip()
    if niveau == "MONDE":
        return raw or "Monde"
    if niveau == "NATIONAL":
        if raw.upper() == "FR":
            return "France"
        if raw:
            return raw
        if slug == "france":
            return "France"
        return "France"
    if raw.upper() == "FR":
        return "France"
    return raw or None


def _format_lieu(
    niveau: str,
    slug: str,
    commune: str | None,
    departement: str | None,
    region: str | None,
    pays: str | None,
) -> str | None:
    if niveau in ("MONDE", "NATIONAL"):
        return _normalize_pays_label(niveau, slug, pays)
    parts = [
        p
        for p in (
            commune,
            departement,
            region,
            _normalize_pays_label(niveau, slug, pays),
        )
        if p and p.strip()
    ]
    return " · ".join(parts) if parts else None


def _row_to_ligne(row: sqlite3.Row) -> FaitHistoriqueLigne:
    niveau = row["niveau"]
    categorie = row["categorie"]
    return FaitHistoriqueLigne(
        niveau=niveau,
        niveau_label=_NIVEAU_LABELS.get(niveau, niveau),
        categorie=categorie,
        categorie_label=_CATEGORIE_LABELS.get(categorie, categorie),
        debut=row["debut"],
        fin=row["fin"],
        periode=_format_periode(row["debut"], row["fin"]),
        libelle=row["libelle"],
        description=row["description"],
        commune=row["commune"],
        departement=row["departement"],
        region=row["region"],
        pays=row["pays"],
        lieu=_format_lieu(
            niveau,
            row["slug"],
            row["commune"],
            row["departement"],
            row["region"],
            row["pays"],
        ),
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


def _zone_lieux_slugs(
    conn: sqlite3.Connection, zone_ids: set[str]
) -> tuple[set[str], set[str], set[str]]:
    if not zone_ids:
        return set(), set(), set()

    slug_by_commune: dict[str, str] = {}
    for row in conn.execute("SELECT slug, commune FROM commune_slugs"):
        slug_by_commune[row["commune"].casefold()] = row["slug"]

    communes: set[str] = set()
    departements: set[str] = set()
    regions: set[str] = set()
    placeholders = ",".join("?" for _ in zone_ids)
    params = tuple(zone_ids)

    rows = conn.execute(
        f"""
        SELECT DISTINCT l.commune, l.departement, l.region
        FROM lieux l
        WHERE l.id IN (
            SELECT e.id_lieu
            FROM evenements e
            WHERE e.id_lieu IS NOT NULL AND (
                e.id_personne IN ({placeholders})
                OR e.id_famille IN (
                    SELECT id_famille FROM personne_unions
                    WHERE id_personne IN ({placeholders})
                )
            )
        )
        """,
        params + params,
    )
    for row in rows:
        commune = (row["commune"] or "").strip()
        if commune:
            communes.add(slug_by_commune.get(commune.casefold()) or _slug_label(commune))
        dept = (row["departement"] or "").strip()
        if dept:
            departements.add(_slug_label(dept))
        region = (row["region"] or "").strip()
        if region:
            regions.add(_slug_label(region))

    return communes, departements, regions


def _zone_fait_ids_sql(
    communes: set[str],
    departements: set[str],
    regions: set[str],
) -> tuple[str, list[object]]:
    clauses = ["niveau = 'MONDE'", "niveau = 'NATIONAL'"]
    params: list[object] = []
    if regions:
        placeholders = ",".join("?" for _ in regions)
        clauses.append(f"(niveau = 'REGIONAL' AND slug IN ({placeholders}))")
        params.extend(sorted(regions))
    if departements:
        placeholders = ",".join("?" for _ in departements)
        clauses.append(f"(niveau = 'DEPARTEMENT' AND slug IN ({placeholders}))")
        params.extend(sorted(departements))
    if communes:
        placeholders = ",".join("?" for _ in communes)
        clauses.append(f"(niveau = 'COMMUNAL' AND slug IN ({placeholders}))")
        params.extend(sorted(communes))
    return f"({' OR '.join(clauses)})", params


def get_faits_historiques_stats(
    conn: sqlite3.Connection,
    ancre: str,
    ancetres: int,
    descendants: int,
) -> FaitsHistoriquesStatsResponse:
    nombre_faits_total = conn.execute(
        "SELECT COUNT(*) FROM faits_historiques"
    ).fetchone()[0]
    zone_ids = _arbre_personne_ids(conn, ancre, ancetres, descendants)
    if not zone_ids:
        return FaitsHistoriquesStatsResponse(
            nombre_faits_total=nombre_faits_total,
            nombre_faits_zone=0,
        )
    communes, departements, regions = _zone_lieux_slugs(conn, zone_ids)
    where, params = _zone_fait_ids_sql(communes, departements, regions)
    nombre_faits_zone = conn.execute(
        f"SELECT COUNT(*) FROM faits_historiques WHERE {where}",
        params,
    ).fetchone()[0]
    return FaitsHistoriquesStatsResponse(
        nombre_faits_total=nombre_faits_total,
        nombre_faits_zone=nombre_faits_zone,
    )


def list_faits_historiques(
    conn: sqlite3.Connection,
    *,
    zone: bool,
    ancre: str,
    ancetres: int,
    descendants: int,
) -> FaitsHistoriquesListResponse:
    stats = get_faits_historiques_stats(conn, ancre, ancetres, descendants)
    sql = """
        SELECT niveau, categorie, debut, fin, libelle, description,
               commune, departement, region, pays, slug
        FROM faits_historiques
    """
    params: list[object] = []
    if zone:
        zone_ids = _arbre_personne_ids(conn, ancre, ancetres, descendants)
        if not zone_ids:
            return FaitsHistoriquesListResponse(
                lignes=[],
                nombre_faits_total=stats.nombre_faits_total,
                nombre_faits_zone=0,
            )
        communes, departements, regions = _zone_lieux_slugs(conn, zone_ids)
        where, params = _zone_fait_ids_sql(communes, departements, regions)
        sql += f" WHERE {where}"

    sql += " ORDER BY debut, niveau, libelle"

    lignes = [_row_to_ligne(row) for row in conn.execute(sql, params)]
    return FaitsHistoriquesListResponse(
        lignes=lignes,
        nombre_faits_total=stats.nombre_faits_total,
        nombre_faits_zone=stats.nombre_faits_zone,
    )


def _slug_label(value: str) -> str:
    return normalize_commune(value).lower()


def _year_from(iso: str | None) -> int | None:
    if not iso or len(iso) < 4:
        return None
    try:
        return int(iso[:4])
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
    evt_start = _year_from(debut)
    evt_end = _year_from(fin) or evt_start
    if evt_start is None:
        return True
    return evt_start <= life_end and (evt_end or evt_start) >= life_start


def _fetch_lieux_slugs(
    conn: sqlite3.Connection, id_gedcom: str
) -> tuple[set[str], set[str], set[str]]:
    communes: set[str] = set()
    departements: set[str] = set()
    regions: set[str] = set()

    slug_by_commune: dict[str, str] = {}
    for row in conn.execute("SELECT slug, commune FROM commune_slugs"):
        slug_by_commune[row["commune"].casefold()] = row["slug"]

    rows = conn.execute(
        """
        SELECT DISTINCT l.commune, l.departement, l.region
        FROM lieux l
        WHERE l.id IN (
            SELECT e.id_lieu
            FROM evenements e
            WHERE e.id_lieu IS NOT NULL AND (
                e.id_personne = ?
                OR e.id_famille IN (
                    SELECT id_famille FROM personne_unions WHERE id_personne = ?
                )
            )
        )
        """,
        (id_gedcom, id_gedcom),
    )
    for row in rows:
        commune = (row["commune"] or "").strip()
        if commune:
            slug = slug_by_commune.get(commune.casefold()) or _slug_label(commune)
            communes.add(slug)
        dept = (row["departement"] or "").strip()
        if dept:
            departements.add(_slug_label(dept))
        region = (row["region"] or "").strip()
        if region:
            regions.add(_slug_label(region))

    return communes, departements, regions


_NIVEAU_ORDER = {
    "COMMUNAL": 0,
    "DEPARTEMENT": 1,
    "REGIONAL": 2,
    "NATIONAL": 3,
    "MONDE": 4,
}


def get_faits_historiques_personne(
    conn: sqlite3.Connection, id_gedcom: str
) -> list[FaitHistorique]:
    row = conn.execute(
        """
        SELECT date_naissance_min, date_deces_max
        FROM personnes WHERE id_gedcom = ?
        """,
        (id_gedcom,),
    ).fetchone()
    if not row:
        return []

    communes, departements, regions = _fetch_lieux_slugs(conn, id_gedcom)
    national_slugs = {"france"}

    clauses: list[str] = ["niveau = 'MONDE'"]
    params: list[object] = []

    if national_slugs:
        placeholders = ",".join("?" for _ in national_slugs)
        clauses.append(f"(niveau = 'NATIONAL' AND slug IN ({placeholders}))")
        params.extend(sorted(national_slugs))
    if regions:
        placeholders = ",".join("?" for _ in regions)
        clauses.append(f"(niveau = 'REGIONAL' AND slug IN ({placeholders}))")
        params.extend(sorted(regions))
    if departements:
        placeholders = ",".join("?" for _ in departements)
        clauses.append(f"(niveau = 'DEPARTEMENT' AND slug IN ({placeholders}))")
        params.extend(sorted(departements))
    if communes:
        placeholders = ",".join("?" for _ in communes)
        clauses.append(f"(niveau = 'COMMUNAL' AND slug IN ({placeholders}))")
        params.extend(sorted(communes))

    if len(clauses) == 1 and not communes and not departements and not regions:
        return []

    sql = f"""
        SELECT niveau, categorie, debut, fin, libelle, description,
               commune, departement, region, pays
        FROM faits_historiques
        WHERE {' OR '.join(clauses)}
        ORDER BY debut, libelle
    """
    birth_iso = row["date_naissance_min"]
    death_iso = row["date_deces_max"]

    seen: set[tuple[str, str, str]] = set()
    faits: list[FaitHistorique] = []
    for evt in conn.execute(sql, params):
        if not _overlaps_life(birth_iso, death_iso, evt["debut"], evt["fin"]):
            continue
        key = (evt["niveau"], evt["debut"], evt["libelle"])
        if key in seen:
            continue
        seen.add(key)
        faits.append(
            FaitHistorique(
                niveau=evt["niveau"],
                categorie=evt["categorie"],
                debut=evt["debut"],
                fin=evt["fin"],
                libelle=evt["libelle"],
                description=evt["description"],
                commune=evt["commune"],
                departement=evt["departement"],
                region=evt["region"],
                pays=evt["pays"],
            )
        )

    faits.sort(
        key=lambda f: (
            _NIVEAU_ORDER.get(f.niveau, 9),
            f.debut,
            f.libelle,
        )
    )
    return faits
