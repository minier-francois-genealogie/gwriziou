import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { DirigeantPhotoThumb } from "../components/DirigeantPhotoThumb";
import {
  ColumnHeaderMultiSelect,
  ColumnHeaderSearch,
  FILTER_TABLE_CLASS,
  MENU_CLEARANCE,
  normalizeSearchText,
} from "../components/TableColumnFilters";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import type { DirigeantFranceLigne } from "../types/api";

function matchesText(haystack: string, query: string): boolean {
  const q = normalizeSearchText(query.trim());
  if (!q) return true;
  return normalizeSearchText(haystack).includes(q);
}

function parseYear(value: string | undefined | null): number | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function formatReignDuration(debut: string, fin: string): string | null {
  const start = parseYear(debut);
  if (start === null) return null;
  const end = parseYear(fin) ?? new Date().getFullYear();
  const years = end - start;
  if (years < 0) return null;
  if (years === 0) return "moins d'un an";
  return years === 1 ? "1 an" : `${years} ans`;
}

function matchesAnnee(row: DirigeantFranceLigne, query: string): boolean {
  const q = query.trim();
  if (!q) return true;

  const yearQuery = parseYear(q);
  if (yearQuery === null) {
    return normalizeSearchText(`${row.debut} ${row.fin} ${row.periode}`).includes(
      normalizeSearchText(q),
    );
  }

  const startYear = parseYear(row.debut);
  const endYear = parseYear(row.fin) ?? startYear;
  if (startYear === null) return false;
  return yearQuery >= startYear && yearQuery <= (endYear ?? startYear);
}

function filterLignes(
  lignes: DirigeantFranceLigne[],
  regimes: Set<string>,
  nomQuery: string,
  anneeQuery: string,
  faitsQuery: string,
): DirigeantFranceLigne[] {
  return lignes.filter(
    (row) =>
      regimes.has(row.regime ?? "") &&
      matchesText(`${row.nom} ${row.titre} ${row.vie ?? ""} ${row.lien_predecesseur ?? ""}`, nomQuery) &&
      matchesAnnee(row, anneeQuery) &&
      matchesText(
        [...row.faits_positifs, ...row.faits_negatifs].join(" "),
        faitsQuery,
      ),
  );
}

function FaitsList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <ul className="space-y-0.5 text-xs leading-relaxed text-slate-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function allFaits(row: DirigeantFranceLigne): string[] {
  return [...row.faits_positifs, ...row.faits_negatifs];
}

function DirigeantsTableColgroup() {
  return (
    <colgroup>
      <col style={{ width: "14%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "7%" }} />
      <col style={{ width: "20%" }} />
      <col style={{ width: "49%" }} />
    </colgroup>
  );
}

export function DirigeantsPage() {
  const { ancrePersonneId, ancetres, descendants, dataRefreshTick, importEnCours } =
    useApp();
  const [zoneOnly, setZoneOnly] = useState(true);
  const [nomQuery, setNomQuery] = useState("");
  const [anneeQuery, setAnneeQuery] = useState("");
  const [faitsQuery, setFaitsQuery] = useState("");

  const { data: stats } = useAsync(
    () => api.dirigeantsFranceStats(ancrePersonneId, ancetres, descendants),
    [ancrePersonneId, ancetres, descendants, dataRefreshTick],
  );

  const { data, loading, error } = useAsync(
    () => api.dirigeantsFrance(ancrePersonneId, ancetres, descendants, zoneOnly),
    [ancrePersonneId, ancetres, descendants, zoneOnly, dataRefreshTick],
  );

  const regimeOptions = useMemo(() => {
    if (!data) return [];
    const regimes = new Set<string>();
    for (const row of data.lignes) {
      if (row.regime) regimes.add(row.regime);
    }
    return [...regimes].sort().map((r) => ({ code: r, label: r }));
  }, [data]);

  const [regimes, setRegimes] = useState(
    () => new Set<string>(),
  );

  useEffect(() => {
    if (regimeOptions.length > 0) {
      setRegimes(new Set(regimeOptions.map((o) => o.code)));
    }
  }, [regimeOptions, zoneOnly]);

  const filteredLignes = useMemo(
    () =>
      data
        ? filterLignes(
            data.lignes,
            regimes,
            nomQuery,
            anneeQuery,
            faitsQuery,
          )
        : [],
    [data, regimes, nomQuery, anneeQuery, faitsQuery],
  );

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
                  <DirigeantsTableColgroup />
                  <thead>
                    <tr>
                      <th className={`py-2 pr-3 align-top ${MENU_CLEARANCE}`}>
                        {regimeOptions.length > 0 ? (
                          <ColumnHeaderMultiSelect
                            title="Régime"
                            options={regimeOptions}
                            selected={regimes}
                            setSelected={setRegimes}
                          />
                        ) : (
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Régime
                          </span>
                        )}
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderSearch
                          title="Règne"
                          value={anneeQuery}
                          onChange={setAnneeQuery}
                          placeholder="Année…"
                        />
                      </th>
                      <th className="px-3 py-2 align-top" aria-hidden="true" />
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderSearch
                          title="Nom"
                          value={nomQuery}
                          onChange={setNomQuery}
                          placeholder="Rechercher…"
                        />
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderSearch
                          title="Faits"
                          value={faitsQuery}
                          onChange={setFaitsQuery}
                          placeholder="Filtrer les faits…"
                        />
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <table className={FILTER_TABLE_CLASS}>
                  <DirigeantsTableColgroup />
                  <tbody>
                    {filteredLignes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                          Aucun dirigeant ne correspond aux filtres.
                        </td>
                      </tr>
                    ) : (
                      filteredLignes.map((row) => {
                        const reignDuration = formatReignDuration(row.debut, row.fin);
                        return (
                        <tr
                          key={row.slug}
                          className="border-b border-slate-300 last:border-0 hover:bg-slate-50/80"
                        >
                          <td className="px-3 py-2 align-top text-slate-600">
                            {row.regime ?? "—"}
                          </td>
                          <td className="px-3 py-2 align-top tabular-nums text-slate-600">
                            {row.periode}
                            {reignDuration && (
                              <span className="mt-0.5 block text-xs italic text-slate-500">
                                {reignDuration}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {row.photo_url ? (
                              <DirigeantPhotoThumb src={row.photo_url} alt={row.nom} />
                            ) : (
                              <span className="flex h-14 w-11 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-500">
                                {row.nom
                                  .split(/\s+/)
                                  .map((p) => p[0])
                                  .join("")
                                  .slice(0, 2)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span className="font-medium text-slate-800">{row.nom}</span>
                            {row.vie && (
                              <span className="mt-0.5 block text-xs italic tabular-nums text-slate-500">
                                {row.vie}
                              </span>
                            )}
                            {row.lien_predecesseur && (
                              <span className="mt-0.5 block text-xs italic text-slate-500">
                                {row.lien_predecesseur}
                              </span>
                            )}
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {row.titre}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <FaitsList items={allFaits(row)} />
                          </td>
                        </tr>
                        );
                      })
                    )}
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
                    Zone : {stats?.nombre_dirigeants_zone ?? data.nombre_dirigeants_zone} — Total :{" "}
                    {stats?.nombre_dirigeants_total ?? data.nombre_dirigeants_total}
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
