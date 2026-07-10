from pydantic import BaseModel


class StatusResponse(BaseModel):
    importe_le: str | None
    nb_personnes: int | None
    nb_familles: int | None
    nb_actes: int | None
    nb_photos: int | None
    empreinte_gedcom: str | None
    empreinte_actes: str | None
    id_gedcom_racine: str | None
    version_schema: int | None
    import_en_cours: bool = False


class RafraichirResponse(BaseModel):
    status: str
    nb_personnes: int | None = None
    nb_familles: int | None = None
    nb_actes: int | None = None
    nb_photos: int | None = None
    message: str | None = None
