"""Carte géoloc : personnes vivantes par année, regroupées par commune."""

from __future__ import annotations

import sqlite3
from datetime import date

from gedcom_dates import is_full_gedcom_date, year_from_iso

from server.schemas.geoloc import GeolocCommune, GeolocResponse


def _current_year() -> int:
    return date.today().year


def get_geoloc_bounds(conn: sqlite3.Connection) -> tuple[int, int]:
    annee_max = _current_year()
    rows = conn.execute(
        """
        SELECT date_iso, date_brute
        FROM evenements
        WHERE type IN ('NAISSANCE', 'DECES')
          AND date_iso IS NOT NULL
        """
    )
    years: list[int] = []
    for row in rows:
        if not is_full_gedcom_date(row["date_brute"]):
            continue
        y = year_from_iso(row["date_iso"])
        if y is not None:
            years.append(y)
    if not years:
        return annee_max, annee_max
    return min(years), annee_max


def _personne_vivante_en(
    annee: int,
    birth_iso: str | None,
    birth_brute: str | None,
    death_iso: str | None,
    death_brute: str | None,
) -> bool:
    if not is_full_gedcom_date(birth_brute):
        return False
    birth_year = year_from_iso(birth_iso)
    if birth_year is None or birth_year > annee:
        return False
    if death_iso and is_full_gedcom_date(death_brute):
        death_year = year_from_iso(death_iso)
        if death_year is not None and death_year < annee:
            return False
    return True


def get_geoloc(conn: sqlite3.Connection, annee: int) -> GeolocResponse:
    annee_min, annee_max = get_geoloc_bounds(conn)
    annee = max(annee_min, min(annee_max, annee))

    rows = conn.execute(
        """
        SELECT
            p.id_gedcom,
            eb.date_iso AS birth_iso,
            eb.date_brute AS birth_brute,
            ed.date_iso AS death_iso,
            ed.date_brute AS death_brute,
            l.id AS lieu_id,
            l.commune,
            l.departement,
            l.latitude,
            l.longitude
        FROM personnes p
        JOIN evenements eb ON eb.id_personne = p.id_gedcom AND eb.type = 'NAISSANCE'
        JOIN lieux l ON l.id = eb.id_lieu
        LEFT JOIN evenements ed ON ed.id_personne = p.id_gedcom AND ed.type = 'DECES'
        WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
        """
    )

    counts: dict[int, dict] = {}
    nombre_personnes = 0
    for row in rows:
        if not _personne_vivante_en(
            annee,
            row["birth_iso"],
            row["birth_brute"],
            row["death_iso"],
            row["death_brute"],
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
