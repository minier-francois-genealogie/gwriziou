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
