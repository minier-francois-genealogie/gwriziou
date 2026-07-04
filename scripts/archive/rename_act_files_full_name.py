#!/usr/bin/env python3
"""Prefix act files with full person identity: NOM__prenoms__TYPE__date__dept__commune."""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

ACTES_DIR = Path(r"C:\Projet\Perso\genealogie\data\actes")

PERSON_FOLDER_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenoms>.+)__(?P<bdate>\d{4}-\d{2}-\d{2}|XXXX-XX-XX)__(?P<dept>\d+)__(?P<bcommune>.+)$"
)
ACT_FILE_RE = re.compile(
    r"^(?P<type>[NDM])__(?P<date>\d{4}-\d{2}-\d{2})__(?P<dept>\d+)__(?P<commune>.+?)"
    r"(?:__(?P<suffix>COMMUNE|GREFFE|contraste|A_VERIFIER))?\.(?P<ext>\w+)$",
    re.I,
)


def parse_person_folder(name: str) -> tuple[str, str]:
    m = PERSON_FOLDER_RE.match(name)
    if not m:
        raise ValueError(f"Unrecognized person folder: {name}")
    d = m.groupdict()
    return d["nom"], d["prenoms"]


def new_act_name(nom: str, prenoms: str, old_filename: str) -> str:
    if old_filename == "armee.jpg":
        return f"{nom}__{prenoms}__armee.jpg"
    m = ACT_FILE_RE.match(old_filename)
    if not m:
        raise ValueError(f"Unrecognized act file: {old_filename}")
    d = m.groupdict()
    name = f"{nom}__{prenoms}__{d['type'].upper()}__{d['date']}__{d['dept']}__{d['commune']}"
    if d.get("suffix"):
        name += f"__{d['suffix']}"
    return f"{name}.{d['ext'].lower()}"


def main() -> None:
    renames: list[dict] = []

    for person_dir in ACTES_DIR.rglob("*"):
        if not person_dir.is_dir():
            continue
        # leaf person folder: has act files or matches pattern at depth actes/L/NOM/PERSON
        if not PERSON_FOLDER_RE.match(person_dir.name):
            continue
        nom, prenoms = parse_person_folder(person_dir.name)
        for f in sorted(person_dir.iterdir()):
            if not f.is_file() or f.suffix.lower() not in {".jpg", ".jpeg", ".pdf", ".png"}:
                continue
            new_name = new_act_name(nom, prenoms, f.name)
            if new_name == f.name:
                continue
            dst = person_dir / new_name
            if dst.exists():
                raise SystemExit(f"Target exists: {dst}")
            renames.append(
                {
                    "src": str(f),
                    "dst": str(dst),
                    "from": f"{person_dir.relative_to(ACTES_DIR)}/{f.name}",
                    "to": f"{person_dir.relative_to(ACTES_DIR)}/{new_name}",
                }
            )

    manifest = ACTES_DIR / "_rename_act_files_full_name_manifest.json"
    manifest.write_text(
        json.dumps({"at": datetime.now().isoformat(), "renames": renames}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    for r in renames:
        shutil.move(r["src"], r["dst"])

    print(f"Renamed {len(renames)} act files.")
    if renames[:2]:
        for r in renames[:2]:
            print(f"  {r['from']}")
            print(f"  -> {r['to'].split('/')[-1]}")
    print(f"Manifest: {manifest}")


if __name__ == "__main__":
    main()
