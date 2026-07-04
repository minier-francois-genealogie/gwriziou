#!/usr/bin/env python3
"""Normalize text for actes/ paths (ASCII, no accents, underscores).

GEDCOM, SQLite and the UI keep full UTF-8 (François, Ploërmel).
Only filesystem paths under actes/ use this module.
"""

from __future__ import annotations

import re
import unicodedata

INVALID_WIN_CHARS = re.compile(r'[<>:"/\\|?*]')
BRACKET_CHARS = re.compile(r"[\[\](){}]")
SEPARATORS = re.compile(r"[\s\-]+")

# Ligatures not fully split by NFD decomposition
_LIGATURES = str.maketrans({"œ": "oe", "Œ": "Oe", "æ": "ae", "Æ": "Ae"})


def ascii_fold(text: str) -> str:
    """Remove diacritics: François → Francois, Ploërmel → Ploermel, Sérent → Serent."""
    text = text.translate(_LIGATURES)
    nfd = unicodedata.normalize("NFD", text)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def strip_invalid(text: str) -> str:
    text = BRACKET_CHARS.sub("", text)
    text = INVALID_WIN_CHARS.sub("", text)
    return text.strip(" .,_")


def normalize_surname(raw: str) -> str:
    """Family name segment: ASCII, uppercase."""
    value = strip_invalid(ascii_fold(raw.strip()))
    return value.upper() or "X"


def normalize_given_part(raw: str) -> str:
    """Single given name token: ASCII, first letter uppercase."""
    value = strip_invalid(ascii_fold(raw.strip()))
    if not value:
        return ""
    return value[0].upper() + value[1:].lower()


def normalize_given_full(raw: str) -> str:
    """All given names: Francois_Xavier from 'François Xavier' or 'François-Xavier'."""
    parts = [normalize_given_part(p) for p in SEPARATORS.split(raw.strip()) if p.strip()]
    parts = [p for p in parts if p]
    return "_".join(parts)


def normalize_commune(raw: str) -> str:
    """Commune segment: ASCII, spaces and hyphens → underscores (Saint_Guyomard)."""
    if not raw:
        return "X"
    # PLAC may be "Augan,56800,…" — caller passes first field only
    value = raw.split(",")[0].strip()
    value = strip_invalid(ascii_fold(value))
    value = value.replace("-", "_").replace(" ", "_")
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "X"


def normalize_person_segment(value: str, *, kind: str) -> str:
    if kind == "surname":
        return normalize_surname(value)
    if kind == "given":
        return normalize_given_full(value)
    if kind == "commune":
        return normalize_commune(value)
    raise ValueError(f"Unknown kind: {kind}")
