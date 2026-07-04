"""Liste et statistiques des warnings persistés."""

from __future__ import annotations

import sqlite3

from server.schemas.warnings import WarningLigne, WarningsListResponse, WarningsStatsResponse
from server.services.personnes import get_arbre

_EVENT_LABELS = {
    "NAISSANCE": "Naissance",
    "DECES": "Décès",
    "MARIAGE": "Mariage",
}


def _arbre_personne_ids(
    conn: sqlite3.Connection,
    ancre: str,
    ancetres: int,
    descendants: int,
) -> set[str]:
    arbre = get_arbre(conn, ancre, ancetres, descendants)
    if not arbre:
        return set()
    return {n.id_gedcom for n in arbre.noeuds}


def get_warnings_stats(
    conn: sqlite3.Connection,
    ancre: str,
    ancetres: int,
    descendants: int,
) -> WarningsStatsResponse:
    nombre_warning_total = conn.execute("SELECT COUNT(*) FROM warnings").fetchone()[0]
    zone_ids = _arbre_personne_ids(conn, ancre, ancetres, descendants)
    if not zone_ids:
        nombre_warning_zone = 0
    else:
        placeholders = ",".join("?" for _ in zone_ids)
        nombre_warning_zone = conn.execute(
            f"SELECT COUNT(*) FROM warnings WHERE id_gedcom IN ({placeholders})",
            tuple(zone_ids),
        ).fetchone()[0]
    return WarningsStatsResponse(
        nombre_warning_total=nombre_warning_total,
        nombre_warning_zone=nombre_warning_zone,
    )


def list_warnings(
    conn: sqlite3.Connection,
    *,
    zone: bool,
    ancre: str,
    ancetres: int,
    descendants: int,
) -> WarningsListResponse:
    zone_ids = _arbre_personne_ids(conn, ancre, ancetres, descendants) if zone else None

    sql = """
        SELECT
            w.id_gedcom,
            p.nom,
            p.prenoms,
            p.sexe,
            w.type_evenement,
            w.id_famille,
            w.code,
            w.message,
            w.detail,
            e.date_iso AS evt_date_iso,
            e.date_brute AS evt_date_brute,
            l.commune AS evt_lieu
        FROM warnings w
        JOIN personnes p ON p.id_gedcom = w.id_gedcom
        LEFT JOIN evenements e ON (
            (
                w.type_evenement = 'MARIAGE'
                AND e.id_famille = w.id_famille
                AND e.type = 'MARIAGE'
            )
            OR (
                w.type_evenement IN ('NAISSANCE', 'DECES')
                AND e.id_personne = w.id_gedcom
                AND e.type = w.type_evenement
            )
        )
        LEFT JOIN lieux l ON l.id = e.id_lieu
    """
    params: list[object] = []
    if zone_ids is not None:
        if not zone_ids:
            return WarningsListResponse(
                lignes=[],
                nombre_warning_total=conn.execute(
                    "SELECT COUNT(*) FROM warnings"
                ).fetchone()[0],
                nombre_warning_zone=0,
            )
        placeholders = ",".join("?" for _ in zone_ids)
        sql += f" WHERE w.id_gedcom IN ({placeholders})"
        params.extend(zone_ids)

    sql += """
        ORDER BY p.nom_tri, p.prenoms COLLATE NOCASE, w.type_evenement, w.code
    """

    from warning_rules import _format_date_jjmmaaaa

    lignes: list[WarningLigne] = []
    for row in conn.execute(sql, params):
        type_evt = row["type_evenement"]
        evt_label = _EVENT_LABELS.get(type_evt, type_evt)
        date_label = _format_date_jjmmaaaa(
            row["evt_date_iso"], row["evt_date_brute"]
        )
        lieu = (row["evt_lieu"] or "").strip() or None

        lignes.append(
            WarningLigne(
                id_gedcom=row["id_gedcom"],
                nom=row["nom"],
                prenoms=row["prenoms"],
                sexe=row["sexe"],
                type_evenement=type_evt,
                evenement_label=evt_label,
                evenement_date=date_label,
                evenement_lieu=lieu,
                code=row["code"],
                message=row["message"],
                detail=row["detail"],
            )
        )

    stats = get_warnings_stats(conn, ancre, ancetres, descendants)
    return WarningsListResponse(
        lignes=lignes,
        nombre_warning_total=stats.nombre_warning_total,
        nombre_warning_zone=stats.nombre_warning_zone,
    )
