from pydantic import BaseModel, Field


class ProfessionMappingLigne(BaseModel):
    profession_brute: str
    effectif: int
    libelle_nuage: str
    libelle_defaut: str
    override: bool


class ProfessionMappingListResponse(BaseModel):
    lignes: list[ProfessionMappingLigne]
    nombre_professions_distinctes: int
    nombre_overrides: int


class ProfessionMappingUpdate(BaseModel):
    profession_brute: str = Field(..., min_length=1)
    libelle_nuage: str = Field(..., min_length=1)
