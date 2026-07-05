import type { ActeResume, ActesPersonne } from "../types/api";

export function splitPrenoms(prenoms: string | null | undefined): string[] {
  if (!prenoms?.trim()) return [];
  return prenoms.trim().split(/\s+/);
}

export function formatNom(nom: string, prenoms: string | null): string {
  const p = prenoms?.trim();
  return p ? `${nom} ${p}` : nom;
}

/** Nom + premier prénom seulement (affichage arbre). */
export function formatNomArbre(nom: string, prenoms: string | null): string {
  const parts = splitPrenoms(prenoms);
  return parts.length > 0 ? `${nom} ${parts[0]}` : nom;
}

export function hasMultiplePrenoms(prenoms: string | null | undefined): boolean {
  return splitPrenoms(prenoms).length > 1;
}

const GEDCOM_MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

/** Date au format JJ/MM/AAAA (ou forme partielle selon les données). */
export function formatDateJJMMAAAA(
  dateIso: string | null | undefined,
  dateBrute: string | null | undefined,
): string | null {
  if (dateIso) {
    const full = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (full) return `${full[3]}/${full[2]}/${full[1]}`;
    const ym = dateIso.match(/^(\d{4})-(\d{2})$/);
    if (ym) return `${ym[2]}/${ym[1]}`;
    const y = dateIso.match(/^(\d{4})$/);
    if (y) return y[1];
  }
  if (dateBrute) {
    const dmy = dateBrute.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
    if (dmy) {
      const month = GEDCOM_MONTHS[dmy[2]!.toUpperCase()];
      if (month) {
        return `${dmy[1]!.padStart(2, "0")}/${month}/${dmy[3]}`;
      }
    }
    const yOnly = dateBrute.match(/^(\d{4})$/);
    if (yOnly) return yOnly[1];
  }
  return dateBrute?.trim() || dateIso || null;
}

type DateParts = { year: number; month?: number; day?: number };

function parseDateForAge(
  dateIso: string | null | undefined,
  dateBrute: string | null | undefined,
): DateParts | null {
  if (dateIso) {
    const full = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (full) {
      return { year: Number(full[1]), month: Number(full[2]), day: Number(full[3]) };
    }
    const ym = dateIso.match(/^(\d{4})-(\d{2})$/);
    if (ym) return { year: Number(ym[1]), month: Number(ym[2]) };
    const y = dateIso.match(/^(\d{4})$/);
    if (y) return { year: Number(y[1]) };
  }
  if (dateBrute) {
    const dmy = dateBrute.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
    if (dmy) {
      const month = GEDCOM_MONTHS[dmy[2]!.toUpperCase()];
      if (month) {
        return {
          year: Number(dmy[3]),
          month: Number(month),
          day: Number(dmy[1]),
        };
      }
    }
    const yOnly = dateBrute.match(/^(\d{4})$/);
    if (yOnly) return { year: Number(yOnly[1]) };
  }
  return null;
}

/** Âge atteint (ou estimé si dates partielles) à une date donnée. */
export function ageAt(
  birth: { date?: string | null; date_brute?: string | null },
  at: { date?: string | null; date_brute?: string | null },
): number | null {
  const b = parseDateForAge(birth.date, birth.date_brute);
  const a = parseDateForAge(at.date, at.date_brute);
  if (!b || !a) return null;
  let age = a.year - b.year;
  if (b.month !== undefined && a.month !== undefined) {
    if (
      a.month < b.month ||
      (a.month === b.month &&
        b.day !== undefined &&
        a.day !== undefined &&
        a.day < b.day)
    ) {
      age -= 1;
    }
  }
  return age >= 0 ? age : null;
}

export function premierPrenom(prenoms: string | null | undefined): string | null {
  const parts = splitPrenoms(prenoms);
  return parts[0] ?? null;
}

export function formatNaissanceEnfantLabel(
  prenoms: string | null | undefined,
  individuNaissance: { date?: string | null; date_brute?: string | null } | null | undefined,
  enfantNaissance: { date?: string | null; date_brute?: string | null },
): string {
  const prenom = premierPrenom(prenoms) ?? "…";
  const age =
    individuNaissance != null
      ? ageAt(individuNaissance, enfantNaissance)
      : null;
  const agePart = age !== null ? ` (${age} ans)` : "";
  return `Naissance : ${prenom}${agePart}`;
}

export function formatEvenement(
  date: string | null | undefined,
  dateBrute: string | null | undefined,
  lieu: string | null | undefined,
): string {
  const d = formatDateJJMMAAAA(date, dateBrute);
  if (d && lieu) return `${d} — ${lieu}`;
  return d ?? lieu ?? "";
}

/** Lignes tooltip acte : libellé, date JJ/MM/AAAA, lieu (une par ligne). */
export function formatActeTooltipLines(
  label: string,
  acte: { date?: string | null; date_brute?: string | null; lieu?: string | null } | null | undefined,
): string[] {
  if (!acte) return [`${label} (absent)`];
  const lines = [label];
  const d = formatDateJJMMAAAA(acte.date, acte.date_brute);
  if (d) lines.push(d);
  const lieu = acte.lieu?.trim();
  if (lieu) lines.push(lieu);
  return lines;
}

export function formatActeTooltip(
  label: string,
  acte: { date?: string | null; date_brute?: string | null; lieu?: string | null } | null | undefined,
): string {
  return formatActeTooltipLines(label, acte).join("\n");
}

export function formatEvenementLigne(
  prefix: string,
  evt: { date?: string | null; date_brute?: string | null; lieu?: string | null } | null | undefined,
): string | null {
  if (!evt) return null;
  const d = formatDateJJMMAAAA(evt.date, evt.date_brute);
  const lieu = evt.lieu?.trim();
  if (!d && !lieu) return null;
  const contenu = d && lieu ? `${d} — ${lieu}` : (d ?? lieu)!;
  return `${prefix} ${contenu}`;
}

const EVENT_PREFIX: Record<string, string> = {
  naissance: "*",
  mariage: "∞",
  deces: "†",
};

export function evenementLigne(evt: {
  type: string;
  date?: string | null;
  date_brute?: string | null;
  lieu?: string | null;
}): string | null {
  return formatEvenementLigne(EVENT_PREFIX[evt.type] ?? "•", evt);
}

/** Actes N/M/D dérivés des événements (pour les icônes). */
export function actesFromEvenements(
  evenements: Array<{ type: string; acte: ActeResume | null }>,
): ActesPersonne {
  let naissance: ActeResume | null = null;
  let mariage: ActeResume | null = null;
  let deces: ActeResume | null = null;
  for (const e of evenements) {
    if (!e.acte) continue;
    if (e.type === "naissance") naissance = e.acte;
    else if (e.type === "deces") deces = e.acte;
    else if (e.type === "mariage" && !mariage) mariage = e.acte;
  }
  return { naissance, mariage, deces };
}

export function formatDates(
  naissance: string | null | undefined,
  deces: string | null | undefined,
): string {
  if (naissance && deces) return `${naissance} – ${deces}`;
  if (naissance) return `* ${naissance}`;
  if (deces) return `† ${deces}`;
  return "";
}

export function sexeLabel(sexe: string | null | undefined): string {
  if (sexe === "M") return "Homme";
  if (sexe === "F") return "Femme";
  return "";
}

export function encodeGedcomId(id: string): string {
  return encodeURIComponent(id);
}

export function decodeGedcomId(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function normalizeGedcomId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.startsWith("@") && trimmed.endsWith("@")) return trimmed;
  const num = trimmed.replace(/^@|@$/g, "");
  return `@${num}@`;
}

/** Détail warning GEDCOM vs acte — saut de ligne entre les deux sources. */
export function formatWarningDetail(detail: string): string {
  return detail.replace(/\s—\s(?=Acte\s:)/, "\n");
}

/** Date estimée avec préfixe d'approximation (~, >, <). */
export function formatVieDateDisplay(
  dateIso: string | null | undefined,
  approximation: string | null | undefined,
): string | null {
  if (!dateIso) return null;
  const formatted = formatDateJJMMAAAA(dateIso, null);
  if (!formatted) return null;
  if (approximation === "ENVIRON") return `~ ${formatted}`;
  if (approximation === "SUPERIEUR_A") return `> ${formatted}`;
  if (approximation === "INFERIEUR_A") return `< ${formatted}`;
  return formatted;
}
