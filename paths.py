"""Référentiel données — chemins locaux (dev) et URLs GitHub (prod).

Source de vérité : https://github.com/minier-francois-genealogie/data
  - GEDCOM : ged/fminier.ged
  - Actes  : actes/

En développement : clone local sous ../data/ (dépôt minier-francois-genealogie/data).
En production (serveur + IHM déployés) : fetch depuis GitHub (raw ou git), pas le disque local.
"""

from __future__ import annotations

import os
from pathlib import Path

WS_ROOT = Path(__file__).resolve().parent

# --- GitHub (référentiel public, prod) ---------------------------------------

DATA_REPO = "minier-francois-genealogie/data"
DATA_REPO_BRANCH = os.environ.get("DATA_REPO_BRANCH", "main")
DATA_REPO_URL = os.environ.get("DATA_REPO_URL", f"https://github.com/{DATA_REPO}.git")
DATA_REPO_RAW_BASE = f"https://raw.githubusercontent.com/{DATA_REPO}/{DATA_REPO_BRANCH}"
GITHUB_API_TREE_URL = (
    f"https://api.github.com/repos/{DATA_REPO}/git/trees/{DATA_REPO_BRANCH}?recursive=1"
)

GEDCOM_REL_PATH = "ged/fminier.ged"
GEDCOM_RAW_URL = f"{DATA_REPO_RAW_BASE}/{GEDCOM_REL_PATH}"
ACTES_BASE_URL = os.environ.get("ACTES_BASE_URL", f"{DATA_REPO_RAW_BASE}/actes")

# --- Fichiers locaux (dev — clone du repo) -----------------------------------

DATA_ROOT = WS_ROOT.parent / "data"

GEDCOM_PATH = Path(os.environ.get("GEDCOM_PATH", DATA_ROOT / GEDCOM_REL_PATH))
ACTES_DIR = Path(os.environ.get("ACTES_INDEX_PATH", DATA_ROOT / "actes"))
HISTOIRE_DIR = DATA_ROOT / "histoire"
HISTOIRE_FAITS_DIR = Path(
    os.environ.get(
        "HISTOIRE_FAITS_DIR",
        os.environ.get("FAITS_HISTORIQUES_DIR", HISTOIRE_DIR / "faits"),
    )
)
HISTOIRE_FAITS_RAW_BASE = f"{DATA_REPO_RAW_BASE}/histoire/faits"
HISTOIRE_FAITS_REL_PREFIX = "histoire/faits"
DIRIGEANTS_FRANCE_REL_PATH = "histoire/dirigeants/france.json"
DIRIGEANTS_FRANCE_FILE = Path(
    os.environ.get(
        "DIRIGEANTS_FRANCE_FILE",
        HISTOIRE_DIR / "dirigeants" / "france.json",
    )
)
DIRIGEANTS_FRANCE_RAW_URL = f"{DATA_REPO_RAW_BASE}/{DIRIGEANTS_FRANCE_REL_PATH}"

# Alias rétrocompatibilité
FAITS_HISTORIQUES_DIR = HISTOIRE_FAITS_DIR
FAITS_HISTORIQUES_RAW_BASE = HISTOIRE_FAITS_RAW_BASE
