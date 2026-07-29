#!/usr/bin/env python3
"""Migrate actes from v1 flat names to v2 folder structure (see SPECIFICATION.md)."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from act_path_normalize import normalize_commune, normalize_given_full, normalize_surname

UNKNOWN_BIRTH_DATE = "XXXX-XX-XX"
ACTES_DIR = Path(r"C:\Projet\Perso\genealogie\github\data\sources\documents")
GEDCOM_PATH = Path(r"C:\Projet\Perso\genealogie\github\data\sources\gedcom\fminier.ged")

MONTHS = {
    "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06",
    "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12",
}

KNOWN_SUFFIXES = {"COMMUNE", "GREFFE", "contraste", "A_VERIFIER"}


def parse_v1_filename(name: str) -> ActFile | None:
    """Parse v1 filename; commune may contain underscores (e.g. La_Gacilly)."""
    m = re.match(r"^(?P<prefix>.+)\.sosa_(?P<sosa>\d+)\.(?P<date>\d{4}-\d{2}-\d{2})\.(?P<type>[NDM])\.(?P<tail>.+)$", name, re.I)
    if not m:
        return None
    d = m.groupdict()
    tail = d["tail"]
    ext_m = re.search(r"\.(\w+)$", tail)
    if not ext_m:
        return None
    ext = ext_m.group(1)
    body = tail[: ext_m.start()]
    dept_m = re.match(r"(\d+)-(.+)", body)
    if not dept_m:
        return None
    dept, commune_part = dept_m.groups()
    suffix = None
    for suf in KNOWN_SUFFIXES:
        if commune_part.endswith(f"_{suf}"):
            suffix = suf
            commune_part = commune_part[: -(len(suf) + 1)]
            break
    return ActFile(
        old_name=name,
        prefix=d["prefix"],
        sosa=d["sosa"],
        act_date=d["date"],
        act_type=d["type"].upper(),
        dept=dept,
        commune=commune_part,
        suffix=suffix,
        ext=ext,
    )


@dataclass
class ActFile:
    old_name: str
    prefix: str
    sosa: str
    act_date: str
    act_type: str
    dept: str
    commune: str
    suffix: str | None
    ext: str


@dataclass
class PersonGroup:
    prefix: str
    sosa: str
    surname: str
    given_primary: str
    given_full: str = ""
    birth_date: str | None = None
    birth_dept: str | None = None
    birth_commune: str | None = None
    acts: list[ActFile] | None = None

    def __post_init__(self) -> None:
        if self.acts is None:
            self.acts = []


def parse_gedcom_line(line: str) -> tuple[int, str, str] | None:
    i = 0
    while i < len(line) and line[i].isdigit():
        i += 1
    if i == 0:
        return None
    level = int(line[:i])
    rest = line[i + 1 :].strip()
    if not rest:
        return level, "", ""
    parts = rest.split(" ", 1)
    tag = parts[0]
    val = parts[1] if len(parts) > 1 else ""
    return level, tag, val


def parse_gedcom_dates(date_str: str | None) -> str | None:
    if not date_str:
        return None
    date_str = date_str.strip()
    # Strip qualifiers: ABT, BEF, AFT, EST, CAL, etc.
    date_str = re.sub(r"^(ABT|BEF|AFT|EST|CAL|FROM|TO)\s+", "", date_str, flags=re.I)
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_str):
        return date_str
    if re.fullmatch(r"\d{4}", date_str):
        return f"{date_str}-01-01"
    m = re.match(r"(\d{1,2})\s+([A-Z]{3})\s+(\d{4})", date_str.upper())
    if m:
        day, mon, year = m.groups()
        if mon not in MONTHS:
            return f"{year}-01-01"
        return f"{year}-{MONTHS[mon]}-{int(day):02d}"
    m = re.match(r"([A-Z]{3})\s+(\d{4})", date_str.upper())
    if m:
        mon, year = m.groups()
        if mon not in MONTHS:
            return f"{year}-01-01"
        return f"{year}-{MONTHS[mon]}-01"
    m = re.search(r"(\d{4})", date_str)
    if m:
        return f"{m.group(1)}-01-01"
    return None


def plac_to_dept_commune(plac: str | None) -> tuple[str | None, str | None]:
    if not plac:
        return None, None
    parts = [p.strip() for p in plac.split(",") if p.strip()]
    if not parts:
        return None, None
    commune = normalize_commune(parts[0])
    dept = None
    for part in parts[1:]:
        if part.isdigit() and len(part) == 5:
            dept = part[:2]
            break
    if not dept:
        for part in parts:
            if part.isdigit() and len(part) <= 3:
                dept = part.zfill(2) if len(part) == 1 else part
                break
    return dept, commune


def load_gedcom_individuals(path: Path) -> list[dict]:
    individuals: list[dict] = []
    cur: dict | None = None
    ctx: str | None = None
    name_set = False

    with path.open(encoding="utf-8-sig", errors="replace") as fh:
        for line in fh:
            line = line.rstrip("\r\n")
            parsed = parse_gedcom_line(line)
            if parsed is None:
                continue
            level, tag, val = parsed

            if level == 0 and tag.startswith("@") and val == "INDI":
                if cur:
                    individuals.append(cur)
                cur = {
                    "id": tag,
                    "surname": "",
                    "given": "",
                    "given_primary": "",
                    "birt_date": None,
                    "birt_plac": None,
                    "deat_date": None,
                    "deat_plac": None,
                }
                ctx = None
                name_set = False
                continue

            if cur is None:
                continue

            if level == 1 and tag == "NAME":
                if name_set:
                    ctx = None
                    continue
                m = re.match(r"([^/]*)/([^/]*)/?", val)
                if m:
                    given_raw = m.group(1).strip()
                    cur["given"] = given_raw
                    cur["given_primary"] = given_raw.split()[0] if given_raw else ""
                    cur["surname"] = m.group(2).strip()
                    name_set = bool(cur["surname"] or cur["given"])
                ctx = None
            elif level == 1 and tag == "SURN":
                cur["surname"] = val.strip()
            elif level == 1 and tag == "GIVN":
                cur["given"] = val.strip()
                cur["given_primary"] = val.strip().split()[0] if val.strip() else ""
            elif level == 1 and tag == "BIRT":
                ctx = "BIRT"
            elif level == 1 and tag == "DEAT":
                ctx = "DEAT"
            elif level == 1:
                ctx = None
            elif level == 2 and ctx == "BIRT" and tag == "DATE":
                cur["birt_date"] = val.strip()
            elif level == 2 and ctx == "BIRT" and tag == "PLAC":
                cur["birt_plac"] = val.strip()
            elif level == 2 and ctx == "DEAT" and tag == "DATE":
                cur["deat_date"] = val.strip()
            elif level == 2 and ctx == "DEAT" and tag == "PLAC":
                cur["deat_plac"] = val.strip()

    if cur:
        individuals.append(cur)
    return individuals


def split_prefix(prefix: str) -> tuple[str, str, list[str]]:
    parts = prefix.split("_")
    surname = parts[0]
    given_parts = parts[1:] if len(parts) > 1 else []
    given_primary = given_parts[0] if given_parts else ""
    given_full = "_".join(given_parts) if given_parts else ""
    return surname, given_primary, given_parts, given_full


def dates_match(iso_date: str, gedcom_date: str | None) -> bool:
    parsed = parse_gedcom_dates(gedcom_date)
    if not parsed or not iso_date:
        return False
    return parsed == iso_date or parsed[:4] == iso_date[:4]


def lookup_person_in_gedcom(
    individuals: list[dict],
    surname: str,
    given_parts: list[str],
    acts: list[ActFile],
) -> tuple[str | None, str | None, str | None]:
    def first_token(given: str) -> str:
        return given.replace("_", " ").split()[0] if given else ""

    def name_matches(p: dict) -> bool:
        if p["surname"].upper() != surname.upper():
            return False
        given_norm = p["given"].replace("-", " ").upper()
        if not given_parts:
            return True
        # All filename given parts must appear as tokens in GEDCOM given name
        for part in given_parts:
            if part.upper() not in given_norm.split():
                return False
        return True

    candidates = [p for p in individuals if name_matches(p)]
    if not candidates:
        # Fallback: first given token only
        if given_parts:
            candidates = [
                p
                for p in individuals
                if p["surname"].upper() == surname.upper()
                and first_token(p["given"]).upper() == given_parts[0].upper()
            ]

    death_dates = [a.act_date for a in acts if a.act_type == "D"]
    marriage_dates = [a.act_date for a in acts if a.act_type == "M"]

    if death_dates and len(candidates) > 1:
        filtered = [p for p in candidates if any(dates_match(d, p["deat_date"]) for d in death_dates)]
        if filtered:
            candidates = filtered

    if marriage_dates and len(candidates) > 1:
        # Marriage date not stored on INDI directly; keep candidates as-is
        pass

    if len(candidates) != 1:
        exact = [
            p
            for p in candidates
            if p["given"].replace("-", " ").upper() == " ".join(given_parts).upper()
        ]
        if len(exact) == 1:
            candidates = exact

    if len(candidates) != 1 and death_dates:
        filtered = [
            p
            for p in individuals
            if any(dates_match(d, p["deat_date"]) for d in death_dates)
        ]
        if len(filtered) == 1:
            candidates = filtered

    if len(candidates) != 1:
        return None, None, None

    p = candidates[0]
    birth_date = parse_gedcom_dates(p["birt_date"])
    dept, commune = plac_to_dept_commune(p["birt_plac"])

    if birth_date and (not dept or not commune):
        dept2, commune2 = plac_to_dept_commune(p["deat_plac"])
        if not dept and dept2:
            dept = dept2
        if not commune:
            for act in acts:
                if act.dept:
                    dept = dept or act.dept
                if act.commune:
                    commune = commune or act.commune
                    break
            if not commune:
                commune = commune2 or "Lieu_inconnu"

    if not birth_date:
        # Personne identifiée sans date de naissance en GEDCOM : fallback migration
        d_acts = [a for a in acts if a.act_type == "D"]
        if d_acts:
            dept = dept or d_acts[0].dept
            commune = commune or d_acts[0].commune
        birth_date = UNKNOWN_BIRTH_DATE

    if not dept or not commune:
        for act in acts:
            dept = dept or act.dept
            commune = commune or act.commune
        if not dept or not commune:
            return None, None, None

    return birth_date, dept, commune


def parse_special_files(name: str) -> ActFile | None:
    """Handle non-standard v1 filenames."""
    if name == "MINIER_Pierre_Marie.sosa_8.armee.jpg":
        return ActFile(
            old_name=name,
            prefix="MINIER_Pierre_Marie",
            sosa="8",
            act_date="0000-00-00",
            act_type="X",
            dept="00",
            commune="armee",
            suffix=None,
            ext="jpg",
        )
    m = re.match(
        r"^(?P<prefix>.+)\.sosa_(?P<sosa>\d+)\.(?P<date>\d{4}-\d{2}-\d{2})\.N\.(?P<commune>[^.]+)\.(?P<ext>\w+)$",
        name,
        re.I,
    )
    if m:
        d = m.groupdict()
        return ActFile(
            old_name=name,
            prefix=d["prefix"],
            sosa=d["sosa"],
            act_date=d["date"],
            act_type="N",
            dept="56",
            commune=d["commune"].replace(" ", "_"),
            suffix=None,
            ext=d["ext"],
        )
    m = re.match(
        r"^(?P<prefix>.+)\.sosa_(?P<sosa>\d+)\.(?P<date>\d{4}-\d{2}-\d{2})\.x-\(contraste\)\.(?P<dept>\d+)-(?P<commune>[^.]+)\.(?P<ext>\w+)$",
        name,
        re.I,
    )
    if m:
        d = m.groupdict()
        return ActFile(
            old_name=name,
            prefix=d["prefix"],
            sosa=d["sosa"],
            act_date=d["date"],
            act_type="N",
            dept=d["dept"],
            commune=d["commune"],
            suffix="contraste",
            ext=d["ext"],
        )
    return None


def person_folder_name(group: PersonGroup) -> str:
    if not all([group.birth_date, group.birth_dept, group.birth_commune]):
        raise ValueError(f"Missing birth info for {group.prefix}.sosa_{group.sosa}")
    date_part = group.birth_date if group.birth_date else UNKNOWN_BIRTH_DATE
    surname = normalize_surname(group.surname)
    given = normalize_given_full(group.given_full.replace("_", " "))
    commune = normalize_commune(group.birth_commune.replace("_", " "))
    return f"{surname}__{given}__{date_part}__{group.birth_dept}__{commune}"


def person_folder_path(group: PersonGroup) -> str:
    letter = group.surname[0].upper()
    folder = person_folder_name(group)
    return f"{letter}/{group.surname}/{folder}"


def act_file_name(group: PersonGroup, act: ActFile) -> str:
    surname = normalize_surname(group.surname)
    given = normalize_given_full(group.given_full.replace("_", " "))
    commune = normalize_commune(act.commune.replace("_", " "))
    if act.act_type == "X":
        return f"{surname}__{given}__armee.{act.ext.lower()}"
    base = (
        f"{surname}__{given}__{act.act_type}__"
        f"{act.act_date}__{act.dept}__{commune}"
    )
    if act.suffix:
        base += f"__{act.suffix}"
    return f"{base}.{act.ext.lower()}"


def build_migration_plan(actes_dir: Path, gedcom_path: Path) -> tuple[list[dict], list[str]]:
    individuals = load_gedcom_individuals(gedcom_path)
    groups: dict[str, PersonGroup] = {}
    warnings: list[str] = []

    for entry in sorted(actes_dir.iterdir()):
        if not entry.is_file():
            warnings.append(f"Skip non-file: {entry.name}")
            continue

        act = parse_v1_filename(entry.name)
        if act is None:
            act = parse_special_files(entry.name)
            if act:
                warnings.append(f"Parsed special file: {entry.name}")

        if act is None:
            warnings.append(f"Unparsed file: {entry.name}")
            continue

        key = f"{act.prefix}.sosa_{act.sosa}"
        if key not in groups:
            surname, given_primary, given_parts, given_full = split_prefix(act.prefix)
            groups[key] = PersonGroup(
                prefix=act.prefix,
                sosa=act.sosa,
                surname=surname,
                given_primary=given_primary,
                given_full=given_full,
            )
            groups[key].given_parts = given_parts  # type: ignore[attr-defined]
        groups[key].acts.append(act)

    for key, group in groups.items():
        n_acts = [a for a in group.acts if a.act_type == "N"]
        if n_acts:
            ref = sorted(n_acts, key=lambda a: a.act_date)[0]
            group.birth_date = ref.act_date
            group.birth_dept = ref.dept
            group.birth_commune = ref.commune
        else:
            given_parts = getattr(group, "given_parts", [group.given_primary])
            bd, dept, commune = lookup_person_in_gedcom(
                individuals, group.surname, given_parts, group.acts
            )
            if bd and dept and commune:
                group.birth_date = bd
                group.birth_dept = dept
                group.birth_commune = commune
                warnings.append(f"Birth from GEDCOM for {key}: {bd} {dept} {commune}")
            else:
                # Dernier recours : clé depuis les actes seuls (sans GEDCOM)
                n_acts = [a for a in group.acts if a.act_type == "N"]
                ref = n_acts[0] if n_acts else None
                if ref:
                    group.birth_date = ref.act_date
                    group.birth_dept = ref.dept
                    group.birth_commune = ref.commune
                    warnings.append(f"Birth from N act only for {key}")
                elif group.acts:
                    ref = group.acts[0]
                    group.birth_date = UNKNOWN_BIRTH_DATE
                    group.birth_dept = ref.dept
                    group.birth_commune = ref.commune
                    warnings.append(f"Birth unknown — folder from act for {key}")
                else:
                    warnings.append(f"No birth info for {key}")

    folder_to_groups: dict[str, list[str]] = defaultdict(list)
    moves: list[dict] = []

    for key, group in sorted(groups.items()):
        if not all([group.birth_date, group.birth_dept, group.birth_commune]):
            continue
        rel_folder = person_folder_path(group)
        folder_to_groups[rel_folder].append(key)

        for act in group.acts:
            new_name = act_file_name(group, act)
            src = actes_dir / act.old_name
            dst = actes_dir / rel_folder / new_name
            moves.append(
                {
                    "src": str(src),
                    "dst": str(dst),
                    "old_name": act.old_name,
                    "new_rel": f"{rel_folder}/{new_name}",
                    "group": key,
                }
            )

    for folder, keys in folder_to_groups.items():
        if len(keys) > 1:
            warnings.append(f"Folder collision {folder}: groups {keys}")

    # Detect duplicate target paths
    dst_counts: dict[str, list[str]] = defaultdict(list)
    for mv in moves:
        dst_counts[mv["dst"]].append(mv["old_name"])
    for dst, sources in dst_counts.items():
        if len(sources) > 1:
            warnings.append(f"Duplicate target {dst}: {sources}")

    return moves, warnings


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Plan only, do not move files")
    parser.add_argument("--report", type=Path, help="Write JSON report")
    args = parser.parse_args()

    moves, warnings = build_migration_plan(ACTES_DIR, GEDCOM_PATH)

    print(f"Planned moves: {len(moves)}")
    print(f"Warnings: {len(warnings)}")
    for w in warnings:
        print(f"  WARN: {w}")

    if args.report:
        args.report.write_text(
            json.dumps({"moves": moves, "warnings": warnings}, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    if args.dry_run:
        for mv in moves[:10]:
            print(f"  {mv['old_name']} -> {mv['new_rel']}")
        if len(moves) > 10:
            print(f"  ... and {len(moves) - 10} more")
        return

    if warnings:
        unparsed = [w for w in warnings if w.startswith("Unparsed")]
        if unparsed:
            raise SystemExit(f"Aborting: {len(unparsed)} unparsed file(s). Fix or extend parser.")

    backup_manifest = ACTES_DIR / "_migration_v1_manifest.json"
    backup_manifest.write_text(
        json.dumps(
            {
                "migrated_at": datetime.now().isoformat(),
                "moves": moves,
                "warnings": warnings,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    moved = 0
    for mv in moves:
        src = Path(mv["src"])
        dst = Path(mv["dst"])
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists():
            raise SystemExit(f"Target already exists: {dst}")
        shutil.move(str(src), str(dst))
        moved += 1

    print(f"Moved {moved} files.")
    print(f"Manifest: {backup_manifest}")


if __name__ == "__main__":
    main()
