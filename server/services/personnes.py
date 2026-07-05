"""Requêtes métier personnes, relations, arbre."""

from __future__ import annotations

import re

import sqlite3

from act_path_normalize import ascii_fold

from server.schemas.personnes import (
    ActeResume,
    ActesPersonne,
    ArbreResponse,
    AreteArbre,
    EvenementArbre,
    EvenementResume,
    MariageResume,
    NoeudArbre,
    NoeudUnion,
    PersonneDetail,
    PersonneResume,
    PhotoPersonne,
    RelationsPersonne,
    RelationResume,
    WarningEvenement,
)


def _evenement_row(row: sqlite3.Row | None) -> EvenementResume | None:
    if not row or not any(row["date_iso"] or row["date_brute"] or row["commune"]):
        return None
    return EvenementResume(
        date=row["date_iso"],
        date_brute=row["date_brute"],
        lieu=row["commune"],
        departement=row["departement"],
    )


def _relation_row(conn: sqlite3.Connection, row: sqlite3.Row) -> RelationResume:
    id_gedcom = row["id_gedcom"]
    return RelationResume(
        id_gedcom=id_gedcom,
        nom=row["nom"],
        prenoms=row["prenoms"],
        sexe=row["sexe"] if "sexe" in row.keys() else None,
        role=row["role"] if "role" in row.keys() else None,
        naissance=_fetch_evenement(conn, id_gedcom, "NAISSANCE"),
        deces=_fetch_evenement(conn, id_gedcom, "DECES"),
        photos=_has_photos(conn, id_gedcom),
    )


def _fetch_evenement(
    conn: sqlite3.Connection, id_personne: str, type_evenement: str
) -> EvenementResume | None:
    row = conn.execute(
        """
        SELECT e.date_iso, e.date_brute, l.commune, l.departement
        FROM evenements e
        LEFT JOIN lieux l ON l.id = e.id_lieu
        WHERE e.id_personne = ? AND e.type = ?
        """,
        (id_personne, type_evenement),
    ).fetchone()
    return _evenement_row(row)


_ACTE_DATE_RE = re.compile(r"__[NMD]__(\d{4}(?:-\d{2}(?:-\d{2})?)?)__")

_ACTE_SELECT = """
    SELECT type, url, date_acte_iso, commune, nom_fichier
    FROM actes
    WHERE id_gedcom = ?
    ORDER BY type, id
"""


def _date_brute_from_nom_fichier(nom_fichier: str) -> str | None:
    match = _ACTE_DATE_RE.search(nom_fichier)
    return match.group(1) if match else None


def _acte_row(row: sqlite3.Row) -> ActeResume:
    return ActeResume(
        url=row["url"],
        type=row["type"],
        date=row["date_acte_iso"],
        date_brute=_date_brute_from_nom_fichier(row["nom_fichier"])
        or row["date_acte_iso"],
        lieu=row["commune"],
    )


def _fetch_mariage_acte_famille(
    conn: sqlite3.Connection, id_gedcom: str, id_famille: str
) -> ActeResume | None:
    row = conn.execute(
        """
        SELECT a.type, a.url, a.date_acte_iso, a.commune, a.nom_fichier
        FROM actes a
        JOIN famille_conjoints fc ON fc.id_personne = a.id_gedcom
        WHERE fc.id_famille = ? AND a.id_gedcom = ? AND a.type = 'M'
        ORDER BY a.id
        LIMIT 1
        """,
        (id_famille, id_gedcom),
    ).fetchone()
    return _acte_row(row) if row else None


def _fetch_mariage_acte_union(
    conn: sqlite3.Connection, id_gedcom: str
) -> ActeResume | None:
    """Acte de mariage rattaché à un conjoint de la même union."""
    row = conn.execute(
        """
        SELECT a.type, a.url, a.date_acte_iso, a.commune, a.nom_fichier
        FROM actes a
        JOIN famille_conjoints fc ON fc.id_personne = a.id_gedcom
        JOIN famille_conjoints moi ON moi.id_famille = fc.id_famille
        WHERE moi.id_personne = ? AND a.type = 'M'
        LIMIT 1
        """,
        (id_gedcom,),
    ).fetchone()
    return _acte_row(row) if row else None


def _fetch_acte(
    conn: sqlite3.Connection, id_gedcom: str, type_acte: str
) -> ActeResume | None:
    row = conn.execute(
        """
        SELECT type, url, date_acte_iso, commune, nom_fichier
        FROM actes
        WHERE id_gedcom = ? AND type = ?
        ORDER BY id
        LIMIT 1
        """,
        (id_gedcom, type_acte),
    ).fetchone()
    return _acte_row(row) if row else None


def _fetch_actes(conn: sqlite3.Connection, id_gedcom: str) -> ActesPersonne:
    actes = ActesPersonne()
    mapping = {"N": "naissance", "M": "mariage", "D": "deces"}
    for row in conn.execute(_ACTE_SELECT, (id_gedcom,)):
        field = mapping.get(row["type"])
        if field and getattr(actes, field) is None:
            setattr(actes, field, _acte_row(row))
    if actes.mariage is None:
        actes.mariage = _fetch_mariage_acte_union(conn, id_gedcom)
    return actes


def _fetch_photos(conn: sqlite3.Connection, id_gedcom: str) -> list[PhotoPersonne]:
    return [
        PhotoPersonne(url=row["url"], suffixe=row["suffixe"])
        for row in conn.execute(
            """
            SELECT url, suffixe
            FROM photos
            WHERE id_gedcom = ?
            ORDER BY suffixe COLLATE NOCASE, nom_fichier
            """,
            (id_gedcom,),
        )
    ]


def _has_photos(conn: sqlite3.Connection, id_gedcom: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM photos WHERE id_gedcom = ? LIMIT 1",
        (id_gedcom,),
    ).fetchone()
    return row is not None


_PARENT_ORDER = """
    CASE fc.role WHEN 'epoux' THEN 0 WHEN 'epouse' THEN 1 ELSE 2 END,
    CASE p.sexe WHEN 'M' THEN 0 WHEN 'F' THEN 1 ELSE 2 END,
    fc.id_personne
"""

_CHILD_BIRTH_ORDER = """
    MIN(CASE WHEN e.date_tri IS NULL THEN 1 ELSE 0 END),
    MIN(e.date_tri),
    MIN(fe.ordre),
    fe.id_enfant
"""


def _fetch_relations(conn: sqlite3.Connection, id_gedcom: str) -> RelationsPersonne:
    relations = RelationsPersonne()
    person = conn.execute(
        "SELECT id_famille_enfant FROM personnes WHERE id_gedcom = ?",
        (id_gedcom,),
    ).fetchone()
    famc = person["id_famille_enfant"] if person else None

    if famc:
        for row in conn.execute(
            """
            SELECT p.id_gedcom, p.nom, p.prenoms, p.sexe, fc.role
            FROM famille_conjoints fc
            JOIN personnes p ON p.id_gedcom = fc.id_personne
            WHERE fc.id_famille = ?
            ORDER BY """ + _PARENT_ORDER + """
            """,
            (famc,),
        ):
            relations.parents.append(_relation_row(conn, row))

        for row in conn.execute(
            """
            SELECT p.id_gedcom, p.nom, p.prenoms, p.sexe
            FROM famille_enfants fe
            JOIN personnes p ON p.id_gedcom = fe.id_enfant
            LEFT JOIN evenements e ON e.id_personne = fe.id_enfant AND e.type = 'NAISSANCE'
            WHERE fe.id_famille = ? AND fe.id_enfant != ?
            GROUP BY p.id_gedcom
            ORDER BY MIN(CASE WHEN e.date_tri IS NULL THEN 1 ELSE 0 END),
                     MIN(e.date_tri),
                     MIN(fe.ordre),
                     p.id_gedcom
            """,
            (famc, id_gedcom),
        ):
            relations.fratrie.append(_relation_row(conn, row))

    for row in conn.execute(
        """
        SELECT p.id_gedcom, p.nom, p.prenoms, p.sexe
        FROM personne_unions pu
        JOIN famille_enfants fe ON fe.id_famille = pu.id_famille
        JOIN personnes p ON p.id_gedcom = fe.id_enfant
        LEFT JOIN evenements e ON e.id_personne = fe.id_enfant AND e.type = 'NAISSANCE'
        WHERE pu.id_personne = ?
        GROUP BY p.id_gedcom
        ORDER BY MIN(CASE WHEN e.date_tri IS NULL THEN 1 ELSE 0 END),
                 MIN(e.date_tri),
                 MIN(fe.ordre),
                 p.id_gedcom
        """,
        (id_gedcom,),
    ):
        relations.enfants.append(_relation_row(conn, row))

    for row in conn.execute(
        """
        SELECT DISTINCT p.id_gedcom, p.nom, p.prenoms, p.sexe, fc.role
        FROM personne_unions pu
        JOIN famille_conjoints fc ON fc.id_famille = pu.id_famille
        JOIN personnes p ON p.id_gedcom = fc.id_personne
        WHERE pu.id_personne = ? AND fc.id_personne != ?
        ORDER BY p.nom, p.prenoms
        """,
        (id_gedcom, id_gedcom),
    ):
        relations.conjoints.append(_relation_row(conn, row))

    return relations


def _fetch_mariages(conn: sqlite3.Connection, id_gedcom: str) -> list[MariageResume]:
    mariages: list[MariageResume] = []
    for row in conn.execute(
        """
        SELECT pu.id_famille, e.date_iso, e.date_brute, l.commune, l.departement
        FROM personne_unions pu
        JOIN evenements e ON e.id_famille = pu.id_famille AND e.type = 'MARIAGE'
        LEFT JOIN lieux l ON l.id = e.id_lieu
        WHERE pu.id_personne = ?
        ORDER BY e.date_tri, pu.id_famille
        """,
        (id_gedcom,),
    ):
        conjoint_row = conn.execute(
            """
            SELECT p.id_gedcom, p.nom, p.prenoms, p.sexe, fc.role
            FROM famille_conjoints fc
            JOIN personnes p ON p.id_gedcom = fc.id_personne
            WHERE fc.id_famille = ? AND fc.id_personne != ?
            LIMIT 1
            """,
            (row["id_famille"], id_gedcom),
        ).fetchone()
        conjoint = _relation_row(conn, conjoint_row) if conjoint_row else None
        mariages.append(
            MariageResume(
                date=row["date_iso"],
                date_brute=row["date_brute"],
                lieu=row["commune"],
                conjoint=conjoint,
            )
        )
    return mariages


def _has_gedcom_evt(evt: EvenementResume | None) -> bool:
    if not evt:
        return False
    return bool(evt.date or evt.date_brute)


def _fetch_vie_dates_row(
    conn: sqlite3.Connection, id_gedcom: str
) -> dict[str, object]:
    row = conn.execute(
        """
        SELECT date_naissance_min, date_naissance_min_approximation,
               date_naissance_min_regle,
               date_deces_max, date_deces_max_approximation,
               date_deces_max_regle
        FROM personnes WHERE id_gedcom = ?
        """,
        (id_gedcom,),
    ).fetchone()
    if not row:
        return {
            "date_naissance_min": None,
            "date_naissance_min_approximation": None,
            "date_naissance_min_regle": None,
            "date_deces_max": None,
            "date_deces_max_approximation": None,
            "date_deces_max_regle": None,
        }
    return {
        "date_naissance_min": row["date_naissance_min"],
        "date_naissance_min_approximation": row["date_naissance_min_approximation"],
        "date_naissance_min_regle": row["date_naissance_min_regle"],
        "date_deces_max": row["date_deces_max"],
        "date_deces_max_approximation": row["date_deces_max_approximation"],
        "date_deces_max_regle": row["date_deces_max_regle"],
    }


def get_personne(conn: sqlite3.Connection, id_gedcom: str) -> PersonneDetail | None:
    row = conn.execute(
        "SELECT id_gedcom, nom, prenoms, sexe, profession FROM personnes WHERE id_gedcom = ?",
        (id_gedcom,),
    ).fetchone()
    if not row:
        return None

    naissance = _fetch_evenement(conn, id_gedcom, "NAISSANCE")
    deces = _fetch_evenement(conn, id_gedcom, "DECES")
    vie = _fetch_vie_dates_row(conn, id_gedcom)

    return PersonneDetail(
        id_gedcom=row["id_gedcom"],
        nom=row["nom"],
        prenoms=row["prenoms"],
        sexe=row["sexe"],
        profession=row["profession"],
        naissance=naissance,
        deces=deces,
        naissance_gedcom=_has_gedcom_evt(naissance),
        deces_gedcom=_has_gedcom_evt(deces),
        **vie,
        mariages=_fetch_mariages(conn, id_gedcom),
        actes=_fetch_actes(conn, id_gedcom),
        evenements=_build_evenements_arbre(
            conn,
            id_gedcom,
            include_naissances_enfants=True,
            exclude_warning_codes=_UI_EXCLUDED_WARNING_CODES,
        ),
        photos=_fetch_photos(conn, id_gedcom),
        relations=_fetch_relations(conn, id_gedcom),
    )


def _annee(date_iso: str | None) -> str | None:
    if not date_iso or len(date_iso) < 4:
        return None
    return date_iso[:4]


_GEDCOM_MONTHS = {
    "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04",
    "MAY": "05", "JUN": "06", "JUL": "07", "AUG": "08",
    "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12",
}


def _format_date_jjmmaaaa(
    date_iso: str | None, date_brute: str | None
) -> str | None:
    if date_iso:
        if len(date_iso) >= 10 and date_iso[4] == "-":
            parts = date_iso.split("-")
            if len(parts) >= 3 and len(parts[0]) == 4:
                return f"{parts[2]}/{parts[1]}/{parts[0]}"
        if len(date_iso) == 7:
            y, m = date_iso.split("-")
            return f"{m}/{y}"
        if len(date_iso) == 4:
            return date_iso
    if date_brute:
        m = re.match(r"^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$", date_brute.strip(), re.I)
        if m:
            month = _GEDCOM_MONTHS.get(m.group(2).upper())
            if month:
                return f"{int(m.group(1)):02d}/{month}/{m.group(3)}"
        if re.match(r"^\d{4}$", date_brute.strip()):
            return date_brute.strip()
    return date_brute.strip() if date_brute else date_iso


# Warnings masqués dans l'arbre et la fiche (icône d'acte grisée = signal visuel).
_UI_EXCLUDED_WARNING_CODES = frozenset({"MANQUE_ACTE"})


def _warnings_key(type_arbre: str, id_famille: str | None = None) -> tuple[str, str]:
    mapping = {"naissance": "NAISSANCE", "deces": "DECES", "mariage": "MARIAGE"}
    return mapping.get(type_arbre, type_arbre.upper()), id_famille or ""


def _fetch_warnings_map(
    conn: sqlite3.Connection,
    id_gedcom: str,
    *,
    exclude_codes: frozenset[str] | None = None,
) -> dict[tuple[str, str], list[WarningEvenement]]:
    rows = conn.execute(
        """
        SELECT type_evenement, id_famille, code, message, detail
        FROM warnings
        WHERE id_gedcom = ?
        ORDER BY type_evenement, code
        """,
        (id_gedcom,),
    )
    out: dict[tuple[str, str], list[WarningEvenement]] = {}
    for row in rows:
        if exclude_codes and row["code"] in exclude_codes:
            continue
        key = (row["type_evenement"], row["id_famille"] or "")
        out.setdefault(key, []).append(
            WarningEvenement(
                code=row["code"],
                message=row["message"],
                detail=row["detail"],
            )
        )
    return out


def _evenement_from_resume(
    type_: str,
    evt: EvenementResume | None,
    acte: ActeResume | None,
    *,
    id_famille: str | None = None,
    conjoint: RelationResume | None = None,
    enfant: RelationResume | None = None,
    warnings_map: dict[tuple[str, str], list[WarningEvenement]] | None = None,
) -> EvenementArbre | None:
    date_iso = evt.date if evt else None
    date_brute = evt.date_brute if evt else None
    lieu = evt.lieu if evt else None
    departement = evt.departement if evt else None
    if not (date_iso or date_brute or lieu or acte):
        return None
    evt_key = _warnings_key(type_, id_famille)
    warnings = list((warnings_map or {}).get(evt_key, []))
    return EvenementArbre(
        type=type_,
        date=date_iso,
        date_brute=date_brute,
        lieu=lieu,
        departement=departement,
        acte=acte,
        warnings=warnings,
        id_famille=id_famille,
        conjoint=conjoint,
        enfant=enfant,
    )


def _empty_evenement(type_: str) -> EvenementArbre:
    return EvenementArbre(type=type_)


def _build_evenements_arbre(
    conn: sqlite3.Connection,
    id_gedcom: str,
    *,
    include_naissances_enfants: bool = False,
    exclude_warning_codes: frozenset[str] | None = None,
) -> list[EvenementArbre]:
    actes = _fetch_actes(conn, id_gedcom)
    warnings_map = _fetch_warnings_map(
        conn, id_gedcom, exclude_codes=exclude_warning_codes
    )
    evenements: list[EvenementArbre] = []

    naissance = _fetch_evenement(conn, id_gedcom, "NAISSANCE")
    evenements.append(
        _evenement_from_resume(
            "naissance", naissance, actes.naissance, warnings_map=warnings_map
        )
        or _empty_evenement("naissance")
    )

    mariages: list[EvenementArbre] = []
    for row in conn.execute(
        """
        SELECT pu.id_famille, e.date_iso, e.date_brute, l.commune, l.departement
        FROM personne_unions pu
        JOIN evenements e ON e.id_famille = pu.id_famille AND e.type = 'MARIAGE'
        LEFT JOIN lieux l ON l.id = e.id_lieu
        WHERE pu.id_personne = ?
        ORDER BY e.date_tri, pu.id_famille
        """,
        (id_gedcom,),
    ):
        conjoint_row = conn.execute(
            """
            SELECT p.id_gedcom, p.nom, p.prenoms, p.sexe, fc.role
            FROM famille_conjoints fc
            JOIN personnes p ON p.id_gedcom = fc.id_personne
            WHERE fc.id_famille = ? AND fc.id_personne != ?
            LIMIT 1
            """,
            (row["id_famille"], id_gedcom),
        ).fetchone()
        conjoint = _relation_row(conn, conjoint_row) if conjoint_row else None
        mariage_evt = EvenementResume(
            date=row["date_iso"],
            date_brute=row["date_brute"],
            lieu=row["commune"],
            departement=row["departement"],
        )
        acte_m = _fetch_mariage_acte_famille(conn, id_gedcom, row["id_famille"])
        evt_m = _evenement_from_resume(
            "mariage",
            mariage_evt,
            acte_m,
            id_famille=row["id_famille"],
            conjoint=conjoint,
            warnings_map=warnings_map,
        )
        if evt_m:
            mariages.append(evt_m)
    evenements.extend(mariages if mariages else [_empty_evenement("mariage")])

    if include_naissances_enfants:
        for row in conn.execute(
            """
            SELECT p.id_gedcom, p.nom, p.prenoms, p.sexe
            FROM personne_unions pu
            JOIN famille_enfants fe ON fe.id_famille = pu.id_famille
            JOIN personnes p ON p.id_gedcom = fe.id_enfant
            LEFT JOIN evenements e ON e.id_personne = fe.id_enfant AND e.type = 'NAISSANCE'
            WHERE pu.id_personne = ?
            GROUP BY p.id_gedcom
            ORDER BY MIN(CASE WHEN e.date_tri IS NULL THEN 1 ELSE 0 END),
                     MIN(e.date_tri),
                     MIN(fe.ordre),
                     p.id_gedcom
            """,
            (id_gedcom,),
        ):
            enfant = _relation_row(conn, row)
            acte_n = _fetch_acte(conn, enfant.id_gedcom, "N")
            evt_e = _evenement_from_resume(
                "naissance_enfant",
                enfant.naissance,
                acte_n,
                enfant=enfant,
            )
            evenements.append(
                evt_e or EvenementArbre(type="naissance_enfant", enfant=enfant)
            )

    deces = _fetch_evenement(conn, id_gedcom, "DECES")
    evenements.append(
        _evenement_from_resume(
            "deces", deces, actes.deces, warnings_map=warnings_map
        )
        or _empty_evenement("deces")
    )

    return evenements


def _noeud_arbre(conn: sqlite3.Connection, id_gedcom: str) -> NoeudArbre | None:
    row = conn.execute(
        """
        SELECT id_gedcom, nom, prenoms, sexe, profession,
               date_naissance_min, date_naissance_min_approximation,
               date_naissance_min_regle,
               date_deces_max, date_deces_max_approximation,
               date_deces_max_regle
        FROM personnes WHERE id_gedcom = ?
        """,
        (id_gedcom,),
    ).fetchone()
    if not row:
        return None
    naissance_row = conn.execute(
        "SELECT date_tri, date_iso, date_brute FROM evenements WHERE id_personne = ? AND type = 'NAISSANCE'",
        (id_gedcom,),
    ).fetchone()
    deces_row = conn.execute(
        "SELECT date_iso, date_brute FROM evenements WHERE id_personne = ? AND type = 'DECES'",
        (id_gedcom,),
    ).fetchone()
    naissance_tri = None
    if naissance_row:
        naissance_tri = naissance_row["date_tri"] or naissance_row["date_iso"]
    return NoeudArbre(
        id_gedcom=row["id_gedcom"],
        nom=row["nom"],
        prenoms=row["prenoms"],
        sexe=row["sexe"],
        profession=row["profession"],
        naissance_tri=naissance_tri,
        photos=_has_photos(conn, id_gedcom),
        evenements=_build_evenements_arbre(
            conn,
            id_gedcom,
            exclude_warning_codes=_UI_EXCLUDED_WARNING_CODES,
        ),
        date_naissance_min=row["date_naissance_min"],
        date_naissance_min_approximation=row["date_naissance_min_approximation"],
        date_naissance_min_regle=row["date_naissance_min_regle"],
        date_deces_max=row["date_deces_max"],
        date_deces_max_approximation=row["date_deces_max_approximation"],
        date_deces_max_regle=row["date_deces_max_regle"],
        naissance_gedcom=bool(
            naissance_row
            and (naissance_row["date_iso"] or naissance_row["date_brute"])
        ),
        deces_gedcom=bool(
            deces_row and (deces_row["date_iso"] or deces_row["date_brute"])
        ),
    )


def _parent_ids(conn: sqlite3.Connection, id_gedcom: str) -> list[str]:
    row = conn.execute(
        "SELECT id_famille_enfant FROM personnes WHERE id_gedcom = ?",
        (id_gedcom,),
    ).fetchone()
    if not row or not row["id_famille_enfant"]:
        return []
    return [
        r["id_personne"]
        for r in conn.execute(
            f"""
            SELECT fc.id_personne
            FROM famille_conjoints fc
            JOIN personnes p ON p.id_gedcom = fc.id_personne
            WHERE fc.id_famille = ?
            ORDER BY {_PARENT_ORDER}
            """,
            (row["id_famille_enfant"],),
        )
    ]


def _enfant_ids(conn: sqlite3.Connection, id_gedcom: str) -> list[str]:
    return [
        r["id_enfant"]
        for r in conn.execute(
            f"""
            SELECT fe.id_enfant
            FROM personne_unions pu
            JOIN famille_enfants fe ON fe.id_famille = pu.id_famille
            LEFT JOIN evenements e ON e.id_personne = fe.id_enfant AND e.type = 'NAISSANCE'
            WHERE pu.id_personne = ?
            GROUP BY fe.id_enfant
            ORDER BY {_CHILD_BIRTH_ORDER}
            """,
            (id_gedcom,),
        )
    ]


def _conjoint_ids(conn: sqlite3.Connection, id_gedcom: str) -> list[str]:
    return [
        r["id_personne"]
        for r in conn.execute(
            """
            SELECT p.id_gedcom AS id_personne
            FROM personne_unions pu
            JOIN famille_conjoints fc ON fc.id_famille = pu.id_famille
            JOIN personnes p ON p.id_gedcom = fc.id_personne
            LEFT JOIN evenements e ON e.id_famille = pu.id_famille AND e.type = 'MARIAGE'
            WHERE pu.id_personne = ? AND p.id_gedcom != ?
            GROUP BY p.id_gedcom
            ORDER BY MIN(CASE WHEN e.date_tri IS NULL THEN 1 ELSE 0 END),
                     MIN(e.date_tri),
                     p.id_gedcom
            """,
            (id_gedcom, id_gedcom),
        )
    ]


def _sibling_ids(conn: sqlite3.Connection, id_gedcom: str) -> list[str]:
    row = conn.execute(
        "SELECT id_famille_enfant FROM personnes WHERE id_gedcom = ?",
        (id_gedcom,),
    ).fetchone()
    if not row or not row["id_famille_enfant"]:
        return []
    return [
        r["id_personne"]
        for r in conn.execute(
            """
            SELECT p.id_gedcom AS id_personne
            FROM famille_enfants fe
            JOIN personnes p ON p.id_gedcom = fe.id_enfant
            LEFT JOIN evenements e ON e.id_personne = fe.id_enfant AND e.type = 'NAISSANCE'
            WHERE fe.id_famille = ? AND fe.id_enfant != ?
            GROUP BY p.id_gedcom
            ORDER BY MIN(CASE WHEN e.date_tri IS NULL THEN 1 ELSE 0 END),
                     MIN(e.date_tri),
                     MIN(fe.ordre),
                     p.id_gedcom
            """,
            (row["id_famille_enfant"], id_gedcom),
        )
    ]


def _famille_enfant_id(conn: sqlite3.Connection, id_gedcom: str) -> str | None:
    row = conn.execute(
        "SELECT id_famille_enfant FROM personnes WHERE id_gedcom = ?",
        (id_gedcom,),
    ).fetchone()
    if not row or not row["id_famille_enfant"]:
        return None
    return row["id_famille_enfant"]


def _parent_ids_for_famille(conn: sqlite3.Connection, id_famille: str) -> list[str]:
    return [
        r["id_personne"]
        for r in conn.execute(
            f"""
            SELECT fc.id_personne
            FROM famille_conjoints fc
            JOIN personnes p ON p.id_gedcom = fc.id_personne
            WHERE fc.id_famille = ?
            ORDER BY {_PARENT_ORDER}
            """,
            (id_famille,),
        )
    ]


def _enfant_ids_for_famille(conn: sqlite3.Connection, id_famille: str) -> list[str]:
    return [
        r["id_enfant"]
        for r in conn.execute(
            f"""
            SELECT fe.id_enfant
            FROM famille_enfants fe
            LEFT JOIN evenements e ON e.id_personne = fe.id_enfant AND e.type = 'NAISSANCE'
            WHERE fe.id_famille = ?
            GROUP BY fe.id_enfant
            ORDER BY {_CHILD_BIRTH_ORDER}
            """,
            (id_famille,),
        )
    ]


def _famille_ids_as_parent(conn: sqlite3.Connection, id_gedcom: str) -> list[str]:
    return [
        r["id_famille"]
        for r in conn.execute(
            """
            SELECT id_famille FROM personne_unions
            WHERE id_personne = ?
            ORDER BY id_famille
            """,
            (id_gedcom,),
        )
    ]


def _fetch_union_noeud(conn: sqlite3.Connection, id_famille: str) -> NoeudUnion:
    row = conn.execute(
        """
        SELECT e.date_iso, e.date_brute, l.commune
        FROM evenements e
        LEFT JOIN lieux l ON l.id = e.id_lieu
        WHERE e.id_famille = ? AND e.type = 'MARIAGE'
        """,
        (id_famille,),
    ).fetchone()
    acte_row = conn.execute(
        """
        SELECT a.type, a.url, a.date_acte_iso, a.commune, a.nom_fichier
        FROM actes a
        JOIN famille_conjoints fc ON fc.id_personne = a.id_gedcom
        WHERE fc.id_famille = ? AND a.type = 'M'
        LIMIT 1
        """,
        (id_famille,),
    ).fetchone()
    acte = _acte_row(acte_row) if acte_row else None
    return NoeudUnion(
        id_famille=id_famille,
        date=_annee(row["date_iso"]) if row and row["date_iso"] else None,
        date_brute=row["date_brute"] if row else None,
        lieu=row["commune"] if row else None,
        acte_m=acte is not None,
        acte=acte,
    )


def get_arbre(
    conn: sqlite3.Connection,
    id_gedcom: str,
    ancetres: int,
    descendants: int,
) -> ArbreResponse | None:
    if not conn.execute(
        "SELECT 1 FROM personnes WHERE id_gedcom = ?", (id_gedcom,)
    ).fetchone():
        return None

    noeuds: dict[str, NoeudArbre] = {}
    unions: dict[str, NoeudUnion] = {}
    aretes: list[AreteArbre] = []

    def add_person(pid: str) -> None:
        if pid in noeuds:
            return
        noeud = _noeud_arbre(conn, pid)
        if noeud:
            noeuds[pid] = noeud

    def add_union(id_famille: str) -> None:
        if id_famille in unions:
            return
        unions[id_famille] = _fetch_union_noeud(conn, id_famille)

    def link_union_epoux(id_famille: str) -> None:
        add_union(id_famille)
        for parent_id in _parent_ids_for_famille(conn, id_famille):
            add_person(parent_id)
            aretes.append(
                AreteArbre(de=parent_id, vers=id_famille, type="union_epoux")
            )

    def link_union(id_famille: str, child_ids: list[str]) -> None:
        link_union_epoux(id_famille)
        for cid in child_ids:
            add_person(cid)
            aretes.append(AreteArbre(de=id_famille, vers=cid, type="union_enfant"))

    def add_marriage_unions(pid: str) -> None:
        for id_famille in _famille_ids_as_parent(conn, pid):
            link_union_epoux(id_famille)

    def walk_ancestors(pid: str, depth: int) -> None:
        add_person(pid)
        if depth >= ancetres:
            return
        famc = _famille_enfant_id(conn, pid)
        if not famc:
            return
        link_union(famc, [pid])
        for parent_id in _parent_ids_for_famille(conn, famc):
            walk_ancestors(parent_id, depth + 1)

    def add_centre_siblings(centre_id: str) -> None:
        famc = _famille_enfant_id(conn, centre_id)
        if not famc:
            return
        for sibling_id in _sibling_ids(conn, centre_id):
            add_person(sibling_id)
            aretes.append(
                AreteArbre(de=famc, vers=sibling_id, type="union_enfant")
            )

    def walk_descendants(pid: str, depth: int) -> None:
        add_person(pid)
        add_marriage_unions(pid)
        if depth >= descendants:
            return
        for id_famille in _famille_ids_as_parent(conn, pid):
            child_ids = _enfant_ids_for_famille(conn, id_famille)
            if not child_ids:
                continue
            link_union(id_famille, child_ids)
            for child_id in child_ids:
                walk_descendants(child_id, depth + 1)

    walk_ancestors(id_gedcom, 0)
    add_centre_siblings(id_gedcom)
    walk_descendants(id_gedcom, 0)

    seen: set[tuple[str, str, str]] = set()
    unique_aretes: list[AreteArbre] = []
    for arete in aretes:
        key = (arete.de, arete.vers, arete.type)
        if key in seen:
            continue
        seen.add(key)
        unique_aretes.append(arete)

    return ArbreResponse(
        centre=id_gedcom,
        ancetres=ancetres,
        descendants=descendants,
        noeuds=list(noeuds.values()),
        unions=list(unions.values()),
        aretes=unique_aretes,
    )


def rechercher_personnes(
    conn: sqlite3.Connection,
    query: str,
    page: int,
    limit: int,
) -> tuple[int, list[PersonneResume]]:
    term = ascii_fold(query.strip()).lower()
    if not term:
        return 0, []

    pattern = f"%{term.replace(' ', '%')}%"
    total = conn.execute(
        "SELECT COUNT(*) FROM personnes WHERE texte_recherche LIKE ?",
        (pattern,),
    ).fetchone()[0]

    offset = (page - 1) * limit
    resultats: list[PersonneResume] = []
    for row in conn.execute(
        """
        SELECT p.id_gedcom, p.nom, p.prenoms, p.sexe, p.profession,
               p.date_naissance_min, p.date_naissance_min_approximation,
               p.date_naissance_min_regle,
               p.date_deces_max, p.date_deces_max_approximation,
               p.date_deces_max_regle,
               en.date_iso AS naissance_iso, en.date_brute AS naissance_brute,
               ln.commune AS lieu_naissance,
               ed.date_iso AS deces_iso, ed.date_brute AS deces_brute,
               ld.commune AS lieu_deces
        FROM personnes p
        LEFT JOIN evenements en ON en.id_personne = p.id_gedcom AND en.type = 'NAISSANCE'
        LEFT JOIN lieux ln ON ln.id = en.id_lieu
        LEFT JOIN evenements ed ON ed.id_personne = p.id_gedcom AND ed.type = 'DECES'
        LEFT JOIN lieux ld ON ld.id = ed.id_lieu
        WHERE p.texte_recherche LIKE ?
        ORDER BY p.nom, p.prenoms
        LIMIT ? OFFSET ?
        """,
        (pattern, limit, offset),
    ):
        resultats.append(
            PersonneResume(
                id_gedcom=row["id_gedcom"],
                nom=row["nom"],
                prenoms=row["prenoms"],
                sexe=row["sexe"],
                profession=row["profession"],
                naissance=_format_date_jjmmaaaa(
                    row["naissance_iso"], row["naissance_brute"]
                ),
                lieu_naissance=row["lieu_naissance"],
                deces=_format_date_jjmmaaaa(row["deces_iso"], row["deces_brute"]),
                lieu_deces=row["lieu_deces"],
                date_naissance_min=row["date_naissance_min"],
                date_naissance_min_approximation=row["date_naissance_min_approximation"],
                date_naissance_min_regle=row["date_naissance_min_regle"],
                date_deces_max=row["date_deces_max"],
                date_deces_max_approximation=row["date_deces_max_approximation"],
                date_deces_max_regle=row["date_deces_max_regle"],
                naissance_gedcom=bool(
                    row["naissance_iso"] or row["naissance_brute"]
                ),
                deces_gedcom=bool(row["deces_iso"] or row["deces_brute"]),
            )
        )
    return total, resultats
