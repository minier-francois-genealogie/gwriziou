"""Lecture / écriture des comptes applicatifs (app/comptes/{email}.json)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from paths import (
    AUTH_ACCOUNTS_DIR,
    AUTH_ACCOUNTS_REL_PREFIX,
    DATA_REPO_RAW_BASE,
    GITHUB_API_TREE_URL,
)
from server.services.github_data import (
    GitHubDataError,
    get_file,
    github_write_configured,
    list_files,
    put_file,
)

USER_AGENT = "genealogie-api/1.0"


def account_filename(email: str) -> str:
    return f"{email.strip().lower()}.json"


def account_rel_path(email: str) -> str:
    return f"{AUTH_ACCOUNTS_REL_PREFIX}/{account_filename(email)}"


def _account_json_text(compte: dict) -> str:
    return json.dumps(compte, ensure_ascii=False, indent=2) + "\n"


def _parse_account(data: object, *, source: str) -> dict | None:
    if not isinstance(data, dict):
        raise ValueError(f"{source} doit être un objet JSON")
    email = (data.get("email") or "").strip()
    if not email or "@" not in email:
        return None
    return {
        "email": email,
        "nom": (data.get("nom") or "").strip(),
        "prenom": (data.get("prenom") or "").strip(),
        "password_hash": (data.get("password_hash") or "").strip(),
        "role": (data.get("role") or "user").strip(),
        "actif": bool(data.get("actif", True)),
    }


def _load_json_url(url: str) -> object:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _list_remote_account_paths() -> list[str]:
    if github_write_configured():
        try:
            return [
                path
                for path in list_files(AUTH_ACCOUNTS_REL_PREFIX)
                if path.lower().endswith(".json")
            ]
        except GitHubDataError:
            pass
    request = urllib.request.Request(
        GITHUB_API_TREE_URL,
        headers={"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    tree = payload.get("tree") or []
    prefix = f"{AUTH_ACCOUNTS_REL_PREFIX}/"
    paths: list[str] = []
    for entry in tree:
        if not isinstance(entry, dict) or entry.get("type") != "blob":
            continue
        path = str(entry.get("path") or "")
        if path.startswith(prefix) and path.lower().endswith(".json"):
            paths.append(path)
    return sorted(paths)


def _load_accounts_local() -> list[dict]:
    if not AUTH_ACCOUNTS_DIR.is_dir():
        raise FileNotFoundError(f"Dossier comptes introuvable : {AUTH_ACCOUNTS_DIR}")
    rows: list[dict] = []
    for path in sorted(AUTH_ACCOUNTS_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        row = _parse_account(data, source=str(path))
        if row:
            rows.append(row)
    return rows


def _load_accounts_remote() -> list[dict]:
    rows: list[dict] = []
    for rel_path in _list_remote_account_paths():
        if github_write_configured():
            fetched = get_file(rel_path)
            if fetched is None:
                continue
            data = json.loads(fetched[0])
        else:
            data = _load_json_url(f"{DATA_REPO_RAW_BASE}/{rel_path}")
        row = _parse_account(data, source=rel_path)
        if row:
            rows.append(row)
    return rows


def _load_accounts_raw() -> tuple[list[dict], str]:
    if AUTH_ACCOUNTS_DIR.is_dir():
        return _load_accounts_local(), AUTH_ACCOUNTS_REL_PREFIX
    try:
        return _load_accounts_remote(), AUTH_ACCOUNTS_REL_PREFIX
    except (urllib.error.HTTPError, OSError, ValueError, GitHubDataError) as exc:
        raise FileNotFoundError(
            f"Comptes introuvables : {AUTH_ACCOUNTS_DIR} ou {AUTH_ACCOUNTS_REL_PREFIX}/"
        ) from exc


def _load_one_account(email: str) -> dict | None:
    email_norm = email.strip().lower()
    if not email_norm or "@" not in email_norm:
        return None
    local_path = AUTH_ACCOUNTS_DIR / account_filename(email_norm)
    if local_path.is_file():
        return _parse_account(
            json.loads(local_path.read_text(encoding="utf-8-sig")),
            source=str(local_path),
        )
    if AUTH_ACCOUNTS_DIR.is_dir() and not github_write_configured():
        return None
    rel = account_rel_path(email_norm)
    if github_write_configured():
        fetched = get_file(rel)
        if fetched is None:
            return None
        return _parse_account(json.loads(fetched[0]), source=rel)
    url = f"{DATA_REPO_RAW_BASE}/{rel}"
    try:
        return _parse_account(_load_json_url(url), source=rel)
    except (urllib.error.HTTPError, OSError, ValueError):
        return None


def _write_local(compte: dict) -> None:
    AUTH_ACCOUNTS_DIR.mkdir(parents=True, exist_ok=True)
    path = AUTH_ACCOUNTS_DIR / account_filename(compte["email"])
    path.write_text(_account_json_text(compte), encoding="utf-8")


def _write_github(compte: dict, *, message: str, create_only: bool = False) -> None:
    rel = account_rel_path(compte["email"])
    existing = get_file(rel)
    if create_only and existing is not None:
        raise FileExistsError(f"Le compte {compte['email']} existe déjà")
    sha = existing[1] if existing else None
    put_file(rel, _account_json_text(compte), message=message, sha=sha)


def save_account(compte: dict, *, message: str, create_only: bool = False) -> None:
    """Persiste un compte (GitHub si token, et/ou clone local)."""
    email = (compte.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise ValueError("Email de compte invalide")
    compte = {
        "email": email,
        "nom": (compte.get("nom") or "").strip(),
        "prenom": (compte.get("prenom") or "").strip(),
        "password_hash": (compte.get("password_hash") or "").strip(),
        "role": (compte.get("role") or "user").strip() or "user",
        "actif": bool(compte.get("actif", False)),
    }
    wrote = False
    if github_write_configured():
        _write_github(compte, message=message, create_only=create_only)
        wrote = True
    if AUTH_ACCOUNTS_DIR.exists() or AUTH_ACCOUNTS_DIR.parent.exists():
        if create_only and (AUTH_ACCOUNTS_DIR / account_filename(email)).is_file():
            raise FileExistsError(f"Le compte {email} existe déjà")
        _write_local(compte)
        wrote = True
    if not wrote:
        raise RuntimeError(
            "Impossible d'enregistrer le compte : configurez GITHUB_TOKEN "
            "ou le clone local data/app/comptes"
        )


def create_pending_account(
    *,
    email: str,
    nom: str,
    prenom: str,
    password: str,
) -> dict:
    password_hash = hash_password(password)
    compte = {
        "email": email.strip().lower(),
        "nom": nom.strip(),
        "prenom": prenom.strip(),
        "password_hash": password_hash,
        "role": "user",
        "actif": False,
    }
    if _load_one_account(compte["email"]) is not None:
        raise FileExistsError(f"Le compte {compte['email']} existe déjà")
    save_account(
        compte,
        message=f"compte: demande {compte['email']}",
        create_only=True,
    )
    return {
        "email": compte["email"],
        "nom": compte["nom"],
        "prenom": compte["prenom"],
        "role": compte["role"],
        "actif": compte["actif"],
    }


def set_account_actif(email: str, actif: bool) -> dict:
    row = _load_one_account(email)
    if row is None:
        raise FileNotFoundError(f"Compte introuvable : {email}")
    row["actif"] = bool(actif)
    save_account(
        row,
        message=f"compte: {'activation' if actif else 'desactivation'} {row['email']}",
    )
    return {
        "email": row["email"],
        "nom": row["nom"],
        "prenom": row["prenom"],
        "role": row["role"],
        "actif": row["actif"],
    }


def list_accounts_public() -> tuple[list[dict], str]:
    rows, source = _load_accounts_raw()
    public = [
        {
            "email": row["email"],
            "nom": row["nom"],
            "prenom": row["prenom"],
            "role": row["role"],
            "actif": row["actif"],
        }
        for row in rows
    ]
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
    row = _load_one_account(email_norm)
    if not row or not row.get("actif", True):
        return None
    password_hash = (row.get("password_hash") or "").strip()
    if not password_hash or not verify_password(password_hash, password):
        return None
    return {
        "email": row["email"],
        "nom": row["nom"],
        "prenom": row["prenom"],
        "role": row["role"],
        "actif": True,
    }
