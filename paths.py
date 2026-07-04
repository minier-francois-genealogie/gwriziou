"""Référentiel données — chemins locaux (dev) et URLs GitHub (prod).

Source de vérité : https://github.com/minier-francois-genealogie/data
  - GEDCOM : ged/fminier.ged
  - Actes  : actes/

En développement : clone local sous github/data/ (données uniquement, pas de scripts).
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

DATA_ROOT = WS_ROOT.parent / "github" / "data"

GEDCOM_PATH = Path(os.environ.get("GEDCOM_PATH", DATA_ROOT / GEDCOM_REL_PATH))
ACTES_DIR = Path(os.environ.get("ACTES_INDEX_PATH", DATA_ROOT / "actes"))
