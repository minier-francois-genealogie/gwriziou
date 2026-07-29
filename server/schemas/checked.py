from pydantic import BaseModel, Field


class CheckedIndexResponse(BaseModel):
    chemins: list[str]
    total: int = 0


class CheckedUpdate(BaseModel):
    chemin: str = Field(..., min_length=3, max_length=400)
    checked: bool


class CheckedStateResponse(BaseModel):
    chemin: str
    checked: bool
