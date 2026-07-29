"""Session persistante via cookie HttpOnly (JWT signé)."""

from __future__ import annotations

import time
from typing import Any

import jwt
from fastapi import HTTPException, Request, Response

from server.config import (
    AUTH_COOKIE_NAME,
    AUTH_COOKIE_SAMESITE,
    AUTH_COOKIE_SECURE,
    AUTH_SECRET,
    AUTH_SESSION_MAX_AGE_SECONDS,
)

ALGORITHM = "HS256"


def create_session_token(*, email: str, prenom: str, nom: str, role: str) -> str:
    now = int(time.time())
    payload = {
        "sub": email,
        "prenom": prenom,
        "nom": nom,
        "role": role,
        "iat": now,
        "exp": now + AUTH_SESSION_MAX_AGE_SECONDS,
    }
    return jwt.encode(payload, AUTH_SECRET, algorithm=ALGORITHM)


def decode_session_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, AUTH_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Session invalide ou expirée") from exc


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=AUTH_SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
    )


def read_session_from_request(request: Request) -> dict[str, Any] | None:
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        return None
    try:
        return decode_session_token(token)
    except HTTPException:
        return None


def require_session(request: Request) -> dict[str, Any]:
    session = read_session_from_request(request)
    if not session:
        raise HTTPException(status_code=401, detail="Authentification requise")
    return session
