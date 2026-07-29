from pydantic import BaseModel, Field


class CompteLigne(BaseModel):
    email: str
    nom: str
    prenom: str
    role: str
    actif: bool


class CompteListResponse(BaseModel):
    comptes: list[CompteLigne]
    source_fichier: str


class HashPasswordRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=256)


class HashPasswordResponse(BaseModel):
    password_hash: str


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=256)
    password: str = Field(..., min_length=1, max_length=256)


class SessionUser(BaseModel):
    email: str
    nom: str
    prenom: str
    role: str


class AuthMeResponse(BaseModel):
    authenticated: bool
    user: SessionUser | None = None


class AccountRequestPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=256)
    nom: str = Field(..., min_length=1, max_length=128)
    prenom: str = Field(..., min_length=1, max_length=128)
    password: str = Field(..., min_length=8, max_length=256)


class AccountRequestResponse(BaseModel):
    ok: bool
    message: str


class CompteActifUpdate(BaseModel):
    email: str = Field(..., min_length=3, max_length=256)
    actif: bool
