#!/usr/bin/env python3
"""Clean actes/: remove 0-byte placeholders, normalize ASCII paths, verify."""

from __future__ import annotations

import argparse
import filecmp
import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from act_path_normalize import normalize_commune, normalize_given_full, normalize_surname

ACTES_DIR = Path(r"C:\Projet\Perso\genealogie\data\actes")
ACT_EXTENSIONS = {".jpg", ".jpeg", ".pdf", ".png"}

PERSON_FOLDER_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenoms>.+)__(?P<bdate>(?:\d{4}|XXXX)-(?:\d{2}|XX)-(?:\d{2}|XX))__"
    r"(?P<dept>\d+|XX)__(?P<bcommune>.+)$"
)
ACT_FILE_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenoms>.+)__(?P<type>[NDM])__"
    r"(?P<date>(?:\d{4}|XXXX)-(?:\d{2}|XX)-(?:\d{2}|XX))__"
    r"(?P<dept>\d+|XX)__(?P<commune>.+?)"
    r"(?:__(?P<suffix>[^.]+))?\.(?P<ext>\w+)$",
    re.I,
)
ARMee_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenoms>.+)__armee\.(?P<ext>\w+)$",
    re.I,
)
NON_ASCII = re.compile(r"[^\x00-\x7F]")


def normalize_folder_name(name: str) -> str | None:
    m = PERSON_FOLDER_RE.match(name)
    if not m:
        return None
    d = m.groupdict()
    nom = normalize_surname(d["nom"])
    prenoms = normalize_given_full(d["prenoms"].replace("_", " "))
    commune = normalize_commune(d["bcommune"].replace("_", " "))
    return f"{nom}__{prenoms}__{d['bdate']}__{d['dept']}__{commune}"


def normalize_file_name(name: str) -> str | None:
    m = ACT_FILE_RE.match(name)
    if m:
        d = m.groupdict()
        nom = normalize_surname(d["nom"])
        prenoms = normalize_given_full(d["prenoms"].replace("_", " "))
        commune = normalize_commune(d["commune"].replace("_", " "))
        base = f"{nom}__{prenoms}__{d['type'].upper()}__{d['date']}__{d['dept']}__{commune}"
        if d.get("suffix"):
            base += f"__{d['suffix']}"
        return f"{base}.{d['ext'].lower()}"
    m = ARMee_RE.match(name)
    if m:
        d = m.groupdict()
        nom = normalize_surname(d["nom"])
        prenoms = normalize_given_full(d["prenoms"].replace("_", " "))
        return f"{nom}__{prenoms}__armee.{d['ext'].lower()}"
    return None


def normalized_rel_path(rel: str) -> tuple[str | None, str | None]:
    """Return (normalized_rel, error). rel uses forward slashes."""
    parts = rel.replace("\\", "/").split("/")
    if len(parts) != 4:
        return None, f"bad depth: {rel}"
    _letter, surname_dir, person_folder, filename = parts

    folder_n = normalize_folder_name(person_folder)
    if not folder_n:
        return None, f"unparsed folder: {person_folder}"

    file_n = normalize_file_name(filename)
    if not file_n:
        return None, f"unparsed file: {filename}"

    nom = folder_n.split("__", 1)[0]
    surname_n = normalize_surname(nom)
    letter_n = surname_n[0] if surname_n else "X"

    if normalize_surname(surname_dir) != surname_n:
        pass  # surname dir renamed to match folder nom

    return f"{letter_n}/{surname_n}/{folder_n}/{file_n}", None


def remove_placeholders(actes_dir: Path, dry_run: bool) -> list[str]:
    removed: list[str] = []
    for f in actes_dir.rglob("*"):
        if not f.is_file():
            continue
        if f.name.startswith("_") and f.suffix == ".json":
            continue
        if f.suffix.lower() not in ACT_EXTENSIONS:
            continue
        if f.stat().st_size == 0:
            rel = str(f.relative_to(actes_dir)).replace("\\", "/")
            removed.append(rel)
            if not dry_run:
                f.unlink()
    return removed


def safe_move(src: Path, dst: Path, conflicts: list[str]) -> bool:
    if src.resolve() == dst.resolve():
        return False
    if dst.exists():
        if dst.stat().st_size == 0:
            dst.unlink()
        elif src.stat().st_size == 0:
            src.unlink()
            return False
        elif filecmp.cmp(src, dst, shallow=False):
            src.unlink()
            return False
        else:
            conflicts.append(f"CONFLICT {src} -> {dst}")
            return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return True


def normalize_paths(actes_dir: Path, dry_run: bool) -> tuple[list[dict], list[str]]:
    moves: list[dict] = []
    conflicts: list[str] = []

    files = [
        f
        for f in actes_dir.rglob("*")
        if f.is_file()
        and f.suffix.lower() in ACT_EXTENSIONS
        and f.stat().st_size > 0
        and not (f.name.startswith("_") and f.parent == actes_dir)
    ]

    for f in sorted(files):
        rel = str(f.relative_to(actes_dir)).replace("\\", "/")
        new_rel, err = normalized_rel_path(rel)
        if err:
            conflicts.append(f"SKIP {rel}: {err}")
            continue
        if new_rel == rel:
            continue
        moves.append({"from": rel, "to": new_rel})

    if not dry_run:
        for mv in moves:
            src = actes_dir / mv["from"]
            dst = actes_dir / mv["to"]
            if src.exists():
                safe_move(src, dst, conflicts)

    return moves, conflicts


def remove_empty_dirs(actes_dir: Path, dry_run: bool) -> list[str]:
    removed: list[str] = []
    dirs = sorted(
        (p for p in actes_dir.rglob("*") if p.is_dir() and not p.name.startswith("_")),
        key=lambda p: len(p.parts),
        reverse=True,
    )
    for d in dirs:
        if d == actes_dir:
            continue
        try:
            if any(d.iterdir()):
                continue
        except OSError:
            continue
        rel = str(d.relative_to(actes_dir)).replace("\\", "/")
        removed.append(rel)
        if not dry_run:
            d.rmdir()
    return removed


def verify(actes_dir: Path) -> dict:
    issues: list[str] = []
    real_files: list[str] = []
    empty = 0

    for f in actes_dir.rglob("*"):
        if not f.is_file():
            continue
        if f.suffix.lower() not in ACT_EXTENSIONS:
            continue
        rel = str(f.relative_to(actes_dir)).replace("\\", "/")
        size = f.stat().st_size
        if size == 0:
            empty += 1
            issues.append(f"EMPTY {rel}")
            continue
        real_files.append(rel)
        if NON_ASCII.search(rel):
            issues.append(f"NON_ASCII {rel}")
        new_rel, err = normalized_rel_path(rel)
        if err:
            issues.append(f"UNPARSED {rel}: {err}")
        elif new_rel != rel:
            issues.append(f"NOT_NORMALIZED {rel} -> {new_rel}")
        parts = rel.split("/")
        if len(parts) == 4:
            for segment in (parts[2], parts[3]):
                if "-" in segment.split("__")[-1]:
                    pass  # commune is last __ segment
            # hyphens in commune part of folder or file
            pf = parts[2]
            m = PERSON_FOLDER_RE.match(pf)
            if m and "-" in m.group("bcommune"):
                issues.append(f"HYPHEN_COMMUNE folder {rel}")
            m2 = ACT_FILE_RE.match(parts[3])
            if m2 and "-" in m2.group("commune"):
                issues.append(f"HYPHEN_COMMUNE file {rel}")

    return {
        "real_count": len(real_files),
        "empty_count": empty,
        "issue_count": len(issues),
        "issues": issues,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean and normalize actes/")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    report: dict = {"at": datetime.now().isoformat(), "dry_run": args.dry_run}

    report["removed_placeholders"] = remove_placeholders(ACTES_DIR, args.dry_run)
    report["placeholder_count"] = len(report["removed_placeholders"])

    moves, move_conflicts = normalize_paths(ACTES_DIR, args.dry_run)
    report["normalization_moves"] = moves
    report["move_count"] = len(moves)
    report["move_conflicts"] = move_conflicts

    report["removed_empty_dirs"] = remove_empty_dirs(ACTES_DIR, args.dry_run)
    report["empty_dir_count"] = len(report["removed_empty_dirs"])

    if not args.dry_run:
        report["verification"] = verify(ACTES_DIR)
    else:
        report["verification"] = {"note": "run without --dry-run for full verify"}

    manifest = ACTES_DIR / "_cleanup_actes_manifest.json"
    manifest.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Placeholders removed: {report['placeholder_count']}")
    print(f"Paths normalized: {report['move_count']}")
    print(f"Empty dirs removed: {report['empty_dir_count']}")
    if move_conflicts:
        print(f"Conflicts/warnings: {len(move_conflicts)}")
        for c in move_conflicts[:10]:
            print(f"  {c}")
    if "real_count" in report.get("verification", {}):
        v = report["verification"]
        print(f"Real scans: {v['real_count']}")
        print(f"Remaining issues: {v['issue_count']}")
        for i in v.get("issues", [])[:10]:
            print(f"  {i}")
    print(f"Manifest: {manifest}")


if __name__ == "__main__":
    main()
