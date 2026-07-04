"""Requêtes métier personnes, relations, arbre."""

from __future__ import annotations

import sqlite3

from act_path_normalize import ascii_fold

from server.schemas.personnes import (
    ActesPersonne,
    ArbreResponse,
    AreteArbre,
    EvenementResume,
    MariageResume,
    NoeudArbre,
    PersonneDetail,
    PersonneResume,
    PhotoPersonne,
    RelationsPersonne,
    RelationResume,
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


def _relation_row(row: sqlite3.Row) -> RelationResume:
    return RelationResume(
        id_gedcom=row["id_gedcom"],
        nom=row["nom"],
        prenoms=row["prenoms"],
        role=row["role"] if "role" in row.keys() else None,
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


def _fetch_actes(conn: sqlite3.Connection, id_gedcom: str) -> ActesPersonne:
    actes = ActesPersonne()
    mapping = {"N": "naissance_url", "M": "mariage_url", "D": "deces_url"}
    for row in conn.execute(
        "SELECT type, url FROM actes WHERE id_gedcom = ? ORDER BY type, id",
        (id_gedcom,),
    ):
        attr = mapping.get(row["type"])
        if attr and getattr(actes, attr) is None:
            setattr(actes, attr, row["url"])
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
            SELECT p.id_gedcom, p.nom, p.prenoms, fc.role
            FROM famille_conjoints fc
            JOIN personnes p ON p.id_gedcom = fc.id_personne
            WHERE fc.id_famille = ?
            ORDER BY fc.role
            """,
            (famc,),
        ):
            relations.parents.append(_relation_row(row))

        for row in conn.execute(
            """
            SELECT p.id_gedcom, p.nom, p.prenoms
            FROM famille_enfants fe
            JOIN personnes p ON p.id_gedcom = fe.id_enfant
            WHERE fe.id_famille = ? AND fe.id_enfant != ?
            ORDER BY fe.ordre, p.nom, p.prenoms
            """,
            (famc, id_gedcom),
        ):
            relations.fratrie.append(_relation_row(row))

    for row in conn.execute(
        """
        SELECT DISTINCT p.id_gedcom, p.nom, p.prenoms
        FROM personne_unions pu
        JOIN famille_enfants fe ON fe.id_famille = pu.id_famille
        JOIN personnes p ON p.id_gedcom = fe.id_enfant
        WHERE pu.id_personne = ?
        ORDER BY fe.ordre, p.nom, p.prenoms
        """,
        (id_gedcom,),
    ):
        relations.enfants.append(_relation_row(row))

    for row in conn.execute(
        """
        SELECT DISTINCT p.id_gedcom, p.nom, p.prenoms, fc.role
        FROM personne_unions pu
        JOIN famille_conjoints fc ON fc.id_famille = pu.id_famille
        JOIN personnes p ON p.id_gedcom = fc.id_personne
        WHERE pu.id_personne = ? AND fc.id_personne != ?
        ORDER BY p.nom, p.prenoms
        """,
        (id_gedcom, id_gedcom),
    ):
        relations.conjoints.append(_relation_row(row))

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
            SELECT p.id_gedcom, p.nom, p.prenoms, fc.role
            FROM famille_conjoints fc
            JOIN personnes p ON p.id_gedcom = fc.id_personne
            WHERE fc.id_famille = ? AND fc.id_personne != ?
            LIMIT 1
            """,
            (row["id_famille"], id_gedcom),
        ).fetchone()
        conjoint = _relation_row(conjoint_row) if conjoint_row else None
        mariages.append(
            MariageResume(
                date=row["date_iso"],
                date_brute=row["date_brute"],
                lieu=row["commune"],
                conjoint=conjoint,
            )
        )
    return mariages


def get_personne(conn: sqlite3.Connection, id_gedcom: str) -> PersonneDetail | None:
    row = conn.execute(
        "SELECT id_gedcom, nom, prenoms, sexe, profession FROM personnes WHERE id_gedcom = ?",
        (id_gedcom,),
    ).fetchone()
    if not row:
        return None

    return PersonneDetail(
        id_gedcom=row["id_gedcom"],
        nom=row["nom"],
        prenoms=row["prenoms"],
        sexe=row["sexe"],
        profession=row["profession"],
        naissance=_fetch_evenement(conn, id_gedcom, "NAISSANCE"),
        deces=_fetch_evenement(conn, id_gedcom, "DECES"),
        mariages=_fetch_mariages(conn, id_gedcom),
        actes=_fetch_actes(conn, id_gedcom),
        photos=_fetch_photos(conn, id_gedcom),
        relations=_fetch_relations(conn, id_gedcom),
    )


def _annee(date_iso: str | None) -> str | None:
    if not date_iso or len(date_iso) < 4:
        return None
    return date_iso[:4]


def _noeud_arbre(conn: sqlite3.Connection, id_gedcom: str) -> NoeudArbre | None:
    row = conn.execute(
        "SELECT id_gedcom, nom, prenoms, sexe, profession FROM personnes WHERE id_gedcom = ?",
        (id_gedcom,),
    ).fetchone()
    if not row:
        return None
    naissance = _fetch_evenement(conn, id_gedcom, "NAISSANCE")
    deces = _fetch_evenement(conn, id_gedcom, "DECES")
    actes = _fetch_actes(conn, id_gedcom)
    return NoeudArbre(
        id_gedcom=row["id_gedcom"],
        nom=row["nom"],
        prenoms=row["prenoms"],
        sexe=row["sexe"],
        profession=row["profession"],
        naissance=_annee(naissance.date if naissance else None),
        deces=_annee(deces.date if deces else None),
        actes={
            "n": actes.naissance_url is not None,
            "m": actes.mariage_url is not None,
            "d": actes.deces_url is not None,
            "p": _has_photos(conn, id_gedcom),
        },
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
            "SELECT id_personne FROM famille_conjoints WHERE id_famille = ?",
            (row["id_famille_enfant"],),
        )
    ]


def _enfant_ids(conn: sqlite3.Connection, id_gedcom: str) -> list[str]:
    return [
        r["id_enfant"]
        for r in conn.execute(
            """
            SELECT DISTINCT fe.id_enfant
            FROM personne_unions pu
            JOIN famille_enfants fe ON fe.id_famille = pu.id_famille
            WHERE pu.id_personne = ?
            ORDER BY fe.ordre
            """,
            (id_gedcom,),
        )
    ]


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
    aretes: list[AreteArbre] = []

    def add_person(pid: str) -> None:
        if pid in noeuds:
            return
        noeud = _noeud_arbre(conn, pid)
        if noeud:
            noeuds[pid] = noeud

    def walk_ancestors(pid: str, depth: int) -> None:
        add_person(pid)
        if depth >= ancetres:
            return
        for parent_id in _parent_ids(conn, pid):
            aretes.append(AreteArbre(de=parent_id, vers=pid, type="parent"))
            walk_ancestors(parent_id, depth + 1)

    def walk_descendants(pid: str, depth: int) -> None:
        add_person(pid)
        if depth >= descendants:
            return
        for child_id in _enfant_ids(conn, pid):
            aretes.append(AreteArbre(de=pid, vers=child_id, type="enfant"))
            walk_descendants(child_id, depth + 1)

    walk_ancestors(id_gedcom, 0)
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
               e.date_iso AS naissance_iso, l.commune AS lieu_naissance
        FROM personnes p
        LEFT JOIN evenements e ON e.id_personne = p.id_gedcom AND e.type = 'NAISSANCE'
        LEFT JOIN lieux l ON l.id = e.id_lieu
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
                naissance=_annee(row["naissance_iso"]),
                lieu_naissance=row["lieu_naissance"],
            )
        )
    return total, resultats
