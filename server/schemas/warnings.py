from pydantic import BaseModel, Field


class WarningsStatsResponse(BaseModel):
    nombre_warning_total: int
    nombre_warning_zone: int


class WarningLigne(BaseModel):
    id_gedcom: str
    nom: str
    prenoms: str | None = None
    sexe: str | None = None
    type_evenement: str
    evenement_label: str
    evenement_date: str | None = None
    evenement_lieu: str | None = None
    code: str
    message: str
    detail: str | None = None


class WarningsListResponse(BaseModel):
    lignes: list[WarningLigne] = Field(default_factory=list)
    nombre_warning_total: int
    nombre_warning_zone: int
