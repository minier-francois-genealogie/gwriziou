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

# Self-ping to avoid Render Free "spin down" on inactivity.
# Enabled by default on Render (RENDER_EXTERNAL_URL is injected automatically).
# Note: keeping the service awake consumes the Free instance hours.
_RENDER_EXTERNAL_URL = os.environ.get("RENDER_EXTERNAL_URL", "").strip().rstrip("/")
_ON_RENDER = bool(_RENDER_EXTERNAL_URL)

_self_ping_enabled_raw = os.environ.get(
    "SELF_PING_ENABLED",
    "true" if _ON_RENDER else "false",
)
SELF_PING_ENABLED = _self_ping_enabled_raw.lower() in {"1", "true", "yes"}
SELF_PING_URL = os.environ.get("SELF_PING_URL", "").strip() or (
    f"{_RENDER_EXTERNAL_URL}/healthz" if _ON_RENDER else ""
)
SELF_PING_INTERVAL_SECONDS = int(os.environ.get("SELF_PING_INTERVAL_SECONDS", "840"))  # 14 min
SELF_PING_TIMEOUT_SECONDS = float(os.environ.get("SELF_PING_TIMEOUT_SECONDS", "5"))
