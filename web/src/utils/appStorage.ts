import { normalizeGedcomId } from "./format";

const KEYS = {
  personneId: "gwriziou.personneId",
  ancetres: "gwriziou.ancetres",
  descendants: "gwriziou.descendants",
  derniereVue: "gwriziou.derniereVue",
} as const;

export type AppView = "recherche" | "arbre" | "parametres";

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

export function loadPersonneId(fallback: string): string {
  try {
    const raw = localStorage.getItem(KEYS.personneId);
    return raw ? normalizeGedcomId(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function savePersonneId(id: string): void {
  try {
    localStorage.setItem(KEYS.personneId, normalizeGedcomId(id));
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
    if (v === "arbre" || v === "parametres" || v === "recherche") return v;
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
