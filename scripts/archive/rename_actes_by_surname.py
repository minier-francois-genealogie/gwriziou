#!/usr/bin/env python3
"""Add surname level: actes/{L}/{NOM}/{NOM}__prenoms__…/"""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

ACTES_DIR = Path(r"C:\Projet\Perso\genealogie\github\data\sources\documents")
FOLDER_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenoms>.+)__(?P<date>.+)__(?P<dept>\d+|XXXX-XX-XX)__(?P<commune>.+)$"
)


def main() -> None:
    moves: list[dict] = []

    for letter_dir in sorted(p for p in ACTES_DIR.iterdir() if p.is_dir() and len(p.name) == 1):
        for person_dir in sorted(p for p in letter_dir.iterdir() if p.is_dir()):
            if not FOLDER_RE.match(person_dir.name):
                continue
            nom = person_dir.name.split("__", 1)[0]
            target = letter_dir / nom / person_dir.name
            if target.exists():
                raise SystemExit(f"Target exists: {target}")
            moves.append(
                {
                    "src": str(person_dir),
                    "dst": str(target),
                    "from": f"{letter_dir.name}/{person_dir.name}",
                    "to": f"{letter_dir.name}/{nom}/{person_dir.name}",
                }
            )

    manifest = ACTES_DIR / "_rename_by_surname_manifest.json"
    manifest.write_text(
        json.dumps({"at": datetime.now().isoformat(), "moves": moves}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    for mv in moves:
        dst = Path(mv["dst"])
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(mv["src"], dst)

    families = len({Path(m["dst"]).parent for m in moves})
    print(f"Moved {len(moves)} person folders into {families} surname directories.")
    print(f"Manifest: {manifest}")


if __name__ == "__main__":
    main()
