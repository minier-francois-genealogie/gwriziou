"""Lecture des comptes applicatifs (app/auth/accounts.json)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from paths import (
    AUTH_ACCOUNTS_FILE,
    AUTH_ACCOUNTS_RAW_URL,
    AUTH_ACCOUNTS_REL_PATH,
)

USER_AGENT = "genealogie-api/1.0"


def _load_json_remote() -> list[dict]:
    request = urllib.request.Request(
        AUTH_ACCOUNTS_RAW_URL,
        headers={"User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"{AUTH_ACCOUNTS_REL_PATH} doit être un tableau JSON")
    return data


def _load_accounts_raw() -> tuple[list[dict], str]:
    if AUTH_ACCOUNTS_FILE.is_file():
        data = json.loads(AUTH_ACCOUNTS_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError(f"{AUTH_ACCOUNTS_FILE} doit être un tableau JSON")
        return data, AUTH_ACCOUNTS_REL_PATH
    try:
        return _load_json_remote(), AUTH_ACCOUNTS_REL_PATH
    except (urllib.error.HTTPError, OSError) as exc:
        raise FileNotFoundError(
            f"Comptes introuvables : {AUTH_ACCOUNTS_FILE} ou {AUTH_ACCOUNTS_RAW_URL}"
        ) from exc


def list_accounts_public() -> tuple[list[dict], str]:
    rows, source = _load_accounts_raw()
    public: list[dict] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        email = (row.get("email") or "").strip()
        if not email:
            continue
        public.append(
            {
                "email": email,
                "nom": (row.get("nom") or "").strip(),
                "prenom": (row.get("prenom") or "").strip(),
                "role": (row.get("role") or "user").strip(),
                "actif": bool(row.get("actif", True)),
            }
        )
    return public, source


def hash_password(password: str) -> str:
    from argon2 import PasswordHasher

    return PasswordHasher().hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError

    try:
        PasswordHasher().verify(password_hash, password)
        return True
    except VerifyMismatchError:
        return False


def authenticate(email: str, password: str) -> dict | None:
    email_norm = email.strip().lower()
    if not email_norm or not password:
        return None
    try:
        rows, _source = _load_accounts_raw()
    except (FileNotFoundError, ValueError):
        return None
    for row in rows:
        if not isinstance(row, dict):
            continue
        row_email = (row.get("email") or "").strip().lower()
        if row_email != email_norm:
            continue
        if not bool(row.get("actif", True)):
            return None
        password_hash = (row.get("password_hash") or "").strip()
        if not password_hash or not verify_password(password_hash, password):
            return None
        return {
            "email": (row.get("email") or "").strip(),
            "nom": (row.get("nom") or "").strip(),
            "prenom": (row.get("prenom") or "").strip(),
            "role": (row.get("role") or "user").strip(),
            "actif": True,
        }
    return None
