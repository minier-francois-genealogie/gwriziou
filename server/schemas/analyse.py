from pydantic import BaseModel


class AnalyseStatsResponse(BaseModel):
    nombre_personnes_total: int
    nombre_personnes_zone: int
    nombre_familles_zone: int
    hommes_zone: int
    femmes_zone: int
    sexe_inconnu_zone: int
    avec_profession_zone: int
    avec_naissance_zone: int
    avec_deces_zone: int
    age_moyen_deces_zone: float | None
    enfants_par_famille_moyen: float | None
    enfants_par_famille_max: int


class ProfessionNuageItem(BaseModel):
    profession: str
    effectif: int


class ProfessionsNuageResponse(BaseModel):
    lignes: list[ProfessionNuageItem]
    nombre_avec_profession: int
    nombre_sans_profession: int
    nombre_personnes_total: int
    nombre_personnes_scope: int


class CompteParLabel(BaseModel):
    label: str
    effectif: int


class DecennieNoms(BaseModel):
    decennie: int
    labels: list[CompteParLabel]


class EvolutionNomsResponse(BaseModel):
    par_decennie_famille: list[DecennieNoms]
    par_decennie_prenom: list[DecennieNoms]
    personnes_avec_date: int
    personnes_sans_date: int
    nombre_personnes_total: int
    nombre_personnes_scope: int
