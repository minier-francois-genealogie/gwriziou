from pydantic import BaseModel, Field


class GeolocCommune(BaseModel):
    lieu_id: int
    commune: str
    departement: str | None = None
    latitude: float
    longitude: float
    nombre: int


class GeolocResponse(BaseModel):
    annee: int
    annee_min: int
    annee_max: int
    nombre_personnes: int
    communes: list[GeolocCommune] = Field(default_factory=list)
