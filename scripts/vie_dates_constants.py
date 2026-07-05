"""Constantes et calcul des bornes de vie (naissance min, décès max)."""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from datetime import date
from typing import Literal

from gedcom_dates import is_full_gedcom_date, year_from_iso

AGE_MIN_MARIAGE = 15
AGE_MAX_PROCREATION_HOMME = 70
AGE_MAX_PROCREATION_FEMME = 45
AGE_MAX = 110

ApproximationVie = Literal["EXACT", "ENVIRON", "SUPERIEUR_A", "INFERIEUR_A"]

# Codes stables — libellés IHM dans web/src/content/vieDatesRegles.ts
REGLE_NAISSANCE_MIN = Literal[
    "GEDCOM_COMPLET",
    "ACTE_COMPLET",
    "GEDCOM_ANNEE",
    "FEAT_MARIAGE",
    "FEAT_DECES",
    "FEAT_DERNIER_ENFANT_H",
    "FEAT_DERNIER_ENFANT_F",
]

REGLE_DECES_MAX = Literal[
    "GEDCOM_COMPLET",
    "ACTE_COMPLET",
    "GEDCOM_ANNEE",
    "FEAT_NAISSANCE_AGE_MAX",
    "FEAT_MARIAGE_AGE_MAX",
    "FEAT_PREMIER_ENFANT",
]

_YEAR_ONLY_BRUTE = re.compile(r"^\d{4}$")
_YEAR_ONLY_ISO = re.compile(r"^\d{4}-01-01$")


@dataclass(frozen=True)
class VieDatesCalc:
    date_naissance_min: str | None
    date_naissance_min_approximation: ApproximationVie | None
    date_naissance_min_regle: str | None
    date_deces_max: str | None
    date_deces_max_approximation: ApproximationVie | None
    date_deces_max_regle: str | None


def is_full_iso_date(date_iso: str | None) -> bool:
    if not date_iso or len(date_iso) < 10:
        return False
    parts = date_iso.split("-")
    if len(parts) != 3:
        return False
    _y, m, d = parts
    return m != "00" and d != "00"


def is_year_only_gedcom_date(
    date_brute: str | None, date_iso: str | None
) -> bool:
    if is_full_gedcom_date(date_brute):
        return False
    if date_brute and _YEAR_ONLY_BRUTE.fullmatch(date_brute.strip()):
        return True
    if date_iso and _YEAR_ONLY_ISO.fullmatch(date_iso):
        return True
    return False


def _iso(y: int, m: int, d: int) -> str:
    return f"{y:04d}-{m:02d}-{d:02d}"


def _year_start(y: int) -> str:
    return _iso(y, 1, 1)


def _year_end(y: int) -> str:
    return _iso(y, 12, 31)


def _subtract_years(date_iso: str, years: int) -> str:
    y, m, d = (int(x) for x in date_iso.split("-"))
    new_y = y - years
    max_day = calendar.monthrange(new_y, m)[1]
    d = min(d, max_day)
    return _iso(new_y, m, d)


def _death_max_from_child_year(child_year: int) -> str:
    return _year_end(child_year - AGE_MIN_MARIAGE + AGE_MAX)


def compute_vie_dates(
    *,
    sexe: str | None,
    birth_iso: str | None,
    birth_brute: str | None,
    death_iso: str | None,
    death_brute: str | None,
    acte_birth_iso: str | None,
    acte_death_iso: str | None,
    earliest_marriage_year: int | None,
    last_child_birth_iso: str | None,
    first_child_birth_iso: str | None,
) -> VieDatesCalc:
    birth_min, approx_birth, regle_birth = _compute_date_naissance_min(
        sexe=sexe,
        birth_iso=birth_iso,
        birth_brute=birth_brute,
        death_iso=death_iso,
        acte_birth_iso=acte_birth_iso,
        earliest_marriage_year=earliest_marriage_year,
        last_child_birth_iso=last_child_birth_iso,
    )
    death_max, approx_death, regle_death = _compute_date_deces_max(
        birth_iso=birth_iso,
        death_iso=death_iso,
        death_brute=death_brute,
        acte_death_iso=acte_death_iso,
        date_naissance_min=birth_min,
        earliest_marriage_year=earliest_marriage_year,
        first_child_birth_iso=first_child_birth_iso,
    )
    return VieDatesCalc(
        date_naissance_min=birth_min,
        date_naissance_min_approximation=approx_birth,
        date_naissance_min_regle=regle_birth,
        date_deces_max=death_max,
        date_deces_max_approximation=approx_death,
        date_deces_max_regle=regle_death,
    )


def _compute_date_naissance_min(
    *,
    sexe: str | None,
    birth_iso: str | None,
    birth_brute: str | None,
    death_iso: str | None,
    acte_birth_iso: str | None,
    earliest_marriage_year: int | None,
    last_child_birth_iso: str | None,
) -> tuple[str | None, ApproximationVie | None, str | None]:
    if birth_iso and is_full_gedcom_date(birth_brute):
        return birth_iso, "EXACT", "GEDCOM_COMPLET"

    if acte_birth_iso and is_full_iso_date(acte_birth_iso):
        return acte_birth_iso, "ENVIRON", "ACTE_COMPLET"

    if is_year_only_gedcom_date(birth_brute, birth_iso):
        y = year_from_iso(birth_iso)
        if y is not None:
            return _year_start(y), "SUPERIEUR_A", "GEDCOM_ANNEE"

    candidates: list[tuple[str, str]] = []

    if earliest_marriage_year is not None:
        candidates.append(
            (_year_start(earliest_marriage_year - AGE_MIN_MARIAGE), "FEAT_MARIAGE")
        )

    death_y = year_from_iso(death_iso)
    if death_y is not None:
        candidates.append((_year_start(death_y - AGE_MAX), "FEAT_DECES"))

    if last_child_birth_iso:
        if sexe == "M":
            delta = AGE_MAX_PROCREATION_HOMME
            regle = "FEAT_DERNIER_ENFANT_H"
        else:
            delta = AGE_MAX_PROCREATION_FEMME
            regle = "FEAT_DERNIER_ENFANT_F"
        if is_full_iso_date(last_child_birth_iso):
            candidates.append((_subtract_years(last_child_birth_iso, delta), regle))
        else:
            child_y = year_from_iso(last_child_birth_iso)
            if child_y is not None:
                candidates.append((_year_start(child_y - delta), regle))

    if not candidates:
        return None, None, None
    best_date, best_regle = max(candidates, key=lambda item: item[0])
    return best_date, "SUPERIEUR_A", best_regle


def _compute_date_deces_max(
    *,
    birth_iso: str | None,
    death_iso: str | None,
    death_brute: str | None,
    acte_death_iso: str | None,
    date_naissance_min: str | None,
    earliest_marriage_year: int | None,
    first_child_birth_iso: str | None,
) -> tuple[str | None, ApproximationVie | None, str | None]:
    if death_iso and is_full_gedcom_date(death_brute):
        return death_iso, "EXACT", "GEDCOM_COMPLET"

    if acte_death_iso and is_full_iso_date(acte_death_iso):
        return acte_death_iso, "ENVIRON", "ACTE_COMPLET"

    if is_year_only_gedcom_date(death_brute, death_iso):
        y = year_from_iso(death_iso)
        if y is not None:
            return _year_end(y), "INFERIEUR_A", "GEDCOM_ANNEE"

    candidates: list[tuple[str, str]] = []

    birth_y = year_from_iso(birth_iso) or year_from_iso(date_naissance_min)
    if birth_y is not None:
        candidates.append((_year_end(birth_y + AGE_MAX), "FEAT_NAISSANCE_AGE_MAX"))

    if earliest_marriage_year is not None:
        candidates.append(
            (
                _year_end(earliest_marriage_year - AGE_MIN_MARIAGE + AGE_MAX),
                "FEAT_MARIAGE_AGE_MAX",
            )
        )

    if first_child_birth_iso:
        child_y = year_from_iso(first_child_birth_iso)
        if child_y is not None:
            candidates.append(
                (_death_max_from_child_year(child_y), "FEAT_PREMIER_ENFANT")
            )

    if not candidates:
        return None, None, None
    best_date, best_regle = min(candidates, key=lambda item: item[0])
    return best_date, "INFERIEUR_A", best_regle


def is_probably_alive(
    date_deces_max: str | None, *, today: date | None = None
) -> bool:
    """Borne décès dans le futur → personne probablement encore vivante."""
    if not date_deces_max:
        return False
    ref = (today or date.today()).isoformat()
    return date_deces_max > ref


def should_warn_manque_borne_deces(
    calc: VieDatesCalc, *, today: date | None = None
) -> bool:
    """Pas de warning décès si la borne calculée est dans le futur."""
    if is_probably_alive(calc.date_deces_max, today=today):
        return False
    return calc.date_deces_max is None
