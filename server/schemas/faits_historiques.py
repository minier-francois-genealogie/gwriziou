from pydantic import BaseModel, Field


class FaitsHistoriquesStatsResponse(BaseModel):
    nombre_faits_total: int
    nombre_faits_zone: int


class FaitHistoriqueLigne(BaseModel):
    niveau: str
    niveau_label: str
    categorie: str
    categorie_label: str
    debut: str
    fin: str
    periode: str
    libelle: str
    description: str | None = None
    commune: str | None = None
    departement: str | None = None
    region: str | None = None
    pays: str | None = None
    lieu: str | None = None


class FaitsHistoriquesListResponse(BaseModel):
    lignes: list[FaitHistoriqueLigne] = Field(default_factory=list)
    nombre_faits_total: int
    nombre_faits_zone: int
