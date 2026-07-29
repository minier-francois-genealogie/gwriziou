#!/usr/bin/env python3
"""Rename actes v2 folders/files to use __ between every segment."""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

ACTES_DIR = Path(r"C:\Projet\Perso\genealogie\github\data\sources\documents")

FOLDER_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenom>[^_]+)__(?P<date>\d{4}-\d{2}-\d{2}|XXXX-XX-XX)__(?P<dept>\d+)__(?P<commune>.+)$"
)
FOLDER_OLD_RE = re.compile(
    r"^(?P<nom>[^_]+)_(?P<prenom>[^_]+)_(?P<date>\d{4}-\d{2}-\d{2}|XXXX-XX-XX)__(?P<dept>\d+)__(?P<commune>.+)$"
)
FILE_RE = re.compile(
    r"^(?P<type>[NDM])__(?P<date>\d{4}-\d{2}-\d{2})__(?P<dept>\d+)__(?P<commune>.+?)"
    r"(?:__(?P<suffix>COMMUNE|GREFFE|contraste|A_VERIFIER))?\.(?P<ext>\w+)$",
    re.I,
)
FILE_OLD_RE = re.compile(
    r"^(?P<type>[NDM])_(?P<date>\d{4}-\d{2}-\d{2})__(?P<dept>\d+)__(?P<commune>.+?)"
    r"(?:_(?P<suffix>COMMUNE|GREFFE|contraste|A_VERIFIER))?\.(?P<ext>\w+)$",
    re.I,
)


def segments_from_folder(name: str) -> dict:
    for pattern in (FOLDER_RE, FOLDER_OLD_RE):
        m = pattern.match(name)
        if m:
            return m.groupdict()
    raise ValueError(f"Unrecognized folder: {name}")


def segments_from_file(name: str) -> dict | None:
    if name == "armee.jpg":
        return None
    for pattern in (FILE_RE, FILE_OLD_RE):
        m = pattern.match(name)
        if m:
            return m.groupdict()
    raise ValueError(f"Unrecognized file: {name}")


def new_folder_name(old: str) -> str:
    d = segments_from_folder(old)
    return f"{d['nom']}__{d['prenom']}__{d['date']}__{d['dept']}__{d['commune']}"


def new_file_name(old: str) -> str:
    d = segments_from_file(old)
    if d is None:
        return old
    name = f"{d['type'].upper()}__{d['date']}__{d['dept']}__{d['commune']}"
    if d.get("suffix"):
        name += f"__{d['suffix']}"
    return f"{name}.{d['ext'].lower()}"


def main() -> None:
    moves: list[dict] = []

    for folder in sorted(p for p in ACTES_DIR.iterdir() if p.is_dir()):
        new_folder = ACTES_DIR / new_folder_name(folder.name)

        for file in sorted(folder.iterdir()):
            if not file.is_file():
                continue
            new_name = new_file_name(file.name)
            moves.append(
                {
                    "src": str(file),
                    "dst": str(new_folder / new_name),
                    "old_rel": f"{folder.name}/{file.name}",
                    "new_rel": f"{new_folder.name}/{new_name}",
                }
            )

    manifest = ACTES_DIR / "_rename_double_underscore_manifest.json"
    manifest.write_text(
        json.dumps({"at": datetime.now().isoformat(), "moves": moves}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    # Phase 1: files into new folder paths (folders may not exist yet)
    for mv in moves:
        dst = Path(mv["dst"])
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists():
            raise SystemExit(f"Target exists: {dst}")
        shutil.move(mv["src"], dst)

    # Phase 2: remove empty old folders (legacy single-_ identity segment)
    for folder in sorted(p for p in ACTES_DIR.iterdir() if p.is_dir()):
        if folder.name == new_folder_name(folder.name):
            continue
        if any(folder.iterdir()):
            raise SystemExit(f"Folder not empty: {folder}")
        folder.rmdir()

    print(f"Renamed {len(moves)} files across {len({Path(m['dst']).parent.name for m in moves})} folders.")
    print(f"Manifest: {manifest}")


if __name__ == "__main__":
    main()
