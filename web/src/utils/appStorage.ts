import { normalizeGedcomId } from "./format";

const KEYS = {
  ancrePersonneId: "gwriziou.ancrePersonneId",
  /** @deprecated migré vers ancrePersonneId */
  personneIdLegacy: "gwriziou.personneId",
  ancetres: "gwriziou.ancetres",
  descendants: "gwriziou.descendants",
  derniereVue: "gwriziou.derniereVue",
} as const;

export type AppView = "recherche" | "arbre" | "parametres" | "warnings" | "faits-historiques" | "geoloc" | "a-savoir";

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
    if (v === "arbre" || v === "parametres" || v === "recherche" || v === "warnings" || v === "faits-historiques" || v === "geoloc" || v === "a-savoir") return v;
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

export { DEFAULT_ANCETRES, DEFAULT_DESCENDANTS };
