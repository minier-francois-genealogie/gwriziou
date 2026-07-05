import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { PersonName } from "../components/SexeIcon";
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

function toggleSetValue(
  current: Set<string>,
  value: string,
  setter: (next: Set<string>) => void,
) {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  setter(next);
}

function filterSummary(
  options: ReadonlyArray<{ code: string; label: string }>,
  selected: Set<string>,
): string | null {
  if (selected.size === 0) return "Aucun";
  if (selected.size === options.length) return "Tous";
  return `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`;
}

function ColumnHeaderMultiSelect({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: ReadonlyArray<{ code: string; label: string }>;
  selected: Set<string>;
  onToggle: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const summary = useMemo(() => filterSummary(options, selected), [options, selected]);
  const filtered = selected.size > 0 && selected.size < options.length;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-1.5 whitespace-nowrap text-left transition ${
          filtered ? "text-sky-800" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        {summary && (
          <>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-normal normal-case tracking-normal">
              {summary}
            </span>
          </>
        )}
        <svg
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 shrink-0 opacity-60 transition ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={`Filtrer ${title}`}
          className="absolute left-0 top-full z-30 mt-1 min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg"
        >
          {options.map((opt) => (
            <label
              key={opt.code}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.has(opt.code)}
                onChange={() => onToggle(opt.code)}
                className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
              />
              <span className="leading-snug">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function filterLignes(
  lignes: WarningLigne[],
  eventTypes: Set<string>,
  warningCodes: Set<string>,
): WarningLigne[] {
  return lignes.filter(
    (row) => eventTypes.has(row.type_evenement) && warningCodes.has(row.code),
  );
}

export function WarningsPage() {
  const { ancrePersonneId, ancetres, descendants } = useApp();
  const [zoneOnly, setZoneOnly] = useState(true);
  const [eventTypes, setEventTypes] = useState(
    () => new Set<string>(EVENT_FILTERS.map((f) => f.code)),
  );
  const [warningCodes, setWarningCodes] = useState(
    () => new Set<string>(WARNING_FILTERS.map((f) => f.code)),
  );
  const navigate = useNavigate();

  const { data: stats } = useAsync(
    () => api.warningsStats(ancrePersonneId, ancetres, descendants),
    [ancrePersonneId, ancetres, descendants],
  );

  const { data, loading, error } = useAsync(
    () => api.warnings(ancrePersonneId, ancetres, descendants, zoneOnly),
    [ancrePersonneId, ancetres, descendants, zoneOnly],
  );

  const filteredLignes = useMemo(
    () => (data ? filterLignes(data.lignes, eventTypes, warningCodes) : []),
    [data, eventTypes, warningCodes],
  );

  const openPerson = (id: string) => {
    navigate("/recherche", { state: { fichePersonneId: id } });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 pl-[calc(env(safe-area-inset-left,0px)+3.75rem)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Warnings</h1>
            {stats && (
              <p className="text-sm text-slate-500">
                Zone : {stats.nombre_warning_zone} — Total :{" "}
                {stats.nombre_warning_total}
              </p>
            )}
            {data && (
              <p className="text-xs text-slate-400">
                {filteredLignes.length} affiché{filteredLignes.length > 1 ? "s" : ""}{" "}
                sur {data.lignes.length}
              </p>
            )}
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={zoneOnly}
              onChange={(e) => setZoneOnly(e.target.checked)}
              className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
            />
            Limiter à la zone de l&apos;arbre
          </label>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3 pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]">
        {loading && (
          <p className="text-sm text-slate-500">Chargement des warnings…</p>
        )}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {data && data.lignes.length === 0 && (
          <p className="text-sm text-slate-500">Aucun warning.</p>
        )}
        {data && data.lignes.length > 0 && filteredLignes.length === 0 && (
          <p className="text-sm text-slate-500">
            Aucun warning pour les filtres sélectionnés.
          </p>
        )}
        {data && data.lignes.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Individu
                  </th>
                  <th className="px-3 py-2 text-left">
                    <ColumnHeaderMultiSelect
                      title="Événement"
                      options={EVENT_FILTERS}
                      selected={eventTypes}
                      onToggle={(code) =>
                        toggleSetValue(eventTypes, code, setEventTypes)
                      }
                    />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <ColumnHeaderMultiSelect
                      title="Warning"
                      options={WARNING_FILTERS}
                      selected={warningCodes}
                      onToggle={(code) =>
                        toggleSetValue(warningCodes, code, setWarningCodes)
                      }
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLignes.map((row, i) => (
                  <tr
                    key={`${row.id_gedcom}-${row.type_evenement}-${row.code}-${i}`}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
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
        )}
      </div>
    </div>
  );
}
