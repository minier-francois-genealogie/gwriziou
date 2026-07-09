import type { FaitHistorique } from "../types/api";

const NIVEAU_LABELS: Record<string, string> = {
  COMMUNAL: "Commune",
  DEPARTEMENT: "Département",
  REGIONAL: "Région",
  NATIONAL: "France",
  MONDE: "Monde",
};

const CATEGORIE_LABELS: Record<string, string> = {
  ADMINISTRATION: "Administration",
  GUERRE: "Guerre",
  PANDEMIE: "Épidémie",
  RELIGION: "Religion",
  ECONOMIE: "Économie",
  SOCIETE: "Société",
  CATASTROPHE: "Catastrophe",
  CRISE: "Crise",
  CULTURE: "Culture",
  EVENEMENT: "Événement",
  POLITIQUE: "Politique",
  REGNE: "Règne",
  SCIENCE: "Science",
  AUTRE: "Autre",
};

function formatPeriode(debut: string, fin: string): string {
  if (debut === fin || !fin || fin === "????") return debut;
  return `${debut} – ${fin}`;
}

interface FaitsHistoriquesSectionProps {
  faits: FaitHistorique[];
  /** Affiche le niveau (France / Monde) quand plusieurs périmètres dans l'onglet. */
  showNiveau?: boolean;
  emptyMessage?: string;
}

export function FaitsHistoriquesSection({
  faits,
  showNiveau = false,
  emptyMessage = "Aucun fait pour ce niveau.",
}: FaitsHistoriquesSectionProps) {
  if (faits.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {faits.map((fait) => (
        <li
          key={`${fait.niveau}-${fait.debut}-${fait.libelle}`}
          className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-medium text-slate-800">{fait.libelle}</span>
            <span className="text-xs tabular-nums text-slate-500">
              {formatPeriode(fait.debut, fait.fin)}
            </span>
            <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
              {CATEGORIE_LABELS[fait.categorie] ?? fait.categorie}
            </span>
            {showNiveau && (
              <span className="rounded bg-sky-100/80 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                {NIVEAU_LABELS[fait.niveau] ?? fait.niveau}
              </span>
            )}
          </div>
          {fait.description && (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{fait.description}</p>
          )}
          {(fait.commune || fait.departement || fait.region || fait.pays) && (
            <p className="mt-1 text-[10px] text-slate-400">
              {[fait.commune, fait.departement, fait.region, fait.pays]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export const FAITS_TAB_NIVEAUX = {
  monde: ["MONDE"] as const,
  france: ["NATIONAL"] as const,
  region: ["REGIONAL"] as const,
  departement: ["DEPARTEMENT"] as const,
  commune: ["COMMUNAL"] as const,
};

export type FaitsHistoriquesTab = keyof typeof FAITS_TAB_NIVEAUX;

export function filterFaitsByTab(
  faits: FaitHistorique[],
  tab: FaitsHistoriquesTab,
): FaitHistorique[] {
  const niveaux = new Set<string>(FAITS_TAB_NIVEAUX[tab]);
  return faits.filter((f) => niveaux.has(f.niveau));
}

export function countFaitsByTab(
  faits: FaitHistorique[],
  tab: FaitsHistoriquesTab,
): number {
  return filterFaitsByTab(faits, tab).length;
}
