"""Configuration serveur API."""

from __future__ import annotations

import os
import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent
WS_ROOT = SERVER_DIR.parent
BDD_DIR = WS_ROOT / "bdd"
BDD_SCRIPTS_DIR = BDD_DIR / "scripts"
SCRIPTS_DIR = WS_ROOT / "scripts"

if str(WS_ROOT) not in sys.path:
    sys.path.insert(0, str(WS_ROOT))
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from paths import GEDCOM_PATH, GEDCOM_RAW_URL  # noqa: E402

SQLITE_PATH = Path(os.environ.get("SQLITE_PATH", BDD_DIR / "genealogie.sqlite"))
AUTO_IMPORT = os.environ.get("AUTO_IMPORT", "false").lower() in {"1", "true", "yes"}
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
