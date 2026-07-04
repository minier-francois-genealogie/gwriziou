#!/usr/bin/env python3
"""Create 0-byte placeholder act files for missing N/M/D acts of sosa_1 ancestors."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from act_path_normalize import normalize_commune, normalize_given_full, normalize_surname

ACTES_DIR = Path(r"C:\Projet\Perso\genealogie\data\actes")
GEDCOM_PATH = Path(r"C:\Projet\Perso\genealogie\data\ged\fminier.ged")

UNKNOWN_DATE = "XXXX-XX-XX"
UNKNOWN_DEPT = "XX"
UNKNOWN_COMMUNE = "X"

ROOT_SURNAME = "MINIER"
ROOT_BIRTH_DATE = "1981-11-03"

MONTHS = {
    "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06",
    "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12",
}

PERSON_FOLDER_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenoms>.+)__(?P<bdate>\d{4}-\d{2}-\d{2}|XXXX-XX-XX)__"
    r"(?P<dept>\d+|XX)__(?P<bcommune>.+)$"
)
ACT_FILE_RE = re.compile(
    r"^(?P<nom>[^_]+)__(?P<prenoms>.+)__(?P<type>[NDM])__"
    r"(?P<date>(?:\d{4}|XXXX)-(?:\d{2}|XX)-(?:\d{2}|XX))__"
    r"(?P<dept>\d+|XX)__(?P<commune>[^._]+)"
    r"(?:__(?P<suffix>[^.]+))?\.(?P<ext>\w+)$",
    re.I,
)


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
    date_str = re.sub(r"^(ABT|BEF|AFT|EST|CAL|FROM|TO)\s+", "", date_str.strip(), flags=re.I)
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


def plac_to_dept_commune(plac: str | None) -> tuple[str, str]:
    if not plac:
        return UNKNOWN_DEPT, UNKNOWN_COMMUNE
    parts = [p.strip() for p in plac.split(",") if p.strip()]
    if not parts:
        return UNKNOWN_DEPT, UNKNOWN_COMMUNE
    commune = normalize_commune(parts[0])
    dept = UNKNOWN_DEPT
    for part in parts[1:]:
        if part.isdigit() and len(part) == 5:
            dept = part[:2]
            break
    if dept == UNKNOWN_DEPT:
        for part in parts:
            if part.isdigit() and len(part) <= 3:
                dept = part.zfill(2) if len(part) == 1 else part
                break
    return dept, commune


def event_date(raw: str | None) -> str:
    return parse_gedcom_dates(raw) or UNKNOWN_DATE


def event_place(raw: str | None) -> tuple[str, str]:
    if not raw:
        return UNKNOWN_DEPT, UNKNOWN_COMMUNE
    return plac_to_dept_commune(raw)


def load_gedcom(path: Path) -> tuple[dict[str, dict], dict[str, dict]]:
    individuals: dict[str, dict] = {}
    families: dict[str, dict] = {}
    cur_indi: dict | None = None
    cur_fam: dict | None = None
    indi_ctx: str | None = None
    fam_ctx: str | None = None
    name_set = False

    with path.open(encoding="utf-8-sig", errors="replace") as fh:
        for line in fh:
            line = line.rstrip("\r\n")
            parsed = parse_gedcom_line(line)
            if parsed is None:
                continue
            level, tag, val = parsed

            if level == 0 and tag.startswith("@"):
                if val == "INDI":
                    if cur_indi:
                        individuals[cur_indi["id"]] = cur_indi
                    cur_indi = {
                        "id": tag,
                        "surname": "",
                        "given": "",
                        "sex": "",
                        "famc": None,
                        "fams": [],
                        "has_birt": False,
                        "has_deat": False,
                        "birt_date": None,
                        "birt_plac": None,
                        "deat_date": None,
                        "deat_plac": None,
                    }
                    cur_fam = None
                    indi_ctx = None
                    name_set = False
                    continue
                if val == "FAM":
                    if cur_fam:
                        families[cur_fam["id"]] = cur_fam
                    cur_fam = {
                        "id": tag,
                        "husb": None,
                        "wife": None,
                        "marr_date": None,
                        "marr_plac": None,
                    }
                    cur_indi = None
                    fam_ctx = None
                    continue

            if cur_indi is not None:
                if level == 1 and tag == "NAME":
                    if not name_set:
                        m = re.match(r"([^/]*)/([^/]*)/?", val)
                        if m:
                            cur_indi["given"] = m.group(1).strip()
                            cur_indi["surname"] = m.group(2).strip()
                            name_set = bool(cur_indi["surname"] or cur_indi["given"])
                    indi_ctx = None
                elif level == 1 and tag == "SURN":
                    cur_indi["surname"] = val.strip()
                elif level == 1 and tag == "GIVN":
                    cur_indi["given"] = val.strip()
                elif level == 1 and tag == "SEX":
                    cur_indi["sex"] = val.strip()
                elif level == 1 and tag == "FAMC":
                    cur_indi["famc"] = val.strip()
                elif level == 1 and tag == "FAMS":
                    cur_indi["fams"].append(val.strip())
                elif level == 1 and tag == "BIRT":
                    cur_indi["has_birt"] = True
                    indi_ctx = "BIRT"
                elif level == 1 and tag == "DEAT":
                    cur_indi["has_deat"] = True
                    indi_ctx = "DEAT"
                elif level == 1:
                    indi_ctx = None
                elif level == 2 and indi_ctx == "BIRT" and tag == "DATE":
                    cur_indi["birt_date"] = val.strip()
                elif level == 2 and indi_ctx == "BIRT" and tag == "PLAC":
                    cur_indi["birt_plac"] = val.strip()
                elif level == 2 and indi_ctx == "DEAT" and tag == "DATE":
                    cur_indi["deat_date"] = val.strip()
                elif level == 2 and indi_ctx == "DEAT" and tag == "PLAC":
                    cur_indi["deat_plac"] = val.strip()

            elif cur_fam is not None:
                if level == 1 and tag == "HUSB":
                    cur_fam["husb"] = val.strip()
                elif level == 1 and tag == "WIFE":
                    cur_fam["wife"] = val.strip()
                elif level == 1 and tag == "MARR":
                    fam_ctx = "MARR"
                elif level == 1:
                    fam_ctx = None
                elif level == 2 and fam_ctx == "MARR" and tag == "DATE":
                    cur_fam["marr_date"] = val.strip()
                elif level == 2 and fam_ctx == "MARR" and tag == "PLAC":
                    cur_fam["marr_plac"] = val.strip()

    if cur_indi:
        individuals[cur_indi["id"]] = cur_indi
    if cur_fam:
        families[cur_fam["id"]] = cur_fam
    return individuals, families


def find_root(individuals: dict[str, dict]) -> str:
    for pid, p in individuals.items():
        if p["surname"].upper() != ROOT_SURNAME:
            continue
        if "François" not in p["given"] and "Francois" not in p["given"]:
            continue
        if event_date(p["birt_date"]) == ROOT_BIRTH_DATE:
            return pid
    raise SystemExit(f"Root not found: {ROOT_SURNAME} François born {ROOT_BIRTH_DATE}")


def compute_ancestors(
    root_id: str, individuals: dict[str, dict], families: dict[str, dict]
) -> dict[int, str]:
    sosa_to_id: dict[int, str] = {1: root_id}
    stack = [1]
    while stack:
        sosa = stack.pop()
        person = individuals[sosa_to_id[sosa]]
        famc = person.get("famc")
        if not famc or famc not in families:
            continue
        fam = families[famc]
        for child_sosa, role in ((sosa * 2, "husb"), (sosa * 2 + 1, "wife")):
            parent_id = fam.get(role)
            if parent_id and parent_id in individuals and child_sosa not in sosa_to_id:
                sosa_to_id[child_sosa] = parent_id
                stack.append(child_sosa)
    return sosa_to_id


def person_identity(person: dict) -> tuple[str, str, str, str, str]:
    surname = normalize_surname(person["surname"] or "X")
    given_full = normalize_given_full(person["given"])
    birth_date = event_date(person["birt_date"])
    birth_dept, birth_commune = event_place(person["birt_plac"])
    return surname, given_full, birth_date, birth_dept, birth_commune


def person_folder_name(surname: str, given_full: str, bdate: str, dept: str, commune: str) -> str:
    return f"{surname}__{given_full}__{bdate}__{dept}__{commune}"


def person_folder_rel(surname: str, folder_name: str) -> str:
    letter = surname[0].upper()
    return f"{letter}/{surname}/{folder_name}"


def act_file_name(
    surname: str, given_full: str, act_type: str, act_date: str, dept: str, commune: str
) -> str:
    return f"{surname}__{given_full}__{act_type}__{act_date}__{dept}__{commune}.jpg"


def given_tokens(given_full: str) -> tuple[str, ...]:
    return tuple(t.upper() for t in given_full.split("_") if t)


def index_existing_actes(actes_dir: Path) -> tuple[set[str], set[tuple[str, tuple[str, ...], str, str]]]:
    """Return all act relative paths and keys (surname, given tokens, type, date)."""
    paths: set[str] = set()
    act_keys: set[tuple[str, tuple[str, ...], str, str]] = set()

    for f in actes_dir.rglob("*"):
        if not f.is_file():
            continue
        if f.suffix.lower() not in {".jpg", ".jpeg", ".pdf", ".png"}:
            continue
        rel = str(f.relative_to(actes_dir)).replace("\\", "/")
        paths.add(rel)
        m = ACT_FILE_RE.match(f.name)
        if m:
            d = m.groupdict()
            key = (d["nom"].upper(), given_tokens(d["prenoms"]), d["type"].upper(), d["date"])
            act_keys.add(key)
    return paths, act_keys


def folder_has_real_act(folder: Path, act_type: str, act_date: str | None = None) -> bool:
    if not folder.is_dir():
        return False
    for f in folder.iterdir():
        if not f.is_file() or f.stat().st_size == 0:
            continue
        m = ACT_FILE_RE.match(f.name)
        if not m or m.group("type").upper() != act_type:
            continue
        if act_date and m.group("date") != act_date:
            continue
        return True
    return False


def find_existing_folder(
    actes_dir: Path, surname: str, given_full: str, birth_date: str
) -> Path | None:
    letter = surname[0].upper()
    surname_dir = actes_dir / letter / surname
    if not surname_dir.is_dir():
        return None
    tokens = given_tokens(given_full)
    birth_year = birth_date[:4] if birth_date != UNKNOWN_DATE else None
    candidates: list[Path] = []
    for d in surname_dir.iterdir():
        if not d.is_dir():
            continue
        m = PERSON_FOLDER_RE.match(d.name)
        if not m:
            continue
        gd = m.groupdict()
        if gd["nom"].upper() != surname.upper():
            continue
        if given_tokens(gd["prenoms"]) != tokens:
            continue
        if birth_year and gd["bdate"] != UNKNOWN_DATE and gd["bdate"][:4] != birth_year:
            continue
        candidates.append(d)
    if len(candidates) == 1:
        return candidates[0]
    if len(candidates) > 1:
        for d in candidates:
            if UNKNOWN_DATE not in d.name and birth_date in d.name:
                return d
        return candidates[0]
    return None


def expected_acts(
    person: dict, families: dict[str, dict]
) -> list[tuple[str, str, str, str]]:
    acts: list[tuple[str, str, str, str]] = []

    b_dept, b_commune = event_place(person["birt_plac"])
    acts.append(("N", event_date(person["birt_date"]), b_dept, b_commune))

    if person["has_deat"]:
        d_dept, d_commune = event_place(person["deat_plac"])
        acts.append(("D", event_date(person["deat_date"]), d_dept, d_commune))

    for fam_id in person.get("fams") or []:
        fam = families.get(fam_id)
        if not fam:
            continue
        m_dept, m_commune = event_place(fam.get("marr_plac"))
        acts.append(("M", event_date(fam.get("marr_date")), m_dept, m_commune))

    return acts


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate missing act placeholders for sosa ancestors")
    parser.add_argument("--dry-run", action="store_true", help="Report only, do not create files")
    args = parser.parse_args()

    individuals, families = load_gedcom(GEDCOM_PATH)
    root_id = find_root(individuals)
    root = individuals[root_id]
    sosa_map = compute_ancestors(root_id, individuals, families)

    existing_paths, existing_act_keys = index_existing_actes(ACTES_DIR)

    created: list[dict] = []
    skipped: list[dict] = []
    warnings: list[str] = []

    for sosa in sorted(sosa_map):
        pid = sosa_map[sosa]
        person = individuals[pid]
        surname, given_full, bdate, bdept, bcommune = person_identity(person)
        if not given_full:
            warnings.append(f"sosa_{sosa} {pid}: no given name, skipped")
            continue

        folder_name = person_folder_name(surname, given_full, bdate, bdept, bcommune)
        existing_folder = find_existing_folder(ACTES_DIR, surname, given_full, bdate)
        if existing_folder:
            rel_folder = str(existing_folder.relative_to(ACTES_DIR)).replace("\\", "/")
        else:
            rel_folder = person_folder_rel(surname, folder_name)

        person_key_base = (surname.upper(), given_tokens(given_full))

        for act_type, act_date, dept, commune in expected_acts(person, families):
            dept = dept or UNKNOWN_DEPT
            commune = normalize_commune(commune.replace("_", " ")) if commune else UNKNOWN_COMMUNE
            act_key = (*person_key_base, act_type, act_date)
            if act_key in existing_act_keys:
                skipped.append({"sosa": sosa, "reason": "act already indexed", "type": act_type})
                continue

            folder_path = ACTES_DIR / rel_folder
            date_check = act_date if act_type == "M" else None
            if folder_has_real_act(folder_path, act_type, date_check):
                skipped.append({"sosa": sosa, "reason": "real scan in folder", "type": act_type})
                continue

            filename = act_file_name(surname, given_full, act_type, act_date, dept, commune)
            rel_path = f"{rel_folder}/{filename}"

            if rel_path in existing_paths:
                skipped.append({"sosa": sosa, "reason": "file exists", "path": rel_path})
                continue

            target = ACTES_DIR / rel_path
            entry = {
                "sosa": sosa,
                "gedcom_id": pid,
                "path": rel_path,
                "person": f"{surname} {person['given']}",
            }
            created.append(entry)

            if not args.dry_run:
                try:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.touch()
                except OSError as exc:
                    warnings.append(f"Cannot create {rel_path}: {exc}")
                    created.pop()

    manifest = ACTES_DIR / "_generate_missing_placeholders_manifest.json"
    report = {
        "at": datetime.now().isoformat(),
        "dry_run": args.dry_run,
        "root": {
            "gedcom_id": root_id,
            "name": f"{root['given']} {root['surname']}",
            "birth": ROOT_BIRTH_DATE,
        },
        "ancestors_count": len(sosa_map),
        "created_count": len(created),
        "skipped_count": len(skipped),
        "warnings": warnings,
        "created": created,
    }
    manifest.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Root: {root['given']} {root['surname']} ({root_id})")
    print(f"Ancestors (SOSA): {len(sosa_map)}")
    print(f"Placeholders {'to create' if args.dry_run else 'created'}: {len(created)}")
    print(f"Skipped (act already present): {len(skipped)}")
    if warnings:
        print(f"Warnings: {len(warnings)}")
    if created[:3]:
        print("Examples:")
        for c in created[:3]:
            print(f"  sosa_{c['sosa']} -> {c['path']}")
    print(f"Manifest: {manifest}")


if __name__ == "__main__":
    main()
