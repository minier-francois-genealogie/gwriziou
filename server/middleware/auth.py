"""Middleware d'authentification pour les routes API."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from server.auth_session import read_session_from_request

_PUBLIC_PREFIXES = (
    "/healthz",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/auth/request-account",
)


def _is_public(path: str) -> bool:
    if path in ("/", "/docs", "/openapi.json", "/redoc"):
        return True
    return any(path == prefix or path.startswith(f"{prefix}/") for prefix in _PUBLIC_PREFIXES)


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Laisser passer le préflight CORS (sinon PATCH/POST cross-origin échouent côté navigateur).
        if request.method == "OPTIONS":
            return await call_next(request)
        path = request.url.path
        if not path.startswith("/api") or _is_public(path):
            return await call_next(request)
        if read_session_from_request(request) is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "Authentification requise"},
            )
        return await call_next(request)
