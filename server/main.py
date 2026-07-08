"""API REST généalogie — lecture SQLite, actes via URLs GitHub."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import urllib.request

import server.config  # noqa: F401 — configure sys.path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.config import (
    AUTO_IMPORT,
    CORS_ORIGINS,
    SELF_PING_ENABLED,
    SELF_PING_INTERVAL_SECONDS,
    SELF_PING_TIMEOUT_SECONDS,
    SELF_PING_URL,
)
from server.db import database_exists
from server.import_service import ensure_database, run_import
from server.routers.api import router as api_router

logger = logging.getLogger(__name__)


def _self_ping_once(url: str, timeout_seconds: float) -> None:
    # Stdlib HTTP client to keep requirements unchanged.
    req = urllib.request.Request(url, method="GET", headers={"User-Agent": "gwriziou-self-ping"})
    with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:  # nosec B310
        resp.read(128)


async def _self_ping_loop() -> None:
    # Keeps the Free container from spinning down on inactivity.
    # Only works while the container is already running.
    if not SELF_PING_URL:
        logger.warning("SELF_PING_ENABLED is true but SELF_PING_URL is empty; skipping.")
        return

    interval_s = max(30, SELF_PING_INTERVAL_SECONDS)
    timeout_s = max(1.0, SELF_PING_TIMEOUT_SECONDS)
    logger.info("Self-ping enabled: %s every %ss", SELF_PING_URL, interval_s)

    while True:
        try:
            await asyncio.to_thread(_self_ping_once, SELF_PING_URL, timeout_s)
        except Exception:
            # Transient failures are OK; retry later.
            logger.debug("Self-ping failed", exc_info=True)
        await asyncio.sleep(interval_s)


async def _run_startup_import() -> None:
    if not (AUTO_IMPORT or not database_exists()):
        return
    logger.info("Import initial ou synchronisation (AUTO_IMPORT=%s)…", AUTO_IMPORT)
    try:
        result = await asyncio.to_thread(run_import, force=not database_exists())
        logger.info("Import terminé : %s", result)
    except Exception:
        logger.exception("Import échoué, nouvelle tentative…")
        await asyncio.to_thread(ensure_database)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    self_ping_task: asyncio.Task[None] | None = None
    # Import in background so uvicorn binds PORT before Render's port scan.
    asyncio.create_task(_run_startup_import())

    if SELF_PING_ENABLED:
        self_ping_task = asyncio.create_task(_self_ping_loop())

    yield

    if self_ping_task is not None:
        self_ping_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self_ping_task


app = FastAPI(
    title="Généalogie Minier",
    description="API REST — index SQLite, scans servis par GitHub",
    version="0.1.0",
    lifespan=lifespan,
)

_origins = [o.strip() for o in CORS_ORIGINS if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials="*" not in _origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/healthz", include_in_schema=False)
def healthz():
    # Ultra-léger : utilisé par le self-ping Render Free.
    return {"ok": True}


@app.get("/")
def root():
    return {"service": "gwriziou-api", "docs": "/docs"}
