"""API REST généalogie — lecture SQLite, actes via URLs GitHub."""

from __future__ import annotations

import logging

import server.config  # noqa: F401 — configure sys.path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.config import AUTO_IMPORT, CORS_ORIGINS
from server.db import database_exists
from server.import_service import ensure_database, run_import
from server.routers.api import router as api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if AUTO_IMPORT or not database_exists():
        logger.info("Import initial ou synchronisation (AUTO_IMPORT=%s)…", AUTO_IMPORT)
        try:
            result = run_import(force=not database_exists())
            logger.info("Import terminé : %s", result)
        except Exception:
            logger.exception("Import échoué, nouvelle tentative…")
            ensure_database()
    yield


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


@app.get("/")
def root():
    return {"service": "genealogie-api", "docs": "/docs"}
