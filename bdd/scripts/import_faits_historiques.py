#!/usr/bin/env python3
"""Importe les faits historiques (JSON) dans SQLite."""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

BDD_DIR = Path(__file__).resolve().parent.parent
WS_ROOT = BDD_DIR.parent
SCRIPTS_DIR = WS_ROOT / "scripts"
sys.path.insert(0, str(WS_ROOT))
sys.path.insert(0, str(SCRIPTS_DIR))

from act_path_normalize import normalize_commune  # noqa: E402
from paths import (  # noqa: E402
    HISTOIRE_FAITS_DIR,
    HISTOIRE_FAITS_RAW_BASE,
    HISTOIRE_FAITS_REL_PREFIX,
    GITHUB_API_TREE_URL,
)

DEFAULT_DB = BDD_DIR / "genealogie.sqlite"
USER_AGENT = "genealogie-import/1.0"
SKIP_NAMES = {"_index.json", "README.md"}


def slug_label(value: str) -> str:
    return normalize_commune(value).lower()


def normalize_pays(niveau: str, slug: str, pays: str | None) -> str | None:
    """Libellés lisibles en BDD (France, Monde…) plutôt que codes (FR)."""
    raw = (pays or "").strip()
    if niveau == "MONDE":
        return raw or "Monde"
    if niveau == "NATIONAL":
        if raw.upper() == "FR":
            return "France"
        if raw:
            return raw
        if slug == "france":
            return "France"
        return raw or None
    if raw.upper() == "FR":
        return "France"
    return raw or None


def parse_fichier(relative: str) -> tuple[str, str] | None:
    """Retourne (niveau, slug) à partir du chemin relatif sous referentiels/faits-historiques/."""
    if relative == "communal/_index.json":
        return None
    parts = PurePosixPath(relative).parts
    if not parts:
        return None
    name = parts[-1]
    if name in SKIP_NAMES or name.startswith("REQUETES"):
        return None
    stem = PurePosixPath(name).stem
    if len(parts) == 1 and name == "monde.json":
        return "MONDE", "monde"
    if len(parts) < 2:
        return None
    folder = parts[-2]
    mapping = {
        "national": "NATIONAL",
        "regional": "REGIONAL",
        "departement": "DEPARTEMENT",
        "communal": "COMMUNAL",
    }
    niveau = mapping.get(folder)
    if not niveau:
        return None
    return niveau, stem


def tree_empreinte(entries: list[tuple[str, str]]) -> str:
    digest = hashlib.sha256()
    for relative, sha in sorted(entries):
        digest.update(relative.encode("utf-8"))
        digest.update(sha.encode("utf-8"))
    return digest.hexdigest()


def fetch_github_faits_entries(
    tree_url: str = GITHUB_API_TREE_URL,
) -> list[tuple[str, str]]:
    request = urllib.request.Request(
        tree_url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"GitHub API indisponible : {exc}") from exc

    prefix = f"{HISTOIRE_FAITS_REL_PREFIX}/"
    out: list[tuple[str, str]] = []
    for item in payload.get("tree", []):
        path = item.get("path", "")
        if not path.startswith(prefix) or item.get("type") != "blob":
            continue
        if not path.endswith(".json"):
            continue
        relative = path[len(prefix) :]
        if relative in SKIP_NAMES or "REQUETES" in relative:
            continue
        if relative == "communal/_index.json" or parse_fichier(relative):
            sha = item.get("sha") or ""
            out.append((relative, sha))
    return out


def load_json_remote(relative: str) -> object:
    url = f"{HISTOIRE_FAITS_RAW_BASE}/{relative}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def iter_local_files(base: Path) -> list[tuple[str, Path]]:
    if not base.is_dir():
        return []
    files: list[tuple[str, Path]] = []
    for path in sorted(base.rglob("*.json")):
        relative = path.relative_to(base).as_posix()
        if relative in SKIP_NAMES or "REQUETES" in relative:
            continue
        files.append((relative, path))
    return files


def local_empreinte(files: list[tuple[str, Path]]) -> str:
    entries: list[tuple[str, str]] = []
    for relative, path in files:
        digest = hashlib.sha256()
        digest.update(path.read_bytes())
        entries.append((relative, digest.hexdigest()))
    return tree_empreinte(entries)


def insert_evenements(
    conn: sqlite3.Connection,
    niveau: str,
    slug: str,
    source_fichier: str,
    events: list[dict],
) -> int:
    count = 0
    for evt in events:
        if not isinstance(evt, dict):
            continue
        libelle = (evt.get("libelle") or "").strip()
        if not libelle:
            continue
        conn.execute(
            """
            INSERT INTO faits_historiques (
                niveau, categorie, debut, fin, libelle, description,
                commune, departement, region, pays, slug, source_fichier
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                niveau,
                (evt.get("categorie") or "AUTRE").strip(),
                (evt.get("debut") or "").strip() or "????",
                (evt.get("fin") or evt.get("debut") or "").strip() or "????",
                libelle,
                evt.get("description"),
                evt.get("commune"),
                evt.get("departement"),
                evt.get("region"),
                normalize_pays(niveau, slug, evt.get("pays")),
                slug,
                source_fichier,
            ),
        )
        count += 1
    return count


def import_commune_index(conn: sqlite3.Connection, rows: list[dict]) -> int:
    count = 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        slug = (row.get("slug") or "").strip()
        commune = (row.get("commune") or "").strip()
        if not slug or not commune:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO commune_slugs (
                slug, commune, code_postal, departement, region, pays
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                slug,
                commune,
                row.get("code_postal"),
                row.get("departement"),
                row.get("region"),
                row.get("pays"),
            ),
        )
        count += 1
    return count


def import_faits_historiques(conn: sqlite3.Connection) -> dict[str, int]:
    conn.execute("DELETE FROM faits_historiques")
    conn.execute("DELETE FROM commune_slugs")

    total_events = 0
    total_communes = 0
    empreinte_entries: list[tuple[str, str]] = []

    if HISTOIRE_FAITS_DIR.is_dir():
        local_files = iter_local_files(HISTOIRE_FAITS_DIR)
        empreinte = local_empreinte(local_files)
        for relative, path in local_files:
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            empreinte_entries.append((relative, digest))
            source = f"{HISTOIRE_FAITS_REL_PREFIX}/{relative}"
            if relative == "communal/_index.json":
                data = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(data, list):
                    total_communes = import_commune_index(conn, data)
                continue
            parsed = parse_fichier(relative)
            if not parsed:
                continue
            niveau, slug = parsed
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                total_events += insert_evenements(
                    conn, niveau, slug, source, data
                )
    else:
        remote_entries = fetch_github_faits_entries()
        empreinte_entries = remote_entries
        empreinte = tree_empreinte(remote_entries)
        for relative, _sha in remote_entries:
            source = f"{HISTOIRE_FAITS_REL_PREFIX}/{relative}"
            if relative == "communal/_index.json":
                data = load_json_remote(relative)
                if isinstance(data, list):
                    total_communes = import_commune_index(conn, data)
                continue
            parsed = parse_fichier(relative)
            if not parsed:
                continue
            niveau, slug = parsed
            data = load_json_remote(relative)
            if isinstance(data, list):
                total_events += insert_evenements(
                    conn, niveau, slug, source, data
                )

    imported_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    conn.execute(
        """
        UPDATE meta
        SET empreinte_faits = ?, nb_faits_historiques = ?, importe_le = ?
        WHERE id = 1
        """,
        (empreinte, total_events, imported_at),
    )
    return {
        "faits_historiques": total_events,
        "commune_slugs": total_communes,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Import faits historiques → SQLite")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()

    if not args.db.is_file():
        raise SystemExit(f"Base introuvable : {args.db}")

    conn = sqlite3.connect(args.db)
    try:
        counts = import_faits_historiques(conn)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    print(f"Base : {args.db.resolve()}")
    print(
        f"Importé : {counts['faits_historiques']} faits, "
        f"{counts['commune_slugs']} communes indexées"
    )


if __name__ == "__main__":
    main()
