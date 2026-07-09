"""Faits historiques contextualisés pour une personne."""

from __future__ import annotations

from datetime import date

import sqlite3

from act_path_normalize import normalize_commune

from server.schemas.personnes import FaitHistorique


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
