import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  ColumnHeaderSearch,
  FILTER_TABLE_CLASS,
  MENU_CLEARANCE,
  normalizeSearchText,
} from "../components/TableColumnFilters";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import type { ProfessionMappingLigne } from "../types/api";

const PAGE_PAD =
  "p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]";

function matchesProfession(row: ProfessionMappingLigne, query: string): boolean {
  const q = normalizeSearchText(query.trim());
  if (!q) return true;
  const haystack = normalizeSearchText(
    `${row.profession_brute} ${row.libelle_nuage} ${row.libelle_defaut}`,
  );
  return haystack.includes(q);
}

function ProfessionRow({
  row,
  onSaved,
}: {
  row: ProfessionMappingLigne;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(row.libelle_nuage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value.trim() !== row.libelle_nuage.trim();

  useEffect(() => {
    setValue(row.libelle_nuage);
    setError(null);
  }, [row.libelle_nuage, row.override]);

  const save = useCallback(async () => {
    const next = value.trim();
    if (!next || next === row.libelle_nuage.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.gestionProfessionUpdate(row.profession_brute, next);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }, [onSaved, row.libelle_nuage, row.profession_brute, value]);

  const reset = useCallback(async () => {
    if (!row.override) {
      setValue(row.libelle_defaut);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.gestionProfessionReset(row.profession_brute);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Réinitialisation impossible");
    } finally {
      setSaving(false);
    }
  }, [onSaved, row.libelle_defaut, row.override, row.profession_brute]);

  return (
    <tr className="border-b border-slate-300 last:border-0 hover:bg-slate-50/80">
      <td className="px-3 py-2 align-top font-medium text-slate-800">{row.profession_brute}</td>
      <td className="px-3 py-2 align-top tabular-nums text-slate-600">{row.effectif}</td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              if (dirty) void save();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setValue(row.libelle_nuage);
                e.currentTarget.blur();
              }
            }}
            disabled={saving}
            className={`min-w-[8rem] flex-1 rounded-lg border px-2 py-1 text-sm text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 ${
              row.override ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white"
            }`}
            aria-label={`Libellé nuage pour ${row.profession_brute}`}
          />
          {(row.override || dirty) && (
            <button
              type="button"
              onClick={() => void reset()}
              disabled={saving}
              className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              title={`Réinitialiser (${row.libelle_defaut})`}
            >
              Défaut
            </button>
          )}
          {saving && <span className="text-xs text-slate-400">…</span>}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {!row.override && (
          <p className="mt-1 text-xs text-slate-400">Défaut : {row.libelle_defaut}</p>
        )}
      </td>
    </tr>
  );
}

export function GestionProfessionsPage() {
  const { dataRefreshTick, importEnCours, bumpDataRefresh } = useApp();
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const { data, loading, error, reload } = useAsync(
    () => api.gestionProfessions(),
    [dataRefreshTick, reloadKey],
  );

  const filtered = useMemo(
    () => (data?.lignes ?? []).filter((row) => matchesProfession(row, query)),
    [data, query],
  );

  const handleSaved = useCallback(() => {
    bumpDataRefresh();
    setReloadKey((k) => k + 1);
    reload();
  }, [bumpDataRefresh, reload]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${PAGE_PAD}`}>
        {(loading || importEnCours) && !data && <LoadingSpinner />}
        {!loading && !importEnCours && error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
        )}
        {data && (
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            style={{ marginRight: MENU_CLEARANCE }}
          >
            <div className="shrink-0 overflow-x-auto border-b border-slate-300">
              <table className={FILTER_TABLE_CLASS}>
                <colgroup>
                  <col style={{ width: "42%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "48%" }} />
                </colgroup>
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left align-top text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <ColumnHeaderSearch
                        title="Profession (BDD)"
                        value={query}
                        onChange={setQuery}
                      />
                    </th>
                    <th className="px-3 py-2 text-left align-top text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Effectif
                    </th>
                    <th className="px-3 py-2 text-left align-top text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Libellé nuage
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className={FILTER_TABLE_CLASS}>
                <colgroup>
                  <col style={{ width: "42%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "48%" }} />
                </colgroup>
                <tbody>
                  {filtered.map((row) => (
                    <ProfessionRow
                      key={row.profession_brute}
                      row={row}
                      onSaved={handleSaved}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex shrink-0 justify-end border-t border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              {filtered.length} affiché{filtered.length > 1 ? "s" : ""} sur{" "}
              {data.nombre_professions_distinctes}
              {data.nombre_overrides > 0 && (
                <span className="ml-3 text-amber-700">
                  {data.nombre_overrides} personnalisation
                  {data.nombre_overrides > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
