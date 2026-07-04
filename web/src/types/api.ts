export interface StatusResponse {
  importe_le: string | null;
  nb_personnes: number | null;
  nb_familles: number | null;
  nb_actes: number | null;
  nb_photos: number | null;
  empreinte_gedcom: string | null;
  empreinte_actes: string | null;
  id_gedcom_racine: string | null;
  version_schema: number | null;
}

export interface PersonneResume {
  id_gedcom: string;
  nom: string;
  prenoms: string | null;
  sexe: string | null;
  profession: string | null;
  naissance: string | null;
  lieu_naissance: string | null;
  deces: string | null;
  lieu_deces: string | null;
}

export interface RechercheResponse {
  total: number;
  page: number;
  limit: number;
  resultats: PersonneResume[];
}

export interface EvenementResume {
  date: string | null;
  date_brute: string | null;
  lieu: string | null;
  departement: string | null;
}

export interface ActeResume {
  url: string;
  type: "N" | "M" | "D";
  date: string | null;
  date_brute: string | null;
  lieu: string | null;
}

export interface WarningEvenement {
  code: string;
  message: string;
  detail: string | null;
}

export interface EvenementArbre {
  type: "naissance" | "mariage" | "deces" | "naissance_enfant";
  date: string | null;
  date_brute: string | null;
  lieu: string | null;
  departement: string | null;
  acte: ActeResume | null;
  warnings: WarningEvenement[];
  id_famille?: string | null;
  conjoint?: RelationResume | null;
  enfant?: RelationResume | null;
}

export interface ActesPersonne {
  naissance: ActeResume | null;
  mariage: ActeResume | null;
  deces: ActeResume | null;
}

export interface PhotoPersonne {
  url: string;
  suffixe: string | null;
}

export interface RelationResume {
  id_gedcom: string;
  nom: string;
  prenoms: string | null;
  sexe?: string | null;
  role: string | null;
  naissance?: EvenementResume | null;
  deces?: EvenementResume | null;
  photos?: boolean;
}

export interface RelationsPersonne {
  parents: RelationResume[];
  enfants: RelationResume[];
  fratrie: RelationResume[];
  conjoints: RelationResume[];
}

export interface MariageResume {
  date: string | null;
  date_brute: string | null;
  lieu: string | null;
  conjoint: RelationResume | null;
}

export interface PersonneDetail {
  id_gedcom: string;
  nom: string;
  prenoms: string | null;
  sexe: string | null;
  profession: string | null;
  naissance: EvenementResume | null;
  deces: EvenementResume | null;
  mariages: MariageResume[];
  actes: ActesPersonne;
  evenements: EvenementArbre[];
  photos: PhotoPersonne[];
  relations: RelationsPersonne;
}

export interface NoeudArbre {
  id_gedcom: string;
  nom: string;
  prenoms: string | null;
  sexe: string | null;
  profession: string | null;
  naissance_tri: string | null;
  photos: boolean;
  evenements: EvenementArbre[];
}

export interface AreteArbre {
  de: string;
  vers: string;
  type: string;
}

export interface NoeudUnion {
  id_famille: string;
  date: string | null;
  date_brute: string | null;
  lieu: string | null;
  acte_m: boolean;
  acte?: ActeResume | null;
}

export interface ArbreResponse {
  centre: string;
  ancetres: number;
  descendants: number;
  noeuds: NoeudArbre[];
  unions: NoeudUnion[];
  aretes: AreteArbre[];
}

export interface RafraichirResponse {
  status: "ok" | "unchanged";
  message?: string;
  nb_personnes?: number;
  nb_familles?: number;
  nb_actes?: number;
  nb_photos?: number;
}

export type ActeType = "naissance" | "mariage" | "deces";

export interface WarningsStatsResponse {
  nombre_warning_total: number;
  nombre_warning_zone: number;
}

export interface WarningLigne {
  id_gedcom: string;
  nom: string;
  prenoms: string | null;
  sexe?: string | null;
  type_evenement: string;
  evenement_label: string;
  evenement_date?: string | null;
  evenement_lieu?: string | null;
  code: string;
  message: string;
  detail?: string | null;
}

export interface WarningsListResponse {
  lignes: WarningLigne[];
  nombre_warning_total: number;
  nombre_warning_zone: number;
}
