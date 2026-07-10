"""Statistiques et agrégations pour le menu Analyse."""

from __future__ import annotations

import sqlite3
from collections import Counter, defaultdict

from gedcom_dates import year_from_iso

from server.schemas.analyse import (
    AnalyseStatsResponse,
    CompteParLabel,
    DecennieNoms,
    EvolutionNomsResponse,
    ProfessionNuageItem,
    ProfessionsNuageResponse,
)
from server.services.profession_mapping import (
    libelle_nuage_key,
    load_mapping_dict,
    resolve_libelle_nuage,
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


def _scope_personne_ids(
    conn: sqlite3.Connection,
    ancre: str,
    ancetres: int,
    descendants: int,
    zone: bool,
) -> set[str]:
    if not zone:
        return {row["id_gedcom"] for row in conn.execute("SELECT id_gedcom FROM personnes")}
    return _arbre_personne_ids(conn, ancre, ancetres, descendants)


def _zone_famille_ids(conn: sqlite3.Connection, zone_ids: set[str]) -> set[str]:
    if not zone_ids:
        return set()
    placeholders = ",".join("?" for _ in zone_ids)
    params = tuple(zone_ids)
    rows = conn.execute(
        f"""
        SELECT DISTINCT id_famille AS fid FROM famille_conjoints
        WHERE id_personne IN ({placeholders})
        UNION
        SELECT DISTINCT id_famille AS fid FROM famille_enfants
        WHERE id_enfant IN ({placeholders})
        """,
        params + params,
    )
    return {row["fid"] for row in rows}


def _scope_famille_ids(
    conn: sqlite3.Connection,
    scope_ids: set[str],
    zone: bool,
) -> set[str]:
    if not zone:
        return {row["id_gedcom"] for row in conn.execute("SELECT id_gedcom FROM familles")}
    return _zone_famille_ids(conn, scope_ids)


def _premier_prenom(prenoms: str | None) -> str | None:
    if not prenoms or not prenoms.strip():
        return None
    return prenoms.strip().split()[0]


def _decennie(year: int) -> int:
    return (year // 10) * 10


def _empty_stats(nombre_personnes_total: int) -> AnalyseStatsResponse:
    return AnalyseStatsResponse(
        nombre_personnes_total=nombre_personnes_total,
        nombre_personnes_zone=0,
        nombre_familles_zone=0,
        hommes_zone=0,
        femmes_zone=0,
        sexe_inconnu_zone=0,
        avec_profession_zone=0,
        avec_naissance_zone=0,
        avec_deces_zone=0,
        age_moyen_deces_zone=None,
        enfants_par_famille_moyen=None,
        enfants_par_famille_max=0,
    )


def get_analyse_stats(
    conn: sqlite3.Connection,
    ancre: str,
    ancetres: int,
    descendants: int,
    zone: bool = True,
) -> AnalyseStatsResponse:
    nombre_personnes_total = conn.execute("SELECT COUNT(*) FROM personnes").fetchone()[0]
    scope_ids = _scope_personne_ids(conn, ancre, ancetres, descendants, zone)
    if not scope_ids:
        return _empty_stats(nombre_personnes_total)

    placeholders = ",".join("?" for _ in scope_ids)
    params = tuple(scope_ids)
    rows = conn.execute(
        f"""
        SELECT sexe, profession, date_naissance_min, date_deces_max
        FROM personnes
        WHERE id_gedcom IN ({placeholders})
        """,
        params,
    ).fetchall()

    hommes = femmes = inconnu = 0
    avec_profession = avec_naissance = avec_deces = 0
    ages_deces: list[float] = []

    for row in rows:
        sexe = row["sexe"]
        if sexe == "M":
            hommes += 1
        elif sexe == "F":
            femmes += 1
        else:
            inconnu += 1
        if row["profession"]:
            avec_profession += 1
        if row["date_naissance_min"]:
            avec_naissance += 1
        if row["date_deces_max"]:
            avec_deces += 1
        naissance = year_from_iso(row["date_naissance_min"])
        deces = year_from_iso(row["date_deces_max"])
        if naissance is not None and deces is not None and deces >= naissance:
            ages_deces.append(float(deces - naissance))

    famille_ids = _scope_famille_ids(conn, scope_ids, zone)
    enfants_counts: list[int] = []
    if famille_ids:
        fam_placeholders = ",".join("?" for _ in famille_ids)
        fam_params = tuple(famille_ids)
        for row in conn.execute(
            f"""
            SELECT COUNT(*) AS n
            FROM famille_enfants
            WHERE id_famille IN ({fam_placeholders})
            GROUP BY id_famille
            """,
            fam_params,
        ):
            enfants_counts.append(int(row["n"]))

    return AnalyseStatsResponse(
        nombre_personnes_total=nombre_personnes_total,
        nombre_personnes_zone=len(scope_ids),
        nombre_familles_zone=len(famille_ids),
        hommes_zone=hommes,
        femmes_zone=femmes,
        sexe_inconnu_zone=inconnu,
        avec_profession_zone=avec_profession,
        avec_naissance_zone=avec_naissance,
        avec_deces_zone=avec_deces,
        age_moyen_deces_zone=(
            round(sum(ages_deces) / len(ages_deces), 1) if ages_deces else None
        ),
        enfants_par_famille_moyen=(
            round(sum(enfants_counts) / len(enfants_counts), 1) if enfants_counts else None
        ),
        enfants_par_famille_max=max(enfants_counts) if enfants_counts else 0,
    )


def get_professions_nuage(
    conn: sqlite3.Connection,
    ancre: str,
    ancetres: int,
    descendants: int,
    zone: bool = True,
) -> ProfessionsNuageResponse:
    nombre_personnes_total = conn.execute("SELECT COUNT(*) FROM personnes").fetchone()[0]
    scope_ids = _scope_personne_ids(conn, ancre, ancetres, descendants, zone)
    if not scope_ids:
        return ProfessionsNuageResponse(
            lignes=[],
            nombre_avec_profession=0,
            nombre_sans_profession=0,
            nombre_personnes_total=nombre_personnes_total,
            nombre_personnes_scope=0,
        )

    placeholders = ",".join("?" for _ in scope_ids)
    params = tuple(scope_ids)
    rows = conn.execute(
        f"""
        SELECT profession
        FROM personnes
        WHERE id_gedcom IN ({placeholders})
        """,
        params,
    ).fetchall()

    sans = 0
    effectif_par_key: Counter[str] = Counter()
    labels_par_key: dict[str, Counter[str]] = defaultdict(Counter)
    mapping = load_mapping_dict(conn)

    for row in rows:
        raw = (row["profession"] or "").strip()
        if not raw:
            sans += 1
            continue
        libelle = resolve_libelle_nuage(raw, mapping)
        key = libelle_nuage_key(libelle)
        effectif_par_key[key] += 1
        labels_par_key[key][libelle] += 1

    lignes: list[ProfessionNuageItem] = []
    for key, effectif in effectif_par_key.items():
        profession = labels_par_key[key].most_common(1)[0][0]
        lignes.append(ProfessionNuageItem(profession=profession, effectif=effectif))

    lignes.sort(key=lambda item: (-item.effectif, item.profession.casefold()))
    return ProfessionsNuageResponse(
        lignes=lignes,
        nombre_avec_profession=sum(effectif_par_key.values()),
        nombre_sans_profession=sans,
        nombre_personnes_total=nombre_personnes_total,
        nombre_personnes_scope=len(scope_ids),
    )


def _top_labels(counter: Counter[str], limit: int = 8) -> list[CompteParLabel]:
    return [
        CompteParLabel(label=label, effectif=effectif)
        for label, effectif in counter.most_common(limit)
    ]


def get_evolution_noms(
    conn: sqlite3.Connection,
    ancre: str,
    ancetres: int,
    descendants: int,
    zone: bool = True,
) -> EvolutionNomsResponse:
    nombre_personnes_total = conn.execute("SELECT COUNT(*) FROM personnes").fetchone()[0]
    scope_ids = _scope_personne_ids(conn, ancre, ancetres, descendants, zone)
    if not scope_ids:
        return EvolutionNomsResponse(
            par_decennie_famille=[],
            par_decennie_prenom=[],
            personnes_avec_date=0,
            personnes_sans_date=0,
            nombre_personnes_total=nombre_personnes_total,
            nombre_personnes_scope=0,
        )

    placeholders = ",".join("?" for _ in scope_ids)
    params = tuple(scope_ids)
    rows = conn.execute(
        f"""
        SELECT nom, prenoms, date_naissance_min
        FROM personnes
        WHERE id_gedcom IN ({placeholders})
        """,
        params,
    ).fetchall()

    famille_par_decennie: dict[int, Counter[str]] = defaultdict(Counter)
    prenom_par_decennie: dict[int, Counter[str]] = defaultdict(Counter)
    avec_date = sans_date = 0

    for row in rows:
        year = year_from_iso(row["date_naissance_min"])
        if year is None:
            sans_date += 1
            continue
        avec_date += 1
        decade = _decennie(year)
        nom = (row["nom"] or "").strip()
        if nom and nom != "?":
            famille_par_decennie[decade][nom] += 1
        prenom = _premier_prenom(row["prenoms"])
        if prenom:
            prenom_par_decennie[decade][prenom] += 1

    par_decennie_famille = [
        DecennieNoms(decennie=decennie, labels=_top_labels(counter))
        for decennie, counter in sorted(famille_par_decennie.items())
    ]
    par_decennie_prenom = [
        DecennieNoms(decennie=decennie, labels=_top_labels(counter))
        for decennie, counter in sorted(prenom_par_decennie.items())
    ]

    return EvolutionNomsResponse(
        par_decennie_famille=par_decennie_famille,
        par_decennie_prenom=par_decennie_prenom,
        personnes_avec_date=avec_date,
        personnes_sans_date=sans_date,
        nombre_personnes_total=nombre_personnes_total,
        nombre_personnes_scope=len(scope_ids),
    )
