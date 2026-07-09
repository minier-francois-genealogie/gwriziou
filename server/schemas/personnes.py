from pydantic import BaseModel, Field


class PersonneResume(BaseModel):
    id_gedcom: str
    nom: str
    prenoms: str | None = None
    sexe: str | None = None
    profession: str | None = None
    naissance: str | None = None
    lieu_naissance: str | None = None
    deces: str | None = None
    lieu_deces: str | None = None
    date_naissance_min_approximation: str | None = None
    date_naissance_min_regle: str | None = None
    date_deces_max: str | None = None
    date_deces_max_approximation: str | None = None
    date_deces_max_regle: str | None = None
    naissance_gedcom: bool = False
    deces_gedcom: bool = False


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


class ActeResume(BaseModel):
    url: str
    type: str
    date: str | None = None
    date_brute: str | None = None
    lieu: str | None = None


class WarningEvenement(BaseModel):
    code: str
    message: str
    detail: str | None = None


class RelationResume(BaseModel):
    id_gedcom: str
    nom: str
    prenoms: str | None = None
    sexe: str | None = None
    role: str | None = None
    naissance: EvenementResume | None = None
    deces: EvenementResume | None = None
    photos: bool = False


class EvenementArbre(BaseModel):
    type: str
    date: str | None = None
    date_brute: str | None = None
    lieu: str | None = None
    departement: str | None = None
    acte: ActeResume | None = None
    warnings: list[WarningEvenement] = Field(default_factory=list)
    id_famille: str | None = None
    conjoint: RelationResume | None = None
    enfant: RelationResume | None = None


class ActesPersonne(BaseModel):
    naissance: ActeResume | None = None
    mariage: ActeResume | None = None
    deces: ActeResume | None = None


class PhotoPersonne(BaseModel):
    url: str
    suffixe: str | None = None


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


class FaitHistorique(BaseModel):
    niveau: str
    categorie: str
    debut: str
    fin: str
    libelle: str
    description: str | None = None
    commune: str | None = None
    departement: str | None = None
    region: str | None = None
    pays: str | None = None


class DirigeantFrance(BaseModel):
    slug: str
    nom: str
    titre: str
    debut: str
    fin: str
    periode: str
    photo_url: str | None = None


class PersonneDetail(BaseModel):
    id_gedcom: str
    nom: str
    prenoms: str | None = None
    surnom: str | None = None
    anecdote: str | None = None
    sexe: str | None = None
    profession: str | None = None
    naissance: EvenementResume | None = None
    deces: EvenementResume | None = None
    date_naissance_min_approximation: str | None = None
    date_naissance_min_regle: str | None = None
    date_deces_max: str | None = None
    date_deces_max_approximation: str | None = None
    date_deces_max_regle: str | None = None
    naissance_gedcom: bool = False
    deces_gedcom: bool = False
    mariages: list[MariageResume] = Field(default_factory=list)
    actes: ActesPersonne
    evenements: list[EvenementArbre] = Field(default_factory=list)
    photos: list[PhotoPersonne] = Field(default_factory=list)
    relations: RelationsPersonne
    faits_historiques: list[FaitHistorique] = Field(default_factory=list)
    dirigeants_france: list[DirigeantFrance] = Field(default_factory=list)


class NoeudArbre(BaseModel):
    id_gedcom: str
    nom: str
    prenoms: str | None = None
    sexe: str | None = None
    profession: str | None = None
    naissance_tri: str | None = None
    photos: bool = False
    evenements: list[EvenementArbre] = Field(default_factory=list)
    date_naissance_min_approximation: str | None = None
    date_naissance_min_regle: str | None = None
    date_deces_max: str | None = None
    date_deces_max_approximation: str | None = None
    date_deces_max_regle: str | None = None
    naissance_gedcom: bool = False
    deces_gedcom: bool = False


class NoeudUnion(BaseModel):
    id_famille: str
    date: str | None = None
    date_brute: str | None = None
    lieu: str | None = None
    acte_m: bool = False
    acte: ActeResume | None = None


class AreteArbre(BaseModel):
    de: str
    vers: str
    type: str


class ArbreResponse(BaseModel):
    centre: str
    ancetres: int
    descendants: int
    noeuds: list[NoeudArbre]
    unions: list[NoeudUnion] = Field(default_factory=list)
    aretes: list[AreteArbre]
