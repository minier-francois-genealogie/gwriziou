"""Parse GEDCOM date strings to ISO (YYYY-MM-DD)."""

from __future__ import annotations

import re

MONTHS = {
    "JAN": "01",
    "FEB": "02",
    "MAR": "03",
    "APR": "04",
    "MAY": "05",
    "JUN": "06",
    "JUL": "07",
    "AUG": "08",
    "SEP": "09",
    "OCT": "10",
    "NOV": "11",
    "DEC": "12",
}


def parse_gedcom_dates(date_str: str | None) -> str | None:
    if not date_str:
        return None
    date_str = date_str.strip()
    date_str = re.sub(r"^(ABT|BEF|AFT|EST|CAL|FROM|TO)\s+", "", date_str, flags=re.I)
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_str):
        return date_str
    if re.fullmatch(r"\d{4}", date_str):
        return f"{date_str}-01-01"
    m = re.match(r"(\d{1,2})\s+([A-Z]{3})\s+(\d{4})", date_str.upper())
    if m:
        day, mon, year = m.groups()
        if mon not in MONTHS:
            return f"{year}-01-01"
        return f"{year}-{MONTHS[mon]}-{int(day):02d}"
    m = re.match(r"([A-Z]{3})\s+(\d{4})", date_str.upper())
    if m:
        mon, year = m.groups()
        if mon not in MONTHS:
            return f"{year}-01-01"
        return f"{year}-{MONTHS[mon]}-01"
    m = re.search(r"(\d{4})", date_str)
    if m:
        return f"{m.group(1)}-01-01"
    return None


_FULL_DATE_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_FULL_DATE_GEDCOM = re.compile(r"^\d{1,2}\s+[A-Z]{3}\s+\d{4}$", re.I)
_DATE_PREFIX = re.compile(r"^(ABT|BEF|AFT|EST|CAL|FROM|TO)\s+", re.I)


def is_full_gedcom_date(date_brute: str | None) -> bool:
    """Date complète (jour + mois + année) — exclut les approximations partielles."""
    if not date_brute or not date_brute.strip():
        return False
    cleaned = _DATE_PREFIX.sub("", date_brute.strip())
    return bool(_FULL_DATE_ISO.fullmatch(cleaned) or _FULL_DATE_GEDCOM.match(cleaned))


def year_from_iso(date_iso: str | None) -> int | None:
    if not date_iso or len(date_iso) < 4:
        return None
    try:
        return int(date_iso[:4])
    except ValueError:
        return None
