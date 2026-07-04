"""Normalisation des identifiants GEDCOM dans les URLs."""

from __future__ import annotations


def normalize_gedcom_id(raw: str) -> str:
    value = raw.strip()
    if not value:
        raise ValueError("Identifiant GEDCOM vide")
    if not value.startswith("@"):
        value = f"@{value}"
    if not value.endswith("@"):
        value = f"{value}@"
    return value
