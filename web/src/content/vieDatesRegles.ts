/** Constantes — valeurs affichées sur la page À savoir uniquement. */
export const VIE_DATES_CONSTANTES = [
  { nom: "AGE_MIN_MARIAGE", valeur: 15, description: "Âge minimum au mariage." },
  {
    nom: "AGE_MAX_PROCREATION_HOMME",
    valeur: 70,
    description: "Âge maximum de procréation (homme).",
  },
  {
    nom: "AGE_MAX_PROCREATION_FEMME",
    valeur: 45,
    description: "Âge maximum de procréation (femme).",
  },
  { nom: "AGE_MAX", valeur: 110, description: "Durée de vie maximale retenue." },
] as const;

/** Libellés des règles — noms de variables, pas les valeurs numériques. */
export const REGLE_NAISSANCE_MIN_LABELS: Record<string, string> = {
  GEDCOM_COMPLET: "Date de naissance complète dans le GEDCOM.",
  ACTE_COMPLET: "Date de naissance complète sur l'acte d'état civil.",
  GEDCOM_ANNEE:
    "Année seule dans le GEDCOM → 01/01/année (approximation SUPERIEUR_A).",
  FEAT_MARIAGE:
    "Mariage le plus ancien : né après le 01/01/(année mariage − AGE_MIN_MARIAGE).",
  FEAT_DECES: "Décès connu : né après le 01/01/(année décès − AGE_MAX).",
  FEAT_DERNIER_ENFANT_H:
    "Dernier enfant : né après (date naissance dernier enfant − AGE_MAX_PROCREATION_HOMME).",
  FEAT_DERNIER_ENFANT_F:
    "Dernier enfant : né après (date naissance dernier enfant − AGE_MAX_PROCREATION_FEMME).",
};

export const REGLE_DECES_MAX_LABELS: Record<string, string> = {
  GEDCOM_COMPLET: "Date de décès complète dans le GEDCOM.",
  ACTE_COMPLET: "Date de décès complète sur l'acte d'état civil.",
  GEDCOM_ANNEE:
    "Année seule dans le GEDCOM → 31/12/année (approximation INFERIEUR_A).",
  FEAT_NAISSANCE_AGE_MAX:
    "Naissance (ou date_naissance_min) : décédé avant le 31/12/(année + AGE_MAX).",
  FEAT_MARIAGE_AGE_MAX:
    "Mariage le plus ancien : décédé avant le 31/12/(année mariage − AGE_MIN_MARIAGE + AGE_MAX).",
  FEAT_PREMIER_ENFANT:
    "Premier enfant : décédé avant le 31/12/(année premier enfant − AGE_MIN_MARIAGE + AGE_MAX).",
};

export function regleNaissanceMinLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return REGLE_NAISSANCE_MIN_LABELS[code] ?? code;
}

export function regleDecesMaxLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return REGLE_DECES_MAX_LABELS[code] ?? code;
}

export const APPROXIMATION_LABELS: Record<string, string> = {
  EXACT: "Date exacte (jour, mois, année).",
  ENVIRON: "Date de l'acte (≈, prefixe ~ à l'affichage).",
  SUPERIEUR_A: "Borne basse : né après cette date (prefixe >).",
  INFERIEUR_A: "Borne haute : décédé avant cette date (prefixe <).",
};
