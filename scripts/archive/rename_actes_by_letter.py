#!/usr/bin/env python3
"""Add one letter level: actes/{A-Z}/{NOM}__prenoms__…/"""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

ACTES_DIR = Path(r"C:\Projet\Perso\genealogie\github\data\sources\documents")
FOLDER_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenoms>.+)__(?P<date>.+)__(?P<dept>\d+)__(?P<commune>.+)$"
)


def letter_for_folder(folder_name: str) -> str:
    if not FOLDER_RE.match(folder_name):
        raise ValueError(f"Unrecognized folder: {folder_name}")
    return folder_name[0].upper()


def main() -> None:
    moves: list[dict] = []

    for folder in sorted(p for p in ACTES_DIR.iterdir() if p.is_dir()):
        letter = letter_for_folder(folder.name)
        target_dir = ACTES_DIR / letter / folder.name
        if target_dir.exists():
            raise SystemExit(f"Target exists: {target_dir}")
        moves.append(
            {
                "src": str(folder),
                "dst": str(target_dir),
                "letter": letter,
                "folder": folder.name,
            }
        )

    manifest = ACTES_DIR / "_rename_by_letter_manifest.json"
    manifest.write_text(
        json.dumps({"at": datetime.now().isoformat(), "moves": moves}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    for mv in moves:
        Path(mv["dst"]).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(mv["src"], mv["dst"])

    letters = sorted({m["letter"] for m in moves})
    print(f"Moved {len(moves)} folders into {len(letters)} letter directories: {', '.join(letters)}")
    print(f"Manifest: {manifest}")


if __name__ == "__main__":
    main()
