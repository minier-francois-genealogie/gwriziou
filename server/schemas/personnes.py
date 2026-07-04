from pydantic import BaseModel, Field


class PersonneResume(BaseModel):
    id_gedcom: str
    nom: str
    prenoms: str | None = None
    sexe: str | None = None
    profession: str | None = None
    naissance: str | None = None
    lieu_naissance: str | None = None


class RechercheResponse(BaseModel):
    total: int
    page: int
    limit: int
    resultats: list[PersonneResume]


class EvenementResume(BaseModel):
    date: str | None = None
    date_brute: str | None = None
    lieu: str | None = None
    departement: str | None = None


class ActesPersonne(BaseModel):
    naissance_url: str | None = None
    mariage_url: str | None = None
    deces_url: str | None = None


class PhotoPersonne(BaseModel):
    url: str
    suffixe: str | None = None


class RelationResume(BaseModel):
    id_gedcom: str
    nom: str
    prenoms: str | None = None
    role: str | None = None


class RelationsPersonne(BaseModel):
    parents: list[RelationResume] = Field(default_factory=list)
    enfants: list[RelationResume] = Field(default_factory=list)
    fratrie: list[RelationResume] = Field(default_factory=list)
    conjoints: list[RelationResume] = Field(default_factory=list)


class MariageResume(BaseModel):
    date: str | None = None
    date_brute: str | None = None
    lieu: str | None = None
    conjoint: RelationResume | None = None


class PersonneDetail(BaseModel):
    id_gedcom: str
    nom: str
    prenoms: str | None = None
    sexe: str | None = None
    profession: str | None = None
    naissance: EvenementResume | None = None
    deces: EvenementResume | None = None
    mariages: list[MariageResume] = Field(default_factory=list)
    actes: ActesPersonne
    photos: list[PhotoPersonne] = Field(default_factory=list)
    relations: RelationsPersonne


class NoeudArbre(BaseModel):
    id_gedcom: str
    nom: str
    prenoms: str | None = None
    sexe: str | None = None
    profession: str | None = None
    naissance: str | None = None
    deces: str | None = None
    actes: dict[str, bool]


class AreteArbre(BaseModel):
    de: str
    vers: str
    type: str


class ArbreResponse(BaseModel):
    centre: str
    ancetres: int
    descendants: int
    noeuds: list[NoeudArbre]
    aretes: list[AreteArbre]
