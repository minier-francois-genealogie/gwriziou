"""Écriture / lecture de fichiers dans le dépôt data via l'API GitHub Contents."""

from __future__ import annotations

import base64
import json
import urllib.error
import urllib.parse
import urllib.request

from paths import DATA_REPO, DATA_REPO_BRANCH
from server.config import GITHUB_TOKEN

USER_AGENT = "genealogie-api/1.0"
API_BASE = f"https://api.github.com/repos/{DATA_REPO}/contents"


class GitHubDataError(RuntimeError):
    pass


def github_write_configured() -> bool:
    return bool(GITHUB_TOKEN)


def _headers(*, with_auth: bool = True) -> dict[str, str]:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if with_auth and GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _request(
    method: str,
    url: str,
    *,
    body: dict | None = None,
    with_auth: bool = True,
) -> dict | list:
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = _headers(with_auth=with_auth)
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise GitHubDataError(f"GitHub API {exc.code}: {detail}") from exc
    except OSError as exc:
        raise GitHubDataError(f"Impossible de joindre GitHub: {exc}") from exc


def contents_url(rel_path: str) -> str:
    encoded = "/".join(urllib.parse.quote(part) for part in rel_path.split("/"))
    return f"{API_BASE}/{encoded}?ref={urllib.parse.quote(DATA_REPO_BRANCH)}"


def get_file(rel_path: str) -> tuple[str, str] | None:
    """Retourne (contenu texte, sha) ou None si absent."""
    if not GITHUB_TOKEN:
        return None
    try:
        payload = _request("GET", contents_url(rel_path))
    except GitHubDataError as exc:
        if "404" in str(exc):
            return None
        raise
    if not isinstance(payload, dict) or payload.get("type") != "file":
        return None
    content_b64 = str(payload.get("content") or "").replace("\n", "")
    sha = str(payload.get("sha") or "")
    if not content_b64 or not sha:
        return None
    text = base64.b64decode(content_b64).decode("utf-8")
    return text, sha


def list_files(rel_dir: str) -> list[str]:
    """Liste les chemins relatifs des fichiers d'un dossier (vide si absent)."""
    if not GITHUB_TOKEN:
        raise GitHubDataError("GITHUB_TOKEN non configuré")
    try:
        payload = _request("GET", contents_url(rel_dir.rstrip("/")))
    except GitHubDataError as exc:
        if "404" in str(exc):
            return []
        raise
    if not isinstance(payload, list):
        return []
    paths: list[str] = []
    for entry in payload:
        if not isinstance(entry, dict) or entry.get("type") != "file":
            continue
        path = str(entry.get("path") or "")
        if path:
            paths.append(path)
    return sorted(paths)


def put_file(rel_path: str, content: str, *, message: str, sha: str | None = None) -> None:
    put_bytes(rel_path, content.encode("utf-8"), message=message, sha=sha)


def put_bytes(
    rel_path: str, content: bytes, *, message: str, sha: str | None = None
) -> None:
    if not GITHUB_TOKEN:
        raise GitHubDataError("GITHUB_TOKEN non configuré")
    encoded = "/".join(urllib.parse.quote(part) for part in rel_path.split("/"))
    url = f"{API_BASE}/{encoded}"
    body: dict = {
        "message": message,
        "content": base64.b64encode(content).decode("ascii"),
        "branch": DATA_REPO_BRANCH,
    }
    if sha:
        body["sha"] = sha
    _request("PUT", url, body=body)


def get_file_sha(rel_path: str) -> str | None:
    """Retourne le sha GitHub d'un blob, ou None si absent (sans décoder le contenu)."""
    if not GITHUB_TOKEN:
        return None
    try:
        payload = _request("GET", contents_url(rel_path))
    except GitHubDataError as exc:
        if "404" in str(exc):
            return None
        raise
    if not isinstance(payload, dict) or payload.get("type") != "file":
        return None
    sha = str(payload.get("sha") or "")
    return sha or None


def delete_file(rel_path: str, *, message: str, sha: str) -> None:
    if not GITHUB_TOKEN:
        raise GitHubDataError("GITHUB_TOKEN non configuré")
    encoded = "/".join(urllib.parse.quote(part) for part in rel_path.split("/"))
    url = f"{API_BASE}/{encoded}"
    body = {
        "message": message,
        "sha": sha,
        "branch": DATA_REPO_BRANCH,
    }
    _request("DELETE", url, body=body)
