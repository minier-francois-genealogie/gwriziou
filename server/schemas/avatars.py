from pydantic import BaseModel, Field


class AvatarUpload(BaseModel):
    id_gedcom: str = Field(..., min_length=2, max_length=64)
    image_base64: str = Field(..., min_length=32)


class AvatarResponse(BaseModel):
    id_gedcom: str
    url: str
    nom_fichier: str
    chemin: str
