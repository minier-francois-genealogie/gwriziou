#!/usr/bin/env python3
"""Expand actes folder names: all given names in the prenom segment (joined by _)."""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

ACTES_DIR = Path(r"C:\Projet\Perso\genealogie\data\actes")
MANIFEST_V1 = ACTES_DIR / "_migration_v1_manifest.json"

FOLDER_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenom>[^_]+)__(?P<date>\d{4}-\d{2}-\d{2}|XXXX-XX-XX)__(?P<dept>\d+)__(?P<commune>.+)$"
)


def load_full_prenoms_by_folder() -> dict[str, str]:
    """Map current folder name -> full prenoms block from v1 migration manifest."""
    data = json.loads(MANIFEST_V1.read_text(encoding="utf-8"))
    # group -> full prenoms (from v1 prefix)
    group_prenoms: dict[str, str] = {}
    for move in data["moves"]:
        group = move["group"]
        if group in group_prenoms:
            continue
        prefix = group.rsplit(".sosa_", 1)[0]
        parts = prefix.split("_")
        group_prenoms[group] = "_".join(parts[1:]) if len(parts) > 1 else ""

    # folder (any __ format) -> prenoms via manifest new_rel folder stem
    folder_to_prenoms: dict[str, str] = {}
    for move in data["moves"]:
        group = move["group"]
        prenoms = group_prenoms[group]
        rel_folder = move["new_rel"].split("/")[0]
        # manifest used BELLAMY_Joseph_1805-06-10__56__Guer → normalize to __ form
        m = re.match(
            r"^(?P<nom>[^_]+)_(?P<prenom>[^_]+)_(?P<rest>.+)$",
            rel_folder,
        )
        if not m:
            continue
        key_folder = f"{m.group('nom')}__{m.group('prenom')}__{m.group('rest')}"
        folder_to_prenoms[key_folder] = prenoms

    return folder_to_prenoms


def new_folder_name(current: str, prenoms_full: str) -> str:
    m = FOLDER_RE.match(current)
    if not m:
        raise ValueError(f"Unrecognized folder: {current}")
    d = m.groupdict()
    return f"{d['nom']}__{prenoms_full}__{d['date']}__{d['dept']}__{d['commune']}"


def main() -> None:
    if not MANIFEST_V1.exists():
        raise SystemExit(f"Missing manifest: {MANIFEST_V1}")

    folder_prenoms = load_full_prenoms_by_folder()
    renames: list[dict] = []

    for folder in sorted(p for p in ACTES_DIR.iterdir() if p.is_dir()):
        if folder.name not in folder_prenoms:
            raise SystemExit(f"No v1 mapping for folder: {folder.name}")
        prenoms_full = folder_prenoms[folder.name]
        target_name = new_folder_name(folder.name, prenoms_full)
        if target_name == folder.name:
            continue
        target = ACTES_DIR / target_name
        if target.exists():
            raise SystemExit(f"Target already exists: {target}")
        renames.append({"src": str(folder), "dst": str(target), "from": folder.name, "to": target_name})

    manifest = ACTES_DIR / "_rename_full_prenoms_manifest.json"
    manifest.write_text(
        json.dumps({"at": datetime.now().isoformat(), "renames": renames}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    for r in renames:
        shutil.move(r["src"], r["dst"])

    print(f"Renamed {len(renames)} folders (files unchanged inside).")
    if renames[:3]:
        for r in renames[:3]:
            print(f"  {r['from']} -> {r['to']}")
    print(f"Manifest: {manifest}")


if __name__ == "__main__":
    main()
