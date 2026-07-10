from pydantic import BaseModel, Field


class DirigeantsFranceStatsResponse(BaseModel):
    nombre_dirigeants_total: int
    nombre_dirigeants_zone: int


class DirigeantFranceLigne(BaseModel):
    slug: str
    nom: str
    titre: str
    debut: str
    fin: str
    periode: str
    naissance: str | None = None
    deces: str | None = None
    vie: str | None = None
    regime: str | None = None
    lien_predecesseur: str | None = None
    faits_positifs: list[str] = Field(default_factory=list)
    faits_negatifs: list[str] = Field(default_factory=list)
    photo_url: str | None = None


class DirigeantsFranceListResponse(BaseModel):
    lignes: list[DirigeantFranceLigne] = Field(default_factory=list)
    nombre_dirigeants_total: int
    nombre_dirigeants_zone: int
