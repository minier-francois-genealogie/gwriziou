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
  AUTRE: "Autre",
};

function formatPeriode(debut: string, fin: string): string {
  if (debut === fin || !fin || fin === "????") return debut;
  return `${debut} – ${fin}`;
}

interface FaitsHistoriquesSectionProps {
  faits: FaitHistorique[];
}

export function FaitsHistoriquesSection({ faits }: FaitsHistoriquesSectionProps) {
  if (faits.length === 0) return null;

  const grouped = new Map<string, FaitHistorique[]>();
  for (const fait of faits) {
    const list = grouped.get(fait.niveau) ?? [];
    list.push(fait);
    grouped.set(fait.niveau, list);
  }

  const ordre = ["COMMUNAL", "DEPARTEMENT", "REGIONAL", "NATIONAL", "MONDE"];

  return (
    <div className="mt-3">
      <div className="mx-auto mb-3 h-px w-[70%] bg-slate-300" aria-hidden="true" />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Contexte historique
      </h3>
      <div className="mt-2 space-y-3">
        {ordre.map((niveau) => {
          const items = grouped.get(niveau);
          if (!items?.length) return null;
          return (
            <div key={niveau}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {NIVEAU_LABELS[niveau] ?? niveau}
              </h4>
              <ul className="mt-1 space-y-2">
                {items.map((fait) => (
                  <li
                    key={`${fait.debut}-${fait.libelle}`}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-medium text-slate-800">{fait.libelle}</span>
                      <span className="text-xs text-slate-500">
                        {formatPeriode(fait.debut, fait.fin)}
                      </span>
                      <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                        {CATEGORIE_LABELS[fait.categorie] ?? fait.categorie}
                      </span>
                    </div>
                    {fait.description && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {fait.description}
                      </p>
                    )}
                    {(fait.commune || fait.departement || fait.region) && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        {[fait.commune, fait.departement, fait.region]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
