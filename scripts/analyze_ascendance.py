#!/usr/bin/env python3
"""Analyze ascending ancestry of sosa_1 from GEDCOM for structural issues."""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from paths import GEDCOM_PATH
ROOT_SURNAME = "MINIER"
ROOT_BIRTH = "1981-11-03"


def parse_line(line: str) -> tuple[int, str, str] | None:
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
    return level, parts[0], parts[1] if len(parts) > 1 else ""


def parse_year(date_str: str | None) -> int | None:
    if not date_str:
        return None
    m = re.search(r"(\d{4})", date_str)
    return int(m.group(1)) if m else None


def load_gedcom(path: Path) -> tuple[dict[str, dict], dict[str, dict]]:
    individuals: dict[str, dict] = {}
    families: dict[str, dict] = {}
    cur_i: dict | None = None
    cur_f: dict | None = None
    ctx: str | None = None
    name_set = False

    with path.open(encoding="utf-8-sig", errors="replace") as fh:
        for line in fh:
            line = line.rstrip("\r\n")
            p = parse_line(line)
            if not p:
                continue
            level, tag, val = p

            if level == 0 and tag.startswith("@"):
                if val == "INDI":
                    if cur_i:
                        individuals[cur_i["id"]] = cur_i
                    cur_i = {
                        "id": tag,
                        "given": "",
                        "surn": "",
                        "sex": "",
                        "famc": None,
                        "fams": [],
                        "birt": None,
                        "deat": None,
                        "has_birt": False,
                        "has_deat": False,
                    }
                    cur_f = None
                    ctx = None
                    name_set = False
                elif val == "FAM":
                    if cur_i:
                        individuals[cur_i["id"]] = cur_i
                        cur_i = None
                    if cur_f:
                        families[cur_f["id"]] = cur_f
                    cur_f = {
                        "id": tag,
                        "husb": None,
                        "wife": None,
                        "chil": [],
                        "marr": None,
                    }
                    cur_i = None
                    ctx = None
                continue

            if cur_i:
                if level == 1 and tag == "NAME" and not name_set:
                    m = re.match(r"([^/]*)/([^/]*)/?", val)
                    if m:
                        cur_i["given"] = m.group(1).strip()
                        cur_i["surn"] = m.group(2).strip()
                        name_set = True
                    ctx = None
                elif level == 1 and tag == "SURN":
                    cur_i["surn"] = val.strip()
                elif level == 1 and tag == "GIVN":
                    cur_i["given"] = val.strip()
                elif level == 1 and tag == "SEX":
                    cur_i["sex"] = val.strip()
                elif level == 1 and tag == "FAMC":
                    cur_i["famc"] = val.strip()
                elif level == 1 and tag == "FAMS":
                    cur_i["fams"].append(val.strip())
                elif level == 1 and tag == "BIRT":
                    cur_i["has_birt"] = True
                    ctx = "BIRT"
                elif level == 1 and tag == "DEAT":
                    cur_i["has_deat"] = True
                    ctx = "DEAT"
                elif level == 1:
                    ctx = None
                elif level == 2 and ctx == "BIRT" and tag == "DATE":
                    cur_i["birt"] = val.strip()
                elif level == 2 and ctx == "DEAT" and tag == "DATE":
                    cur_i["deat"] = val.strip()
            elif cur_f:
                if level == 1 and tag == "HUSB":
                    cur_f["husb"] = val.strip()
                elif level == 1 and tag == "WIFE":
                    cur_f["wife"] = val.strip()
                elif level == 1 and tag == "CHIL":
                    cur_f["chil"].append(val.strip())
                elif level == 1 and tag == "MARR":
                    ctx = "MARR"
                elif level == 1:
                    ctx = None
                elif level == 2 and ctx == "MARR" and tag == "DATE":
                    cur_f["marr"] = val.strip()

    if cur_i:
        individuals[cur_i["id"]] = cur_i
    if cur_f:
        families[cur_f["id"]] = cur_f
    return individuals, families


def person_label(p: dict) -> str:
    return f"{p['given']} {p['surn']}".strip() or p["id"]


def find_root(individuals: dict[str, dict]) -> str:
    for pid, p in individuals.items():
        if p["surn"].upper() != ROOT_SURNAME:
            continue
        if "François" not in p["given"] and "Francois" not in p["given"]:
            continue
        b = p.get("birt") or ""
        if "3 NOV 1981" in b.upper() or "1981-11-03" in b:
            return pid
    raise SystemExit("Root not found")


def analyze(individuals: dict[str, dict], families: dict[str, dict], root_id: str) -> dict:
    sosa_to_id: dict[int, str] = {1: root_id}
    issues: list[dict] = []
    stack = [1]
    seen: set[int] = set()

    while stack:
        sosa = stack.pop()
        if sosa in seen:
            continue
        seen.add(sosa)

        pid = sosa_to_id[sosa]
        if pid not in individuals:
            issues.append({"type": "INDIVIDUAL_NOT_FOUND", "sosa": sosa, "gen": sosa.bit_length() - 1, "id": pid})
            continue
        p = individuals[pid]
        gen = sosa.bit_length() - 1
        famc = p.get("famc")

        if not famc:
            if sosa > 1:
                issues.append(
                    {
                        "type": "DEAD_END_NO_FAMC",
                        "sosa": sosa,
                        "gen": gen,
                        "id": pid,
                        "name": person_label(p),
                        "birt": p.get("birt"),
                    }
                )
            continue

        if famc not in families:
            issues.append(
                {
                    "type": "FAMC_NOT_FOUND",
                    "sosa": sosa,
                    "gen": gen,
                    "id": pid,
                    "name": person_label(p),
                    "famc": famc,
                }
            )
            continue

        fam = families[famc]
        if pid not in fam["chil"]:
            issues.append(
                {
                    "type": "NOT_LISTED_AS_CHILD",
                    "sosa": sosa,
                    "gen": gen,
                    "id": pid,
                    "name": person_label(p),
                    "famc": famc,
                }
            )

        husb, wife = fam.get("husb"), fam.get("wife")
        fs, ms = sosa * 2, sosa * 2 + 1

        if husb:
            if husb not in individuals:
                issues.append({"type": "FATHER_NOT_FOUND", "sosa": fs, "gen": gen + 1, "ref": husb, "child": person_label(p)})
            elif individuals[husb]["sex"] == "F":
                issues.append(
                    {
                        "type": "FATHER_IS_FEMALE",
                        "sosa": fs,
                        "gen": gen + 1,
                        "id": husb,
                        "name": person_label(individuals[husb]),
                    }
                )
        if wife:
            if wife not in individuals:
                issues.append({"type": "MOTHER_NOT_FOUND", "sosa": ms, "gen": gen + 1, "ref": wife, "child": person_label(p)})
            elif individuals[wife]["sex"] == "M":
                issues.append(
                    {
                        "type": "MOTHER_IS_MALE",
                        "sosa": ms,
                        "gen": gen + 1,
                        "id": wife,
                        "name": person_label(individuals[wife]),
                    }
                )

        if husb and husb in individuals:
            if fs in sosa_to_id and sosa_to_id[fs] != husb:
                issues.append({"type": "SOSA_CONFLICT", "sosa": fs, "a": sosa_to_id[fs], "b": husb})
            else:
                sosa_to_id[fs] = husb
                stack.append(fs)
        elif not husb:
            issues.append(
                {
                    "type": "MISSING_FATHER",
                    "sosa": fs,
                    "gen": gen + 1,
                    "child_sosa": sosa,
                    "child": person_label(p),
                    "famc": famc,
                }
            )

        if wife and wife in individuals:
            if ms in sosa_to_id and sosa_to_id[ms] != wife:
                issues.append({"type": "SOSA_CONFLICT", "sosa": ms, "a": sosa_to_id[ms], "b": wife})
            else:
                sosa_to_id[ms] = wife
                stack.append(ms)
        elif not wife:
            issues.append(
                {
                    "type": "MISSING_MOTHER",
                    "sosa": ms,
                    "gen": gen + 1,
                    "child_sosa": sosa,
                    "child": person_label(p),
                    "famc": famc,
                }
            )

        if not husb and not wife:
            issues.append({"type": "EMPTY_FAMILY", "sosa": sosa, "gen": gen, "famc": famc})

    # Date / age checks
    for sosa, pid in sorted(sosa_to_id.items()):
        p = individuals[pid]
        gen = sosa.bit_length() - 1
        by, dy = parse_year(p.get("birt")), parse_year(p.get("deat"))

        if by and dy and dy < by:
            issues.append(
                {"type": "DEATH_BEFORE_BIRTH", "sosa": sosa, "gen": gen, "name": person_label(p), "birt": p.get("birt"), "deat": p.get("deat")}
            )

        if sosa >= 2:
            child_sosa = sosa // 2
            if child_sosa in sosa_to_id:
                cy = parse_year(individuals[sosa_to_id[child_sosa]].get("birt"))
                if by and cy:
                    gap = cy - by
                    if by >= cy:
                        issues.append(
                            {
                                "type": "BIRTH_AFTER_CHILD",
                                "sosa": sosa,
                                "gen": gen,
                                "name": person_label(p),
                                "parent_year": by,
                                "child_year": cy,
                            }
                        )
                    elif gap < 12:
                        issues.append(
                            {"type": "PARENT_TOO_YOUNG", "sosa": sosa, "gen": gen, "name": person_label(p), "gap_years": gap}
                        )
                    elif gap > 65:
                        issues.append(
                            {"type": "PARENT_VERY_OLD", "sosa": sosa, "gen": gen, "name": person_label(p), "gap_years": gap}
                        )

        if not p.get("has_birt") and sosa <= 256:
            issues.append({"type": "NO_BIRT_EVENT", "sosa": sosa, "gen": gen, "name": person_label(p), "id": pid})

    # Cycles: same person at two sosas
    id_to_sosas: dict[str, list[int]] = defaultdict(list)
    for sosa, pid in sosa_to_id.items():
        id_to_sosas[pid].append(sosa)
    for pid, sosas in id_to_sosas.items():
        if len(sosas) > 1:
            issues.append(
                {
                    "type": "PERSON_DUPLICATE_IN_TREE",
                    "id": pid,
                    "name": person_label(individuals[pid]),
                    "sosas": sorted(sosas),
                }
            )

    by_type: dict[str, list] = defaultdict(list)
    for issue in issues:
        by_type[issue["type"]].append(issue)

    return {
        "root": {"id": root_id, "name": person_label(individuals[root_id]), "birt": individuals[root_id].get("birt")},
        "ancestor_count": len(sosa_to_id),
        "max_generation": max(s.bit_length() - 1 for s in sosa_to_id),
        "issue_count": len(issues),
        "by_type": {k: len(v) for k, v in sorted(by_type.items(), key=lambda x: -len(x[1]))},
        "issues": issues,
        "dead_ends": [i for i in issues if i["type"] == "DEAD_END_NO_FAMC"],
    }


def main() -> None:
    individuals, families = load_gedcom(GEDCOM_PATH)
    root_id = find_root(individuals)
    report = analyze(individuals, families, root_id)

    out = Path(__file__).resolve().parent / "ascendance_analysis.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Root: {report['root']['name']} ({report['root']['id']}) — {report['root']['birt']}")
    print(f"Ancêtres SOSA: {report['ancestor_count']}")
    print(f"Génération max: {report['max_generation']}")
    print(f"Problèmes détectés: {report['issue_count']}")
    print("\nPar type:")
    for t, n in report["by_type"].items():
        print(f"  {t}: {n}")

    print("\n--- Branches mortes (sans FAMC) ---")
    for d in sorted(report["dead_ends"], key=lambda x: x["sosa"])[:20]:
        print(f"  sosa_{d['sosa']} gen{d['gen']}: {d['name']} ({d.get('birt', '?')})")
    if len(report["dead_ends"]) > 20:
        print(f"  ... +{len(report['dead_ends']) - 20} autres")

    print(f"\nRapport: {out}")


if __name__ == "__main__":
    main()
