"""Carte géoloc : personnes vivantes par année, regroupées par commune."""

from __future__ import annotations

import sqlite3
from datetime import date

from gedcom_dates import year_from_iso

from server.schemas.geoloc import GeolocCommune, GeolocResponse


def _current_year() -> int:
    return date.today().year


def get_geoloc_bounds(conn: sqlite3.Connection) -> tuple[int, int]:
    annee_max = _current_year()
    rows = conn.execute(
        """
        SELECT date_naissance_min, date_deces_max
        FROM personnes
        WHERE date_naissance_min IS NOT NULL AND date_deces_max IS NOT NULL
        """
    )
    years: list[int] = []
    for row in rows:
        y_min = year_from_iso(row["date_naissance_min"])
        y_max = year_from_iso(row["date_deces_max"])
        if y_min is not None:
            years.append(y_min)
        if y_max is not None:
            years.append(y_max)
    if not years:
        return annee_max, annee_max
    return min(years), annee_max


def _personne_vivante_en(
    annee: int,
    birth_min: str | None,
    death_max: str | None,
) -> bool:
    if not birth_min or not death_max:
        return False
    birth_y = year_from_iso(birth_min)
    death_y = year_from_iso(death_max)
    if birth_y is None or death_y is None:
        return False
    return birth_y <= annee <= death_y


def get_geoloc(conn: sqlite3.Connection, annee: int) -> GeolocResponse:
    annee_min, annee_max = get_geoloc_bounds(conn)
    annee = max(annee_min, min(annee_max, annee))

    rows = conn.execute(
        """
        SELECT
            p.id_gedcom,
            p.date_naissance_min,
            p.date_deces_max,
            l.id AS lieu_id,
            l.commune,
            l.departement,
            l.latitude,
            l.longitude
        FROM personnes p
        JOIN evenements eb ON eb.id_personne = p.id_gedcom AND eb.type = 'NAISSANCE'
        JOIN lieux l ON l.id = eb.id_lieu
        WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
          AND p.date_naissance_min IS NOT NULL
          AND p.date_deces_max IS NOT NULL
        """
    )

    counts: dict[int, dict] = {}
    nombre_personnes = 0
    for row in rows:
        if not _personne_vivante_en(
            annee,
            row["date_naissance_min"],
            row["date_deces_max"],
        ):
            continue
        nombre_personnes += 1
        lid = int(row["lieu_id"])
        bucket = counts.get(lid)
        if bucket is None:
            counts[lid] = {
                "lieu_id": lid,
                "commune": row["commune"] or "?",
                "departement": row["departement"],
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "nombre": 1,
            }
        else:
            bucket["nombre"] += 1

    communes = [
        GeolocCommune(**data)
        for data in sorted(counts.values(), key=lambda c: (-c["nombre"], c["commune"]))
    ]
    return GeolocResponse(
        annee=annee,
        annee_min=annee_min,
        annee_max=annee_max,
        nombre_personnes=nombre_personnes,
        communes=communes,
    )
