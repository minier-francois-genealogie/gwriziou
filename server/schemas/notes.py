from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    chemin: str = Field(..., min_length=3, max_length=400)
    texte: str = Field(..., min_length=1, max_length=4000)


class NoteLigne(BaseModel):
    id: str
    cle: str
    chemin: str
    fichier: str
    auteur_email: str
    auteur_nom: str
    cree_le: str
    texte: str


class NoteListResponse(BaseModel):
    notes: list[NoteLigne]
    source: str


class NoteDelete(BaseModel):
    chemin: str = Field(..., min_length=3, max_length=400)
    fichier: str = Field(..., min_length=3, max_length=200)


class NoteIndexResponse(BaseModel):
    chemins: list[str]
    total: int = 0
