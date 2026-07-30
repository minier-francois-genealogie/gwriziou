/**
 * Métriques + options d’affichage des 4 modes d’arbre figés.
 *
 * Deux axes indépendants :
 *   - détails (cartouche)     → taille cellule, contenu fiche, gapY
 *   - horizontal (organisation) → gapX, tige filiation, badge parents, transpose
 *
 * Ne pas modifier les valeurs numériques sans demande explicite.
 */

export type TreeViewMode = "detail" | "overview";

export interface TreeLayoutMetrics {
  nodeW: number;
  nodeH: number;
  gapX: number;
  gapY: number;
  unionDescStem: number;
  refBadgeRowGap: number;
  parentsRefStub: number;
  distantFiliationFactor: number;
  unionR: number;
}

/** Contenu / chrome du cartouche — ne dépend que de « Détails ». */
export interface TreeCartoucheUi {
  /** Lignes N/M/D + dates/lieux (EvenementsList). */
  showEventRows: boolean;
  showProfession: boolean;
  /** Années compactes sous le nom (ex. 1921-1978). */
  showAnneesVie: boolean;
  /** Icônes N·M·D dans la barre du haut (à côté du check). */
  showNmdInHeader: boolean;
}

export type ParentsRefSide = "top" | "left";

/** Organisation autour de la cellule — ne dépend que de « Horizontal ». */
export interface TreeOrientationUi {
  parentsRefSide: ParentsRefSide;
}

export interface TreeModeConfig {
  metrics: Readonly<TreeLayoutMetrics>;
  cartouche: TreeCartoucheUi;
  orientation: TreeOrientationUi;
}

const SHARED = {
  refBadgeRowGap: 26,
  parentsRefStub: 22,
  distantFiliationFactor: 1.5,
  unionR: 18,
} as const;

/** Taille + gapY du cartouche (axe Détails). */
const CARTOUCHE = {
  detail: { nodeW: 192, nodeH: 128, gapY: 28 },
  overview: { nodeW: 154, nodeH: 72, gapY: 32 },
} as const;

/** Écart entre époux / fratrie sur l’axe « siblings » (axe Horizontal). */
const GAP_X = {
  vertical: 24,
  horizontal: 56,
} as const;

/**
 * Longueur de tige union → barre de fratrie (validée mode par mode).
 * Pas une simple formule : chaque combinaison a été réglée à l’œil.
 */
const UNION_DESC_STEM = {
  detail: { vertical: 56, horizontal: 88 },
  overview: { vertical: 28, horizontal: 75 },
} as const;

const CARTOUCHE_UI: Record<TreeViewMode, TreeCartoucheUi> = {
  detail: {
    showEventRows: true,
    showProfession: true,
    showAnneesVie: false,
    showNmdInHeader: false,
  },
  overview: {
    showEventRows: false,
    showProfession: false,
    showAnneesVie: true,
    showNmdInHeader: true,
  },
};

function buildMetrics(
  mode: TreeViewMode,
  horizontal: boolean,
): TreeLayoutMetrics {
  const cartouche = CARTOUCHE[mode];
  const orient = horizontal ? "horizontal" : "vertical";
  return {
    ...SHARED,
    ...cartouche,
    gapX: GAP_X[orient],
    unionDescStem: UNION_DESC_STEM[mode][orient],
  };
}

function freezeMetrics(m: TreeLayoutMetrics): Readonly<TreeLayoutMetrics> {
  return Object.freeze(m);
}

/** FIGÉ — Détails + vertical. */
export const DETAIL_VERTICAL: Readonly<TreeLayoutMetrics> = freezeMetrics(
  buildMetrics("detail", false),
);

/** FIGÉ — Détails + horizontal. */
export const DETAIL_HORIZONTAL: Readonly<TreeLayoutMetrics> = freezeMetrics(
  buildMetrics("detail", true),
);

/** FIGÉ — Sans détails + vertical. */
export const OVERVIEW_VERTICAL: Readonly<TreeLayoutMetrics> = freezeMetrics(
  buildMetrics("overview", false),
);

/** FIGÉ — Sans détails + horizontal. */
export const OVERVIEW_HORIZONTAL: Readonly<TreeLayoutMetrics> = freezeMetrics(
  buildMetrics("overview", true),
);

export function getTreeLayoutMetrics(
  mode: TreeViewMode,
  horizontal = false,
): TreeLayoutMetrics {
  if (mode === "overview") {
    return horizontal ? OVERVIEW_HORIZONTAL : OVERVIEW_VERTICAL;
  }
  return horizontal ? DETAIL_HORIZONTAL : DETAIL_VERTICAL;
}

/** Config complète pour un couple (détails × orientation). */
export function getTreeModeConfig(
  mode: TreeViewMode,
  horizontal = false,
): TreeModeConfig {
  return {
    metrics: getTreeLayoutMetrics(mode, horizontal),
    cartouche: CARTOUCHE_UI[mode],
    orientation: {
      parentsRefSide: horizontal ? "left" : "top",
    },
  };
}
