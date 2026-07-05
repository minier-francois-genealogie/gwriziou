"""Règles de warning GEDCOM vs acte (partagé import BDD + API)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from act_path_normalize import normalize_commune

_GEDCOM_MONTHS = {
    "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04",
    "MAY": "05", "JUN": "06", "JUL": "07", "AUG": "08",
    "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12",
}

WARNING_CODES = frozenset({
    "MANQUE_ACTE",
    "MANQUE_GED",
    "DATE_DIVERGENTE",
    "LIEU_DIVERGENTE",
})


@dataclass(frozen=True)
class WarningRecord:
    id_gedcom: str
    type_evenement: str  # NAISSANCE | DECES | MARIAGE
    id_famille: str  # "" si non applicable
    code: str
    message: str
    detail: str | None


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


def _has_date(date_iso: str | None, date_brute: str | None) -> bool:
    return bool(date_iso or (date_brute and date_brute.strip()))


def _has_lieu(lieu: str | None) -> bool:
    return bool(lieu and lieu.strip())


def _dates_coherent(date_iso: str | None, acte_date: str | None) -> bool:
    if not date_iso or not acte_date:
        return False
    if date_iso == acte_date:
        return True
    if acte_date.startswith(date_iso):
        return len(date_iso) >= len(acte_date)
    return False


def _lieux_differ(ged_lieu: str | None, acte_lieu: str | None) -> bool:
    g = normalize_commune(ged_lieu or "")
    a = normalize_commune(acte_lieu or "")
    if not g or not a:
        return False
    return g != a


def _gedcom_acte_detail(ged_part: str, acte_part: str) -> str:
    return f"GEDCOM : {ged_part}\nActe : {acte_part}"


def compute_event_warnings(
    *,
    id_gedcom: str,
    type_evenement: str,
    id_famille: str = "",
    gedcom_date_iso: str | None,
    gedcom_date_brute: str | None,
    gedcom_lieu: str | None,
    acte_date_iso: str | None,
    acte_date_brute: str | None,
    acte_lieu: str | None,
    has_acte: bool,
) -> list[WarningRecord]:
    """Calcule les warnings pour un événement (Option B, MANQUE_ACTE B1)."""
    ged_label = _format_date_jjmmaaaa(gedcom_date_iso, gedcom_date_brute) or "?"
    acte_label = _format_date_jjmmaaaa(acte_date_iso, acte_date_brute) or "?"
    ged_has_event = _has_date(gedcom_date_iso, gedcom_date_brute) or _has_lieu(gedcom_lieu)
    acte_has_data = has_acte and (
        _has_date(acte_date_iso, acte_date_brute) or _has_lieu(acte_lieu)
    )
    out: list[WarningRecord] = []

    # B1 : événement documenté en GEDCOM, pas d'acte raccordé en BDD
    if ged_has_event and not has_acte:
        out.append(
            WarningRecord(
                id_gedcom=id_gedcom,
                type_evenement=type_evenement,
                id_famille=id_famille,
                code="MANQUE_ACTE",
                message="Acte manquant",
                detail=None,
            )
        )
        return out

    if not has_acte:
        return out

    if acte_has_data and not _has_date(gedcom_date_iso, gedcom_date_brute) and not _has_lieu(
        gedcom_lieu
    ):
        out.append(
            WarningRecord(
                id_gedcom=id_gedcom,
                type_evenement=type_evenement,
                id_famille=id_famille,
                code="MANQUE_GED",
                message="Date/lieu GEDCOM manquant",
                detail=_gedcom_acte_detail("?", acte_label),
            )
        )

    if _has_date(gedcom_date_iso, gedcom_date_brute) and acte_date_iso:
        if not _dates_coherent(gedcom_date_iso, acte_date_iso):
            out.append(
                WarningRecord(
                    id_gedcom=id_gedcom,
                    type_evenement=type_evenement,
                    id_famille=id_famille,
                    code="DATE_DIVERGENTE",
                    message="Date GEDCOM ≠ date acte",
                    detail=_gedcom_acte_detail(ged_label, acte_label),
                )
            )

    if _lieux_differ(gedcom_lieu, acte_lieu):
        ged_l = (gedcom_lieu or "").strip()
        acte_l = (acte_lieu or "").strip()
        out.append(
            WarningRecord(
                id_gedcom=id_gedcom,
                type_evenement=type_evenement,
                id_famille=id_famille,
                code="LIEU_DIVERGENTE",
                message="Lieu GEDCOM ≠ lieu acte",
                detail=_gedcom_acte_detail(ged_l, acte_l),
            )
        )

    return out
