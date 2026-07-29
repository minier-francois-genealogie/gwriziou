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

# Session auth (cookie HttpOnly + JWT)
AUTH_SECRET = os.environ.get("AUTH_SECRET", "dev-change-me-in-production")
AUTH_COOKIE_NAME = os.environ.get("AUTH_COOKIE_NAME", "gwriziou_session")
AUTH_SESSION_MAX_AGE_SECONDS = int(
    os.environ.get("AUTH_SESSION_MAX_AGE_SECONDS", str(30 * 24 * 3600))
)  # 30 jours
AUTH_COOKIE_SECURE = os.environ.get(
    "AUTH_COOKIE_SECURE",
    "true" if _ON_RENDER else "false",
).lower() in {"1", "true", "yes"}
AUTH_COOKIE_SAMESITE = os.environ.get(
    "AUTH_COOKIE_SAMESITE",
    "none" if _ON_RENDER else "lax",
).lower()
if AUTH_COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    AUTH_COOKIE_SAMESITE = "lax"

# Resend — demandes de création de compte
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
RESEND_FROM = os.environ.get(
    "RESEND_FROM",
    "Gwriziou <onboarding@resend.dev>",
).strip()
ACCOUNT_REQUEST_TO = os.environ.get(
    "ACCOUNT_REQUEST_TO",
    "minier.francois@gmail.com",
).strip()

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
