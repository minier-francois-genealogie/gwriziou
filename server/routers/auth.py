"""Routes d'authentification (login / logout / session)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, Response

from server.auth_session import (
    clear_session_cookie,
    create_session_token,
    read_session_from_request,
    set_session_cookie,
)
from server.schemas.accounts import (
    AccountRequestPayload,
    AccountRequestResponse,
    AuthMeResponse,
    LoginRequest,
    SessionUser,
)
from server.services.accounts import authenticate
from server.services.mail import send_account_request_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _session_user(payload: dict) -> SessionUser:
    return SessionUser(
        email=str(payload.get("sub", "")),
        nom=str(payload.get("nom", "")),
        prenom=str(payload.get("prenom", "")),
        role=str(payload.get("role", "user")),
    )


@router.get("/me", response_model=AuthMeResponse)
def auth_me(request: Request) -> AuthMeResponse:
    session = read_session_from_request(request)
    if not session:
        return AuthMeResponse(authenticated=False, user=None)
    return AuthMeResponse(authenticated=True, user=_session_user(session))


@router.post("/login", response_model=AuthMeResponse)
def auth_login(payload: LoginRequest, response: Response) -> AuthMeResponse:
    user = authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    token = create_session_token(
        email=user["email"],
        prenom=user["prenom"],
        nom=user["nom"],
        role=user["role"],
    )
    set_session_cookie(response, token)
    return AuthMeResponse(authenticated=True, user=SessionUser(**user))


@router.post("/logout")
def auth_logout(response: Response) -> dict[str, bool]:
    clear_session_cookie(response)
    return {"ok": True}


@router.post("/request-account", response_model=AccountRequestResponse)
def auth_request_account(payload: AccountRequestPayload) -> AccountRequestResponse:
    try:
        send_account_request_email(
            email=payload.email,
            nom=payload.nom,
            prenom=payload.prenom,
            password=payload.password,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AccountRequestResponse(
        ok=True,
        message="Demande envoyée. Un administrateur la traitera prochainement.",
    )
