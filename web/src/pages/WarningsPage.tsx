import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PersonName } from "../components/SexeIcon";
import {
  ColumnHeaderMultiSelect,
  ColumnHeaderSearch,
  FILTER_TABLE_CLASS,
  MENU_CLEARANCE,
  normalizeSearchText,
} from "../components/TableColumnFilters";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import type { WarningLigne } from "../types/api";
import { formatWarningDetail } from "../utils/format";

const EVENT_FILTERS = [
  { code: "NAISSANCE", label: "Naissance" },
  { code: "MARIAGE", label: "Mariage" },
  { code: "DECES", label: "Décès" },
] as const;

const WARNING_FILTERS = [
  { code: "MANQUE_ACTE", label: "Acte manquant" },
  { code: "MANQUE_GED", label: "Date/lieu GEDCOM manquant" },
  { code: "DATE_DIVERGENTE", label: "Date GEDCOM ≠ acte" },
  { code: "LIEU_DIVERGENTE", label: "Lieu GEDCOM ≠ acte" },
  { code: "MANQUE_BORNE_NAISSANCE", label: "Borne naissance inestimable" },
  { code: "MANQUE_BORNE_DECES", label: "Borne décès inestimable" },
] as const;

function matchesIndividu(row: WarningLigne, query: string): boolean {
  const q = normalizeSearchText(query.trim());
  if (!q) return true;
  const haystack = normalizeSearchText(`${row.nom} ${row.prenoms ?? ""}`);
  return haystack.includes(q);
}

function filterLignes(
  lignes: WarningLigne[],
  eventTypes: Set<string>,
  warningCodes: Set<string>,
  individuQuery: string,
): WarningLigne[] {
  return lignes.filter(
    (row) =>
      eventTypes.has(row.type_evenement) &&
      warningCodes.has(row.code) &&
      matchesIndividu(row, individuQuery),
  );
}

function WarningsTableColgroup() {
  return (
    <colgroup>
      <col style={{ width: "34%" }} />
      <col style={{ width: "30%" }} />
      <col style={{ width: "36%" }} />
    </colgroup>
  );
}

export function WarningsPage() {
  const { ancrePersonneId, ancetres, descendants, dataRefreshTick, importEnCours } =
    useApp();
  const [zoneOnly, setZoneOnly] = useState(true);
  const [eventTypes, setEventTypes] = useState(
    () => new Set<string>(EVENT_FILTERS.map((f) => f.code)),
  );
  const [warningCodes, setWarningCodes] = useState(
    () => new Set<string>(WARNING_FILTERS.map((f) => f.code)),
  );
  const [individuQuery, setIndividuQuery] = useState("");
  const navigate = useNavigate();

  const { data: stats } = useAsync(
    () => api.warningsStats(ancrePersonneId, ancetres, descendants),
    [ancrePersonneId, ancetres, descendants, dataRefreshTick],
  );

  const { data, loading, error } = useAsync(
    () => api.warnings(ancrePersonneId, ancetres, descendants, zoneOnly),
    [ancrePersonneId, ancetres, descendants, zoneOnly, dataRefreshTick],
  );

  const filteredLignes = useMemo(
    () =>
      data ? filterLignes(data.lignes, eventTypes, warningCodes, individuQuery) : [],
    [data, eventTypes, warningCodes, individuQuery],
  );

  const openPerson = (id: string) => {
    navigate("/recherche", { state: { fichePersonneId: id } });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]">
        {(loading || importEnCours) && <LoadingSpinner />}
        {!loading && !importEnCours && error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {!loading && !importEnCours && data && data.lignes.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
              <div className="shrink-0 border-b border-slate-300 bg-slate-50">
                <table className={FILTER_TABLE_CLASS}>
                  <WarningsTableColgroup />
                  <thead>
                    <tr>
                      <th className={`py-2 pr-3 align-top ${MENU_CLEARANCE}`}>
                        <ColumnHeaderSearch
                          title="Individu"
                          value={individuQuery}
                          onChange={setIndividuQuery}
                        />
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderMultiSelect
                          title="Événement"
                          options={EVENT_FILTERS}
                          selected={eventTypes}
                          setSelected={setEventTypes}
                        />
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderMultiSelect
                          title="Warning"
                          options={WARNING_FILTERS}
                          selected={warningCodes}
                          setSelected={setWarningCodes}
                        />
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <table className={FILTER_TABLE_CLASS}>
                  <WarningsTableColgroup />
                  <tbody>
                    {filteredLignes.map((row, i) => (
                      <tr
                        key={`${row.id_gedcom}-${row.type_evenement}-${row.code}-${i}`}
                        className="border-b border-slate-300 last:border-0 hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            className="text-left text-sky-700 hover:underline"
                            onClick={() => openPerson(row.id_gedcom)}
                          >
                            <PersonName
                              nom={row.nom}
                              prenoms={row.prenoms}
                              sexe={row.sexe}
                              showPhoto={false}
                              showNote={false}
                            />
                          </button>
                        </td>
                        <td className="px-3 py-2 align-top text-slate-600">
                          <span className="block font-medium text-slate-700">
                            {row.evenement_label}
                          </span>
                          {row.evenement_date && (
                            <span className="mt-0.5 block tabular-nums text-xs text-slate-500">
                              {row.evenement_date}
                            </span>
                          )}
                          {row.evenement_lieu && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {row.evenement_lieu}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span className="font-medium text-amber-800">{row.message}</span>
                          {row.detail && (
                            <span className="mt-0.5 block whitespace-pre-line text-xs text-slate-500">
                              {formatWarningDetail(row.detail)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-300 bg-slate-50 px-3 py-2">
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={zoneOnly}
                    onChange={(e) => setZoneOnly(e.target.checked)}
                    className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                  />
                  Limiter à la zone de l&apos;arbre
                </label>
                <div className="text-right">
                  <p className="text-sm text-slate-500">
                    Zone : {stats?.nombre_warning_zone ?? data.nombre_warning_zone} — Total :{" "}
                    {stats?.nombre_warning_total ?? data.nombre_warning_total}
                  </p>
                  <p className="text-xs text-slate-400">
                    {filteredLignes.length} affiché{filteredLignes.length > 1 ? "s" : ""} sur{" "}
                    {data.lignes.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
