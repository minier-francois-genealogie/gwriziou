"""Trace key SOSA nodes and parser coverage."""
import json
import re
from pathlib import Path

GED = Path(r"C:\Projet\Perso\genealogie\data\ged\fminier.ged")

individuals = {}
families = {}
cur_i = cur_f = None
ctx = None
name_set = False


def parse_line(line):
    i = 0
    while i < len(line) and line[i].isdigit():
        i += 1
    if not i:
        return None
    level = int(line[:i])
    rest = line[i + 1 :].strip()
    if not rest:
        return level, "", ""
    p = rest.split(" ", 1)
    return level, p[0], p[1] if len(p) > 1 else ""


with GED.open(encoding="utf-8-sig", errors="replace") as fh:
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
                cur_i = {"id": tag, "name": "", "famc": None, "birt": None, "deat": None}
                cur_f = None
                name_set = False
            elif val == "FAM":
                if cur_f:
                    families[cur_f["id"]] = cur_f
                cur_f = {"id": tag, "husb": None, "wife": None, "chil": []}
                cur_i = None
            continue
        if cur_i is not None:
            if level == 1 and tag == "NAME" and not name_set:
                m = re.match(r"([^/]*)/([^/]*)/?", val)
                if m:
                    cur_i["name"] = f"{m.group(1).strip()} {m.group(2).strip()}"
                    name_set = True
            elif level == 1 and tag == "FAMC":
                cur_i["famc"] = val.strip()
            elif level == 1 and tag == "BIRT":
                ctx = "BIRT"
            elif level == 1 and tag == "DEAT":
                ctx = "DEAT"
            elif level == 1:
                ctx = None
            elif level == 2 and ctx == "BIRT" and tag == "DATE":
                cur_i["birt"] = val.strip()
            elif level == 2 and ctx == "DEAT" and tag == "DATE":
                cur_i["deat"] = val.strip()
        elif cur_f is not None:
            if level == 1 and tag == "HUSB":
                cur_f["husb"] = val.strip()
            elif level == 1 and tag == "WIFE":
                cur_f["wife"] = val.strip()
            elif level == 1 and tag == "CHIL":
                cur_f["chil"].append(val.strip())

if cur_i:
    individuals[cur_i["id"]] = cur_i
if cur_f:
    families[cur_f["id"]] = cur_f

print("@18400@ loaded:", "@18400@" in individuals)
if "@18400@" in individuals:
    print(" ", individuals["@18400@"])
print("Individuals:", len(individuals))

root = "@655@"
sosa_map = {1: root}
stack = [1]
while stack:
    s = stack.pop()
    pid = sosa_map[s]
    if pid not in individuals:
        print(f"MISSING at sosa_{s}: {pid}")
        continue
    famc = individuals[pid]["famc"]
    if not famc or famc not in families:
        continue
    f = families[famc]
    if f["husb"]:
        sosa_map[s * 2] = f["husb"]
        stack.append(s * 2)
    if f["wife"]:
        sosa_map[s * 2 + 1] = f["wife"]
        stack.append(s * 2 + 1)

print("\n--- Lignée directe sosa 1-16 ---")
for s in range(1, 17):
    if s in sosa_map:
        p = individuals[sosa_map[s]]
        print(f"sosa_{s:2d} gen{s.bit_length()-1}: {p['name']} ({sosa_map[s]}) {p.get('birt','')}")

print("\n--- Doublons proches ---")
for s in [32, 46, 33, 47, 64, 92]:
    if s in sosa_map:
        p = individuals[sosa_map[s]]
        print(f"sosa_{s}: {p['name']} {p.get('birt')}")

r = json.load(open(Path(__file__).parent / "ascendance_analysis.json", encoding="utf-8"))
print("\n--- Problèmes dates / liens ---")
for i in r["issues"]:
    if i["type"] in (
        "BIRTH_AFTER_CHILD",
        "PARENT_TOO_YOUNG",
        "MOTHER_NOT_FOUND",
        "FATHER_NOT_FOUND",
        "NOT_LISTED_AS_CHILD",
        "FAMC_NOT_FOUND",
    ):
        print(i)
