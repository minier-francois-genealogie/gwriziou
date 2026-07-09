#!/usr/bin/env python3
"""Résout les photo_url dirigeants via l'API Wikipédia FR (miniatures valides)."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DATA_FILE = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "histoire"
    / "dirigeants"
    / "france.json"
)
USER_AGENT = "gwriziou/1.0 (genealogie personnelle; fix photos dirigeants)"
THUMB_SIZE = 220
SLEEP_S = 3.0

# Titre Wikipédia FR (pageimages)
WIKI_TITLES: dict[str, str] = {
    "louis_xii": "Louis XII",
    "francois_i": "François Ier (roi de France)",
    "henri_ii": "Henri II (roi de France)",
    "francois_ii": "François II (roi de France)",
    "charles_ix": "Charles IX (roi de France)",
    "henri_iii": "Henri III (roi de France)",
    "henri_iv": "Henri IV (roi de France)",
    "louis_xiii": "Louis XIII",
    "louis_xiv": "Louis XIV",
    "louis_xv": "Louis XV",
    "louis_xvi": "Louis XVI",
    "napoleon_i": "Napoléon Ier",
    "louis_xviii": "Louis XVIII",
    "charles_x": "Charles X",
    "louis_philippe": "Louis-Philippe Ier",
    "napoleon_iii": "Napoléon III",
    "mac_mahon": "Patrice de Mac Mahon",
    "grevy": "Jules Grévy",
    "carnot": "Sadi Carnot (homme d'État)",
    "faure": "Félix Faure",
    "loubet": "Émile Loubet",
    "fallieres": "Armand Fallières",
    "poincare": "Raymond Poincaré",
    "millerand": "Alexandre Millerand",
    "doumer": "Paul Doumer",
    "lebrun": "Albert Lebrun",
    "petain": "Philippe Pétain",
    "de_gaulle_gprf": "Charles de Gaulle",
    "auriol": "Vincent Auriol",
    "coty": "René Coty",
    "de_gaulle": "Charles de Gaulle",
    "pompidou": "Georges Pompidou",
    "giscard": "Valéry Giscard d'Estaing",
    "mitterrand": "François Mitterrand",
    "chirac": "Jacques Chirac",
    "sarkozy": "Nicolas Sarkozy",
    "hollande": "François Hollande",
    "macron": "Emmanuel Macron",
}


def needs_fix(url: str | None) -> bool:
    if not url:
        return True
    return "440px" in url


def fetch_thumb(wiki_title: str) -> str | None:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": wiki_title,
            "prop": "pageimages",
            "format": "json",
            "pithumbsize": str(THUMB_SIZE),
        }
    )
    url = f"https://fr.wikipedia.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    data = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.load(response)
            break
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < 3:
                time.sleep(SLEEP_S * (attempt + 2))
                continue
            raise
    assert data is not None
    pages = data["query"]["pages"]
    page = next(iter(pages.values()))
    if "missing" in page:
        return None
    thumb = page.get("thumbnail")
    return thumb["source"] if thumb else None


def main() -> None:
    if not DATA_FILE.is_file():
        raise SystemExit(f"Fichier introuvable : {DATA_FILE}")

    rows = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise SystemExit("france.json doit être un tableau")

    ok = 0
    for row in rows:
        slug = row.get("slug", "")
        if not needs_fix(row.get("photo_url")):
            continue
        wiki_title = WIKI_TITLES.get(slug)
        if not wiki_title:
            print(f"? {slug}: pas de titre Wikipedia")
            continue
        try:
            thumb = fetch_thumb(wiki_title)
        except OSError as exc:
            print(f"! {slug}: {exc}")
            time.sleep(SLEEP_S * 3)
            continue
        if thumb:
            row["photo_url"] = thumb
            ok += 1
            print(f"OK {slug}")
        else:
            print(f"! {slug}: pas d'image sur « {wiki_title} »")
        time.sleep(SLEEP_S)

    DATA_FILE.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"\n{ok}/{len(rows)} photo_url mises a jour -> {DATA_FILE}")


if __name__ == "__main__":
    main()
