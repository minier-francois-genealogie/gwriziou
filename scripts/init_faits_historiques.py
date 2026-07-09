#!/usr/bin/env python3
"""Crée la structure vide faits_historiques/ à partir des lieux du GEDCOM."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

WS_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WS_ROOT))
sys.path.insert(0, str(WS_ROOT / "scripts"))

from act_path_normalize import normalize_commune  # noqa: E402
from analyze_ascendance import parse_line  # noqa: E402
from paths import GEDCOM_PATH  # noqa: E402


def parse_plac(raw: str) -> tuple[str, str | None, str | None, str | None, str | None]:
    parts = [part.strip() for part in raw.split(",")]
    commune = parts[0] if parts else ""
    code_postal = parts[1] if len(parts) > 1 and parts[1].isdigit() else None
    departement = parts[2] if len(parts) > 2 else None
    region = parts[3] if len(parts) > 3 else None
    pays = parts[4] if len(parts) > 4 else None
    return commune, code_postal, departement, region, pays


def slug_label(value: str) -> str:
    return normalize_commune(value).lower()


def collect_plac_values(gedcom_path: Path) -> set[str]:
    placs: set[str] = set()
    with gedcom_path.open(encoding="utf-8-sig", errors="replace") as fh:
        for line in fh:
            parsed = parse_line(line.rstrip("\r\n"))
            if parsed and parsed[1] == "PLAC" and parsed[2].strip():
                placs.add(parsed[2].strip())
    return placs


def build_index(
    placs: set[str],
) -> tuple[dict[str, dict], dict[str, dict], dict[str, dict], dict[str, dict]]:
    communes: dict[str, dict] = {}
    regions: dict[str, dict] = {}
    departements: dict[str, dict] = {}
    pays_map: dict[str, dict] = {}

    for plac in placs:
        commune, code_postal, departement, region, pays = parse_plac(plac)
        if commune:
            commune_label = commune.split(",")[0].strip()
            cslug = slug_label(commune_label)
            current = communes.get(cslug)
            if current is None or len(plac) < len(current["libelle_brut_exemple"]):
                communes[cslug] = {
                    "slug": cslug,
                    "commune": commune_label,
                    "code_postal": code_postal,
                    "departement": departement,
                    "region": region,
                    "pays": pays,
                    "libelle_brut_exemple": plac,
                }
        if region:
            rslug = slug_label(region)
            regions[rslug] = {"slug": rslug, "region": region}
        if departement:
            dslug = slug_label(departement)
            departements[dslug] = {
                "slug": dslug,
                "departement": departement,
                "region": region,
            }
        if pays:
            pslug = slug_label(pays)
            pays_map[pslug] = {"slug": pslug, "pays": pays}

    return communes, regions, departements, pays_map


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_json_if_missing(path: Path, payload: object) -> None:
    if path.exists():
        return
    write_json(path, payload)


def init_structure(
    output_dir: Path,
    gedcom_path: Path,
    *,
    overwrite_readme: bool = False,
) -> dict[str, int]:
    placs = collect_plac_values(gedcom_path)
    communes, regions, departements, pays_map = build_index(placs)

    output_dir.mkdir(parents=True, exist_ok=True)
    write_json_if_missing(output_dir / "monde.json", [])
    legacy_national = output_dir / "national.json"
    if legacy_national.exists() and legacy_national.read_text(encoding="utf-8").strip() in {"[]", ""}:
        legacy_national.unlink()

    national_dir = output_dir / "national"
    if not pays_map:
        write_json_if_missing(national_dir / "france.json", [])
    for meta in sorted(pays_map.values(), key=lambda item: item["slug"]):
        write_json_if_missing(national_dir / f"{meta['slug']}.json", [])

    regional_dir = output_dir / "regional"
    for meta in sorted(regions.values(), key=lambda item: item["slug"]):
        write_json_if_missing(regional_dir / f"{meta['slug']}.json", [])

    departement_dir = output_dir / "departement"
    for meta in sorted(departements.values(), key=lambda item: item["slug"]):
        write_json_if_missing(departement_dir / f"{meta['slug']}.json", [])

    communal_dir = output_dir / "communal"
    index_communes = []
    for meta in sorted(communes.values(), key=lambda item: item["slug"]):
        write_json_if_missing(communal_dir / f"{meta['slug']}.json", [])
        index_communes.append(meta)
    write_json(communal_dir / "_index.json", index_communes)

    meta = {
        "source_gedcom": str(gedcom_path.resolve()),
        "nb_plac_distincts": len(placs),
        "nb_communes": len(communes),
        "nb_regions": len(regions),
        "nb_departements": len(departements),
        "nb_pays": len(pays_map),
        "pays": [item["pays"] for item in sorted(pays_map.values(), key=lambda x: x["slug"])],
        "regions": [item["region"] for item in sorted(regions.values(), key=lambda x: x["slug"])],
        "departements": [
            item["departement"] for item in sorted(departements.values(), key=lambda x: x["slug"])
        ],
    }
    write_json(output_dir / "_meta.json", meta)

    readme = output_dir / "README.md"
    if overwrite_readme or not readme.exists():
        readme.write_text(
            """# Faits historiques

Référentiel de contexte historique (événements mondiaux, nationaux, régionaux, communaux).

## Structure

- `monde.json` — faits mondiaux (`type: MONDE`, ex. guerres mondiales, pandémies)
- `national/<pays>.json` — faits nationaux (`type: NATIONAL`, ex. règnes avec `categorie: REGNE`)
  - `national/france.json` pour la France (pays dominant du GEDCOM)
- `regional/<slug>.json` — faits régionaux (`type: REGIONAL`)
- `departement/<slug>.json` — faits départementaux
- `communal/<slug>.json` — faits communaux (`type: COMMUNAL`)

Chaque fichier est un **tableau JSON trié par `debut`** (à respecter à la saisie).

## Slugs de fichiers

Les noms de fichiers reprennent les lieux du GEDCOM (`fminier.ged`) :
ASCII, sans accents, espaces/tirets → `_` (ex. `saint_guyomard.json`, `morbihan.json`, `france.json`).

## Exemples d'entrées

Monde :

```json
{
  "type": "MONDE",
  "categorie": "GUERRE",
  "debut": "1939",
  "fin": "1945",
  "libelle": "Seconde Guerre mondiale"
}
```

France (règne) :

```json
{
  "type": "NATIONAL",
  "categorie": "REGNE",
  "debut": "1830",
  "fin": "1848",
  "libelle": "Monarchie de Juillet",
  "description": "Louis-Philippe Ier, roi des Français",
  "pays": "FR"
}
```

## Régénérer la structure vide

Depuis le monorepo `gwriziou` :

```powershell
python scripts/init_faits_historiques.py
```

Ajoute les fichiers manquants pour de nouvelles communes du GEDCOM, sans écraser le contenu existant.
""",
            encoding="utf-8",
        )

    return {
        "plac": len(placs),
        "communes": len(communes),
        "regions": len(regions),
        "departements": len(departements),
        "pays": len(pays_map),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialise faits_historiques/ depuis le GEDCOM")
    parser.add_argument(
        "--gedcom",
        type=Path,
        default=GEDCOM_PATH,
        help="Chemin du GEDCOM source",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=GEDCOM_PATH.resolve().parent.parent / "faits_historiques",
        help="Répertoire de sortie (défaut: data/faits_historiques)",
    )
    parser.add_argument(
        "--overwrite-readme",
        action="store_true",
        help="Réécrit README.md même s'il existe",
    )
    args = parser.parse_args()

    if not args.gedcom.is_file():
        raise SystemExit(f"GEDCOM introuvable : {args.gedcom}")

    counts = init_structure(
        args.output,
        args.gedcom,
        overwrite_readme=args.overwrite_readme,
    )
    print(f"Structure creee dans : {args.output.resolve()}")
    print(
        f"{counts['plac']} PLAC distincts -> "
        f"{counts['communes']} communes, "
        f"{counts['regions']} regions, "
        f"{counts['departements']} departements, "
        f"{counts['pays']} pays"
    )


if __name__ == "__main__":
    main()
