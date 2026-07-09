"""Dirigeants français contextualisés pour une personne."""

from __future__ import annotations

from datetime import date

import sqlite3

from server.schemas.personnes import DirigeantFrance


def _format_periode(debut: str, fin: str) -> str:
    if debut == fin or not fin or fin == "????":
        return debut
    return f"{debut} – {fin}"


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


def get_dirigeants_france_personne(
    conn: sqlite3.Connection, id_gedcom: str
) -> list[DirigeantFrance]:
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

    dirigeants: list[DirigeantFrance] = []
    for d in conn.execute(
        """
        SELECT slug, nom, titre, debut, fin, photo_url
        FROM dirigeants_france
        ORDER BY debut, nom
        """
    ):
        if not _overlaps_life(birth_iso, death_iso, d["debut"], d["fin"]):
            continue
        dirigeants.append(
            DirigeantFrance(
                slug=d["slug"],
                nom=d["nom"],
                titre=d["titre"],
                debut=d["debut"],
                fin=d["fin"],
                periode=_format_periode(d["debut"], d["fin"]),
                photo_url=d["photo_url"],
            )
        )
    return dirigeants
