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
  import_en_cours: boolean;
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
  date_naissance_min?: string | null;
  date_naissance_min_approximation?: string | null;
  date_naissance_min_regle?: string | null;
  date_deces_max?: string | null;
  date_deces_max_approximation?: string | null;
  date_deces_max_regle?: string | null;
  naissance_gedcom?: boolean;
  deces_gedcom?: boolean;
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

/** Chemin relatif sous sources/documents/ : L/NOM/CLE */
export interface DossierActes {
  chemin: string;
  existe: boolean;
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
  actes?: ActesPersonne;
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

export interface FaitHistorique {
  niveau: string;
  categorie: string;
  debut: string;
  fin: string;
  libelle: string;
  description?: string | null;
  commune?: string | null;
  departement?: string | null;
  region?: string | null;
  pays?: string | null;
}

export interface PersonneDetail {
  id_gedcom: string;
  nom: string;
  prenoms: string | null;
  surnom?: string | null;
  anecdote?: string | null;
  sexe: string | null;
  profession: string | null;
  naissance: EvenementResume | null;
  deces: EvenementResume | null;
  date_naissance_min?: string | null;
  date_naissance_min_approximation?: string | null;
  date_naissance_min_regle?: string | null;
  date_deces_max?: string | null;
  date_deces_max_approximation?: string | null;
  date_deces_max_regle?: string | null;
  naissance_gedcom?: boolean;
  deces_gedcom?: boolean;
  mariages: MariageResume[];
  actes: ActesPersonne;
  evenements: EvenementArbre[];
  photos: PhotoPersonne[];
  avatar_url?: string | null;
  dossier_actes?: DossierActes | null;
  relations: RelationsPersonne;
  faits_historiques?: FaitHistorique[];
  dirigeants_france?: DirigeantFranceLigne[];
}

export interface VieDatesAffichage {
  date_naissance_min?: string | null;
  date_naissance_min_approximation?: string | null;
  date_naissance_min_regle?: string | null;
  date_deces_max?: string | null;
  date_deces_max_approximation?: string | null;
  date_deces_max_regle?: string | null;
  naissance_gedcom?: boolean;
  deces_gedcom?: boolean;
}

export interface NoeudArbre {
  id_gedcom: string;
  nom: string;
  prenoms: string | null;
  sexe: string | null;
  profession: string | null;
  naissance_tri: string | null;
  photos: boolean;
  avatar_url?: string | null;
  chemin_dossier?: string | null;
  evenements: EvenementArbre[];
  date_naissance_min?: string | null;
  date_naissance_min_approximation?: string | null;
  date_naissance_min_regle?: string | null;
  date_deces_max?: string | null;
  date_deces_max_approximation?: string | null;
  date_deces_max_regle?: string | null;
  naissance_gedcom?: boolean;
  deces_gedcom?: boolean;
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
  status: "ok" | "unchanged" | "running";
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

export interface FaitsHistoriquesStatsResponse {
  nombre_faits_total: number;
  nombre_faits_zone: number;
}

export interface FaitHistoriqueLigne {
  niveau: string;
  niveau_label: string;
  categorie: string;
  categorie_label: string;
  debut: string;
  fin: string;
  periode: string;
  libelle: string;
  description?: string | null;
  commune?: string | null;
  departement?: string | null;
  region?: string | null;
  pays?: string | null;
  lieu?: string | null;
}

export interface FaitsHistoriquesListResponse {
  lignes: FaitHistoriqueLigne[];
  nombre_faits_total: number;
  nombre_faits_zone: number;
}

export interface DirigeantsFranceStatsResponse {
  nombre_dirigeants_total: number;
  nombre_dirigeants_zone: number;
}

export interface DirigeantFranceLigne {
  slug: string;
  nom: string;
  titre: string;
  debut: string;
  fin: string;
  periode: string;
  naissance?: string | null;
  deces?: string | null;
  vie?: string | null;
  regime?: string | null;
  lien_predecesseur?: string | null;
  faits_positifs: string[];
  faits_negatifs: string[];
  photo_url?: string | null;
}

export type DirigeantFrance = DirigeantFranceLigne;

export interface DirigeantsFranceListResponse {
  lignes: DirigeantFranceLigne[];
  nombre_dirigeants_total: number;
  nombre_dirigeants_zone: number;
}

export interface GeolocCommune {
  lieu_id: number;
  commune: string;
  departement: string | null;
  latitude: number;
  longitude: number;
  nombre: number;
}

export interface GeolocResponse {
  annee: number;
  annee_min: number;
  annee_max: number;
  nombre_personnes: number;
  communes: GeolocCommune[];
}

export interface AnalyseStatsResponse {
  nombre_personnes_total: number;
  nombre_personnes_zone: number;
  nombre_familles_zone: number;
  hommes_zone: number;
  femmes_zone: number;
  sexe_inconnu_zone: number;
  avec_profession_zone: number;
  avec_naissance_zone: number;
  avec_deces_zone: number;
  age_moyen_deces_zone: number | null;
  enfants_par_famille_moyen: number | null;
  enfants_par_famille_max: number;
}

export interface ProfessionNuageItem {
  profession: string;
  effectif: number;
}

export interface ProfessionsNuageResponse {
  lignes: ProfessionNuageItem[];
  nombre_avec_profession: number;
  nombre_sans_profession: number;
  nombre_personnes_total: number;
  nombre_personnes_scope: number;
}

export interface ProfessionMappingLigne {
  profession_brute: string;
  effectif: number;
  libelle_nuage: string;
  libelle_defaut: string;
  override: boolean;
}

export interface ProfessionMappingListResponse {
  lignes: ProfessionMappingLigne[];
  nombre_professions_distinctes: number;
  nombre_overrides: number;
}

export interface CompteParLabel {
  label: string;
  effectif: number;
}

export interface DecennieNoms {
  decennie: number;
  labels: CompteParLabel[];
}

export interface EvolutionNomsResponse {
  par_decennie_famille: DecennieNoms[];
  par_decennie_prenom: DecennieNoms[];
  personnes_avec_date: number;
  personnes_sans_date: number;
  nombre_personnes_total: number;
  nombre_personnes_scope: number;
}

export interface CompteLigne {
  email: string;
  nom: string;
  prenom: string;
  role: string;
  actif: boolean;
}

export interface CompteListResponse {
  comptes: CompteLigne[];
  source_fichier: string;
}

export interface NoteLigne {
  id: string;
  cle: string;
  chemin: string;
  fichier: string;
  auteur_email: string;
  auteur_nom: string;
  cree_le: string;
  texte: string;
}

export interface NoteListResponse {
  notes: NoteLigne[];
  source: string;
}

export interface NoteIndexResponse {
  chemins: string[];
  total: number;
}

export interface CheckedIndexResponse {
  chemins: string[];
  total: number;
}

export interface CheckedStateResponse {
  chemin: string;
  checked: boolean;
}

export interface AvatarResponse {
  id_gedcom: string;
  url: string;
  nom_fichier: string;
  chemin: string;
}

export interface HashPasswordResponse {
  password_hash: string;
}

export interface SessionUser {
  email: string;
  nom: string;
  prenom: string;
  role: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: SessionUser | null;
}

export interface AccountRequestPayload {
  email: string;
  nom: string;
  prenom: string;
  password: string;
}

export interface AccountRequestResponse {
  ok: boolean;
  message: string;
}
