"""Individus validés — app/checked/{A-Z}/{NOM}/{CLE}.json (marqueur présence)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from paths import (
    CHECKED_DIR,
    CHECKED_REL_PREFIX,
    DATA_REPO_RAW_BASE,
    GITHUB_API_TREE_URL,
)
from server.services.github_data import (
    GitHubDataError,
    delete_file,
    get_file,
    github_write_configured,
    put_file,
)
from server.services.notes import normalize_chemin

USER_AGENT = "genealogie-api/1.0"


def checked_rel_path(chemin: str) -> str:
    return f"{CHECKED_REL_PREFIX}/{normalize_chemin(chemin)}.json"


def _json_text(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"


def list_chemins_checked() -> list[str]:
    chemins: set[str] = set()
    if CHECKED_DIR.is_dir():
        for path in CHECKED_DIR.rglob("*.json"):
            try:
                rel = path.relative_to(CHECKED_DIR).as_posix()
            except ValueError:
                continue
            if not rel.lower().endswith(".json"):
                continue
            without = rel[: -len(".json")]
            try:
                chemins.add(normalize_chemin(without))
            except ValueError:
                continue
        return sorted(chemins)
    try:
        request = urllib.request.Request(
            GITHUB_API_TREE_URL,
            headers={"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
        prefix = f"{CHECKED_REL_PREFIX}/"
        for entry in payload.get("tree") or []:
            if not isinstance(entry, dict) or entry.get("type") != "blob":
                continue
            path = str(entry.get("path") or "")
            if not path.startswith(prefix) or not path.lower().endswith(".json"):
                continue
            without = path[len(prefix) : -len(".json")]
            try:
                chemins.add(normalize_chemin(without))
            except ValueError:
                continue
        return sorted(chemins)
    except (urllib.error.HTTPError, OSError, ValueError, GitHubDataError):
        return []


def is_checked(chemin: str) -> bool:
    chemin_n = normalize_chemin(chemin)
    local = CHECKED_DIR / Path(f"{chemin_n}.json")
    if local.is_file():
        return True
    if github_write_configured():
        return get_file(checked_rel_path(chemin_n)) is not None
    if CHECKED_DIR.is_dir():
        return False
    url = f"{DATA_REPO_RAW_BASE}/{checked_rel_path(chemin_n)}"
    try:
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=20) as response:
            response.read(1)
        return True
    except (urllib.error.HTTPError, OSError):
        return False


def set_checked(
    *,
    chemin: str,
    checked: bool,
    auteur_email: str,
    auteur_nom: str,
) -> bool:
    """Active ou désactive le marqueur. Retourne l'état final."""
    chemin_n = normalize_chemin(chemin)
    rel = checked_rel_path(chemin_n)
    local = CHECKED_DIR / Path(f"{chemin_n}.json")

    if not checked:
        deleted = False
        if github_write_configured():
            existing = get_file(rel)
            if existing is not None:
                delete_file(
                    rel,
                    message=f"checked: retrait {chemin_n}",
                    sha=existing[1],
                )
                deleted = True
        if local.is_file():
            local.unlink()
            deleted = True
            # nettoyer parents vides
            current = local.parent
            root = CHECKED_DIR.resolve()
            while True:
                try:
                    resolved = current.resolve()
                except OSError:
                    break
                if resolved == root or root not in resolved.parents:
                    break
                if not current.is_dir():
                    break
                try:
                    next(current.iterdir())
                    break
                except StopIteration:
                    current.rmdir()
                    current = current.parent
                except OSError:
                    break
        if not deleted and not github_write_configured() and not CHECKED_DIR.exists():
            raise RuntimeError(
                "Impossible de retirer le checked : configurez GITHUB_TOKEN "
                "ou le clone local data/app/checked"
            )
        return False

    email = auteur_email.strip().lower()
    payload = {
        "cle": chemin_n.rsplit("/", 1)[-1],
        "chemin": chemin_n,
        "par": email,
        "par_nom": (auteur_nom or "").strip(),
        "le": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    text = _json_text(payload)
    wrote = False
    if github_write_configured():
        existing = get_file(rel)
        sha = existing[1] if existing else None
        put_file(rel, text, message=f"checked: validation {chemin_n}", sha=sha)
        wrote = True
    if CHECKED_DIR.exists() or CHECKED_DIR.parent.exists():
        local.parent.mkdir(parents=True, exist_ok=True)
        local.write_text(text, encoding="utf-8")
        wrote = True
    if not wrote:
        raise RuntimeError(
            "Impossible d'enregistrer le checked : configurez GITHUB_TOKEN "
            "ou le clone local data/app/checked"
        )
    return True
