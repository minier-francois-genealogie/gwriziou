import { normalizeGedcomId } from "./format";

const KEYS = {
  ancrePersonneId: "gwriziou.ancrePersonneId",
  /** @deprecated migré vers ancrePersonneId */
  personneIdLegacy: "gwriziou.personneId",
  ancetres: "gwriziou.ancetres",
  descendants: "gwriziou.descendants",
  derniereVue: "gwriziou.derniereVue",
  treeViewBoxZoom: "gwriziou.treeViewBoxZoom",
  treeViewMode: "gwriziou.treeViewMode",
} as const;

export type AppView =
  | "recherche"
  | "arbre"
  | "parametres"
  | "aide-a-propos"
  | "aide-warnings"
  | "aide-a-savoir"
  | "aide-parametres"
  | "warnings"
  | "histoire-faits"
  | "histoire-dirigeants"
  | "faits-historiques"
  | "geoloc"
  | "analyse-stats"
  | "analyse-professions"
  | "analyse-noms"
  | "gestion-professions"
  | "gestion-warnings"
  | "gestion-notes"
  | "admin-comptes"
  | "a-savoir";

const DEFAULT_ANCETRES = 4;
const DEFAULT_DESCENDANTS = 2;

function readInt(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  } catch {
    return fallback;
  }
}

export function loadAncrePersonneId(fallback: string): string {
  try {
    const raw =
      localStorage.getItem(KEYS.ancrePersonneId) ??
      localStorage.getItem(KEYS.personneIdLegacy);
    if (raw && !localStorage.getItem(KEYS.ancrePersonneId)) {
      const normalized = normalizeGedcomId(raw);
      localStorage.setItem(KEYS.ancrePersonneId, normalized);
      localStorage.removeItem(KEYS.personneIdLegacy);
      return normalized;
    }
    return raw ? normalizeGedcomId(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveAncrePersonneId(id: string): void {
  try {
    localStorage.setItem(KEYS.ancrePersonneId, normalizeGedcomId(id));
  } catch {
    /* quota / private mode */
  }
}

export function loadAncetres(): number {
  return readInt(KEYS.ancetres, DEFAULT_ANCETRES, 0, 8);
}

export function loadDescendants(): number {
  return readInt(KEYS.descendants, DEFAULT_DESCENDANTS, 0, 6);
}

export function saveAncetres(n: number): void {
  try {
    localStorage.setItem(KEYS.ancetres, String(n));
  } catch {
    /* ignore */
  }
}

export function saveDescendants(n: number): void {
  try {
    localStorage.setItem(KEYS.descendants, String(n));
  } catch {
    /* ignore */
  }
}

export function loadDerniereVue(): AppView {
  try {
    const v = localStorage.getItem(KEYS.derniereVue);
    if (
      v === "arbre" ||
      v === "parametres" ||
      v === "aide-a-propos" ||
      v === "aide-warnings" ||
      v === "aide-a-savoir" ||
      v === "aide-parametres" ||
      v === "recherche" ||
      v === "warnings" ||
      v === "histoire-faits" ||
      v === "histoire-dirigeants" ||
      v === "faits-historiques" ||
      v === "geoloc" ||
      v === "analyse-stats" ||
      v === "analyse-professions" ||
      v === "analyse-noms" ||
      v === "gestion-professions" ||
      v === "gestion-warnings" ||
      v === "gestion-notes" ||
      v === "admin-comptes" ||
      v === "a-savoir"
    ) {
      return v;
    }
    if (v === "admin-notes" || v === "admin-remarques") return "gestion-notes";
  } catch {
    /* ignore */
  }
  return "recherche";
}

export function saveDerniereVue(view: AppView): void {
  try {
    localStorage.setItem(KEYS.derniereVue, view);
  } catch {
    /* ignore */
  }
}

export interface TreeViewBoxZoom {
  w: number;
  h: number;
}

export function loadTreeViewBoxZoom(): TreeViewBoxZoom | null {
  try {
    const raw = localStorage.getItem(KEYS.treeViewBoxZoom);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { w?: unknown; h?: unknown };
    const w = Number(parsed.w);
    const h = Number(parsed.h);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    return { w, h };
  } catch {
    return null;
  }
}

export function saveTreeViewBoxZoom(zoom: TreeViewBoxZoom): void {
  try {
    localStorage.setItem(KEYS.treeViewBoxZoom, JSON.stringify(zoom));
  } catch {
    /* quota / private mode */
  }
}

export type TreeViewMode = "detail" | "overview";

export function loadTreeViewMode(): TreeViewMode {
  try {
    const v = localStorage.getItem(KEYS.treeViewMode);
    if (v === "overview") return "overview";
  } catch {
    /* ignore */
  }
  return "detail";
}

export function saveTreeViewMode(mode: TreeViewMode): void {
  try {
    localStorage.setItem(KEYS.treeViewMode, mode);
  } catch {
    /* ignore */
  }
}

export { DEFAULT_ANCETRES, DEFAULT_DESCENDANTS };
