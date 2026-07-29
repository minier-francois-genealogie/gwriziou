"""Notes utilisateurs — app/notes/{A-Z}/{NOM}/{CLE}/*.json (file de travail)."""

from __future__ import annotations

import json
import re
import uuid
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from paths import (
    DATA_REPO_RAW_BASE,
    GITHUB_API_TREE_URL,
    NOTES_DIR,
    NOTES_REL_PREFIX,
)
from server.services.github_data import (
    GitHubDataError,
    delete_file,
    get_file,
    github_write_configured,
    list_files,
    put_file,
)

USER_AGENT = "genealogie-api/1.0"
_SEGMENT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.\-]*$")
_FICHIER_RE = re.compile(
    r"^\d{8}T\d{6}Z__[A-Za-z0-9._\-]+__[a-f0-9]{6}\.json$"
)


def normalize_chemin(chemin: str) -> str:
    """Valide L/NOM/CLE (même arborescence que sources/documents)."""
    parts = [p for p in chemin.strip().strip("/").replace("\\", "/").split("/") if p]
    if len(parts) != 3:
        raise ValueError("chemin attendu : {A-Z}/{NOM}/{CLE}")
    for part in parts:
        if part in (".", "..") or not _SEGMENT_RE.fullmatch(part):
            raise ValueError(f"segment de chemin invalide : {part}")
    return "/".join(parts)


def normalize_fichier(fichier: str) -> str:
    name = Path(fichier.strip()).name
    if not _FICHIER_RE.fullmatch(name):
        raise ValueError(f"nom de fichier note invalide : {fichier}")
    return name


def notes_dir_rel(chemin: str) -> str:
    return f"{NOTES_REL_PREFIX}/{normalize_chemin(chemin)}"


def note_rel_path(chemin: str, fichier: str) -> str:
    return f"{notes_dir_rel(chemin)}/{normalize_fichier(fichier)}"


def _auteur_slug(email: str) -> str:
    local = (email.split("@", 1)[0] if "@" in email else email).strip().lower()
    slug = re.sub(r"[^a-z0-9._\-]+", "-", local).strip("-._")
    return (slug[:40] or "user")


def _auteur_nom_affiche(prenom: str, nom: str, email: str) -> str:
    full = f"{(prenom or '').strip()} {(nom or '').strip()}".strip()
    return full or email


def _note_json_text(note: dict) -> str:
    return json.dumps(note, ensure_ascii=False, indent=2) + "\n"


def _parse_note(data: object, *, chemin: str, fichier: str, source: str) -> dict | None:
    if not isinstance(data, dict):
        raise ValueError(f"{source} doit être un objet JSON")
    note_id = str(data.get("id") or "").strip()
    texte = str(data.get("texte") or "").strip()
    if not note_id or not texte:
        return None
    cle = str(data.get("cle") or "").strip() or chemin.rsplit("/", 1)[-1]
    return {
        "id": note_id,
        "cle": cle,
        "chemin": chemin,
        "fichier": fichier,
        "auteur_email": str(data.get("auteur_email") or "").strip(),
        "auteur_nom": str(data.get("auteur_nom") or "").strip(),
        "cree_le": str(data.get("cree_le") or "").strip(),
        "texte": texte,
    }


def _load_json_url(url: str) -> object:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _list_remote_note_paths() -> list[str]:
    request = urllib.request.Request(
        GITHUB_API_TREE_URL,
        headers={"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    tree = payload.get("tree") or []
    prefix = f"{NOTES_REL_PREFIX}/"
    paths: list[str] = []
    for entry in tree:
        if not isinstance(entry, dict) or entry.get("type") != "blob":
            continue
        path = str(entry.get("path") or "")
        if path.startswith(prefix) and path.lower().endswith(".json"):
            paths.append(path)
    return sorted(paths)


def _chemin_fichier_from_rel(rel_path: str) -> tuple[str, str] | None:
    prefix = f"{NOTES_REL_PREFIX}/"
    if not rel_path.startswith(prefix) or not rel_path.lower().endswith(".json"):
        return None
    rest = rel_path[len(prefix) :]
    parts = rest.split("/")
    if len(parts) != 4:
        return None
    chemin = "/".join(parts[:3])
    fichier = parts[3]
    try:
        return normalize_chemin(chemin), normalize_fichier(fichier)
    except ValueError:
        return None


def _load_note_from_rel(rel_path: str) -> dict | None:
    parsed = _chemin_fichier_from_rel(rel_path)
    if parsed is None:
        return None
    chemin, fichier = parsed
    if github_write_configured():
        fetched = get_file(rel_path)
        if fetched is None:
            return None
        data = json.loads(fetched[0])
    else:
        data = _load_json_url(f"{DATA_REPO_RAW_BASE}/{rel_path}")
    return _parse_note(data, chemin=chemin, fichier=fichier, source=rel_path)


def _list_local_for_chemin(chemin: str) -> list[dict]:
    folder = NOTES_DIR / Path(normalize_chemin(chemin))
    if not folder.is_dir():
        return []
    rows: list[dict] = []
    for path in sorted(folder.glob("*.json")):
        try:
            fichier = normalize_fichier(path.name)
        except ValueError:
            continue
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        row = _parse_note(data, chemin=chemin, fichier=fichier, source=str(path))
        if row:
            rows.append(row)
    return rows


def _list_remote_for_chemin(chemin: str) -> list[dict]:
    rel_dir = notes_dir_rel(chemin)
    rows: list[dict] = []
    if github_write_configured():
        for rel_path in list_files(rel_dir):
            if not rel_path.lower().endswith(".json"):
                continue
            row = _load_note_from_rel(rel_path)
            if row:
                rows.append(row)
        return rows
    prefix = f"{rel_dir}/"
    for rel_path in _list_remote_note_paths():
        if not rel_path.startswith(prefix):
            continue
        try:
            data = _load_json_url(f"{DATA_REPO_RAW_BASE}/{rel_path}")
            parsed = _chemin_fichier_from_rel(rel_path)
            if parsed is None:
                continue
            c, f = parsed
            row = _parse_note(data, chemin=c, fichier=f, source=rel_path)
            if row:
                rows.append(row)
        except (urllib.error.HTTPError, OSError, ValueError):
            continue
    return rows


def list_notes_for_chemin(chemin: str) -> tuple[list[dict], str]:
    chemin_n = normalize_chemin(chemin)
    local_folder = NOTES_DIR / Path(chemin_n)
    if local_folder.is_dir() or (NOTES_DIR.is_dir() and not github_write_configured()):
        return _list_local_for_chemin(chemin_n), NOTES_REL_PREFIX
    try:
        return _list_remote_for_chemin(chemin_n), NOTES_REL_PREFIX
    except (urllib.error.HTTPError, OSError, ValueError, GitHubDataError) as exc:
        raise FileNotFoundError(
            f"Notes introuvables : {NOTES_DIR} ou {NOTES_REL_PREFIX}/"
        ) from exc


def list_notes_index() -> tuple[list[str], int]:
    """Retourne (chemins L/NOM/CLE avec notes, nombre total de fichiers note)."""
    chemins: set[str] = set()
    total = 0
    if NOTES_DIR.is_dir():
        for path in NOTES_DIR.rglob("*.json"):
            try:
                rel = path.relative_to(NOTES_DIR).as_posix()
            except ValueError:
                continue
            parts = rel.split("/")
            if len(parts) != 4:
                continue
            try:
                chemins.add(normalize_chemin("/".join(parts[:3])))
                normalize_fichier(parts[3])
            except ValueError:
                continue
            total += 1
        return sorted(chemins), total
    try:
        for rel_path in _list_remote_note_paths():
            parsed = _chemin_fichier_from_rel(rel_path)
            if parsed is not None:
                chemins.add(parsed[0])
                total += 1
        return sorted(chemins), total
    except (urllib.error.HTTPError, OSError, ValueError, GitHubDataError):
        return [], 0


def list_chemins_avec_notes() -> list[str]:
    """Chemins L/NOM/CLE ayant au moins une note."""
    return list_notes_index()[0]

def list_all_notes() -> tuple[list[dict], str]:
    if NOTES_DIR.is_dir():
        rows: list[dict] = []
        for path in sorted(NOTES_DIR.rglob("*.json")):
            try:
                rel = path.relative_to(NOTES_DIR).as_posix()
            except ValueError:
                continue
            parts = rel.split("/")
            if len(parts) != 4:
                continue
            try:
                chemin = normalize_chemin("/".join(parts[:3]))
                fichier = normalize_fichier(parts[3])
            except ValueError:
                continue
            data = json.loads(path.read_text(encoding="utf-8-sig"))
            row = _parse_note(data, chemin=chemin, fichier=fichier, source=str(path))
            if row:
                rows.append(row)
        rows.sort(key=lambda r: r.get("cree_le") or r.get("fichier") or "", reverse=True)
        return rows, NOTES_REL_PREFIX
    try:
        rows = []
        for rel_path in _list_remote_note_paths():
            try:
                row = _load_note_from_rel(rel_path)
            except (urllib.error.HTTPError, OSError, ValueError, GitHubDataError):
                continue
            if row:
                rows.append(row)
        rows.sort(key=lambda r: r.get("cree_le") or r.get("fichier") or "", reverse=True)
        return rows, NOTES_REL_PREFIX
    except (urllib.error.HTTPError, OSError, ValueError, GitHubDataError) as exc:
        raise FileNotFoundError(
            f"Notes introuvables : {NOTES_DIR} ou {NOTES_REL_PREFIX}/"
        ) from exc


def _write_local(chemin: str, fichier: str, note: dict) -> None:
    folder = NOTES_DIR / Path(normalize_chemin(chemin))
    folder.mkdir(parents=True, exist_ok=True)
    (folder / normalize_fichier(fichier)).write_text(
        _note_json_text(note),
        encoding="utf-8",
    )


def _cleanup_empty_local_dirs(chemin: str) -> None:
    folder = NOTES_DIR / Path(normalize_chemin(chemin))
    current = folder
    root = NOTES_DIR.resolve()
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


def create_note(
    *,
    chemin: str,
    texte: str,
    auteur_email: str,
    auteur_prenom: str,
    auteur_nom: str,
) -> dict:
    chemin_n = normalize_chemin(chemin)
    texte_n = texte.strip()
    if not texte_n:
        raise ValueError("texte vide")
    email = auteur_email.strip().lower()
    if not email or "@" not in email:
        raise ValueError("auteur invalide")
    note_id = uuid.uuid4().hex[:6]
    cree_le = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    fichier = f"{ts}__{_auteur_slug(email)}__{note_id}.json"
    note = {
        "id": note_id,
        "cle": chemin_n.rsplit("/", 1)[-1],
        "auteur_email": email,
        "auteur_nom": _auteur_nom_affiche(auteur_prenom, auteur_nom, email),
        "cree_le": cree_le,
        "texte": texte_n,
    }
    rel = note_rel_path(chemin_n, fichier)
    wrote = False
    if github_write_configured():
        put_file(
            rel,
            _note_json_text(note),
            message=f"notes: ajout {chemin_n}/{fichier}",
        )
        wrote = True
    if NOTES_DIR.exists() or NOTES_DIR.parent.exists():
        _write_local(chemin_n, fichier, note)
        wrote = True
    if not wrote:
        raise RuntimeError(
            "Impossible d'enregistrer la note : configurez GITHUB_TOKEN "
            "ou le clone local data/app/notes"
        )
    return {
        **note,
        "chemin": chemin_n,
        "fichier": fichier,
    }


def delete_note(*, chemin: str, fichier: str) -> None:
    chemin_n = normalize_chemin(chemin)
    fichier_n = normalize_fichier(fichier)
    rel = note_rel_path(chemin_n, fichier_n)
    deleted = False
    if github_write_configured():
        existing = get_file(rel)
        if existing is None:
            raise FileNotFoundError(f"Note introuvable : {rel}")
        delete_file(
            rel,
            message=f"notes: suppression {chemin_n}/{fichier_n}",
            sha=existing[1],
        )
        deleted = True
    local_path = NOTES_DIR / Path(chemin_n) / fichier_n
    if local_path.is_file():
        local_path.unlink()
        _cleanup_empty_local_dirs(chemin_n)
        deleted = True
    elif NOTES_DIR.is_dir() and not github_write_configured():
        raise FileNotFoundError(f"Note introuvable : {local_path}")
    if not deleted:
        raise RuntimeError(
            "Impossible de supprimer la note : configurez GITHUB_TOKEN "
            "ou le clone local data/app/notes"
        )


def get_note(*, chemin: str, fichier: str) -> dict | None:
    chemin_n = normalize_chemin(chemin)
    fichier_n = normalize_fichier(fichier)
    rel = note_rel_path(chemin_n, fichier_n)
    local_path = NOTES_DIR / Path(chemin_n) / fichier_n
    if local_path.is_file():
        data = json.loads(local_path.read_text(encoding="utf-8-sig"))
        return _parse_note(data, chemin=chemin_n, fichier=fichier_n, source=str(local_path))
    if github_write_configured():
        fetched = get_file(rel)
        if fetched is None:
            return None
        data = json.loads(fetched[0])
        return _parse_note(data, chemin=chemin_n, fichier=fichier_n, source=rel)
    try:
        data = _load_json_url(f"{DATA_REPO_RAW_BASE}/{rel}")
        return _parse_note(data, chemin=chemin_n, fichier=fichier_n, source=rel)
    except (urllib.error.HTTPError, OSError, ValueError):
        return None
