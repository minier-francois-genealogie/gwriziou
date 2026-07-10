import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ColumnHeaderLieuTree } from "../components/ColumnHeaderLieuTree";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  ColumnHeaderMultiSelect,
  ColumnHeaderSearch,
  FILTER_TABLE_CLASS,
  MENU_CLEARANCE,
  normalizeSearchText,
} from "../components/TableColumnFilters";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import type { FaitHistoriqueLigne } from "../types/api";
import {
  buildLieuTree,
  collectAllNodeIds,
  rowMatchesLieuSelection,
} from "../utils/lieuTree";

const NIVEAU_FILTERS = [
  { code: "COMMUNAL", label: "Commune" },
  { code: "DEPARTEMENT", label: "Département" },
  { code: "REGIONAL", label: "Région" },
  { code: "NATIONAL", label: "France" },
  { code: "MONDE", label: "Monde" },
] as const;

const CATEGORIE_FILTERS = [
  { code: "ADMINISTRATION", label: "Administration" },
  { code: "GUERRE", label: "Guerre" },
  { code: "PANDEMIE", label: "Épidémie" },
  { code: "CRISE", label: "Crise" },
  { code: "CULTURE", label: "Culture" },
  { code: "EVENEMENT", label: "Événement" },
  { code: "POLITIQUE", label: "Politique" },
  { code: "REGNE", label: "Règne" },
  { code: "SCIENCE", label: "Science" },
] as const;

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

function isOpenEndedFin(fin: string): boolean {
  const value = fin.trim();
  return !value || value === "????" || parseYear(value) === null;
}

/** Année exacte si date ponctuelle, sinon toute période qui contient l'année. */
function matchesAnnee(row: FaitHistoriqueLigne, query: string): boolean {
  const q = query.trim();
  if (!q) return true;

  const yearQuery = parseYear(q);
  if (yearQuery === null) {
    return normalizeSearchText(`${row.debut} ${row.fin} ${row.periode}`).includes(
      normalizeSearchText(q),
    );
  }

  const startYear = parseYear(row.debut);
  if (startYear === null) return false;

  const debutRaw = row.debut.trim();
  const finRaw = row.fin.trim();
  const endYearParsed = parseYear(row.fin);
  const openEnd = isOpenEndedFin(row.fin);
  const isSingleDate = debutRaw === finRaw || (!openEnd && endYearParsed === startYear);

  if (isSingleDate) {
    return startYear === yearQuery;
  }

  const endYear = openEnd
    ? Math.max(startYear, new Date().getFullYear())
    : (endYearParsed ?? startYear);
  return yearQuery >= startYear && yearQuery <= endYear;
}

function filterLignes(
  lignes: FaitHistoriqueLigne[],
  niveaux: Set<string>,
  categories: Set<string>,
  lieuxSelectedIds: readonly string[],
  libelleQuery: string,
  anneeQuery: string,
): FaitHistoriqueLigne[] {
  const lieuxSelected = new Set(lieuxSelectedIds);
  return lignes.filter(
    (row) =>
      niveaux.has(row.niveau) &&
      categories.has(row.categorie) &&
      rowMatchesLieuSelection(row, lieuxSelected) &&
      matchesText(`${row.libelle} ${row.description ?? ""}`, libelleQuery) &&
      matchesAnnee(row, anneeQuery),
  );
}

function rowKey(row: FaitHistoriqueLigne, index: number): string {
  return [
    row.niveau,
    row.debut,
    row.libelle,
    row.commune ?? "",
    row.departement ?? "",
    index,
  ].join("\0");
}

function FaitsTableColgroup() {
  return (
    <colgroup>
      <col style={{ width: "11%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "22%" }} />
      <col style={{ width: "14%" }} />
      <col style={{ width: "41%" }} />
    </colgroup>
  );
}

export function FaitsHistoriquesPage() {
  const { ancrePersonneId, ancetres, descendants, dataRefreshTick, importEnCours } =
    useApp();
  const [zoneOnly, setZoneOnly] = useState(true);
  const [niveaux, setNiveaux] = useState(
    () => new Set<string>(NIVEAU_FILTERS.map((f) => f.code)),
  );
  const [categories, setCategories] = useState(
    () => new Set<string>(CATEGORIE_FILTERS.map((f) => f.code)),
  );
  const [lieuxSelection, setLieuxSelection] = useState<string[]>([]);
  const [libelleQuery, setLibelleQuery] = useState("");
  const [anneeQuery, setAnneeQuery] = useState("");

  const { data: stats } = useAsync(
    () => api.faitsHistoriquesStats(ancrePersonneId, ancetres, descendants),
    [ancrePersonneId, ancetres, descendants, dataRefreshTick],
  );

  const { data, loading, error } = useAsync(
    () => api.faitsHistoriques(ancrePersonneId, ancetres, descendants, zoneOnly),
    [ancrePersonneId, ancetres, descendants, zoneOnly, dataRefreshTick],
  );

  const lieuTree = useMemo(
    () => (data ? buildLieuTree(data.lignes) : []),
    [data],
  );

  useEffect(() => {
    if (!data) {
      setLieuxSelection([]);
      return;
    }
    setLieuxSelection(collectAllNodeIds(buildLieuTree(data.lignes)));
  }, [data, zoneOnly]);

  const filteredLignes = useMemo(
    () =>
      data
        ? filterLignes(
            data.lignes,
            niveaux,
            categories,
            lieuxSelection,
            libelleQuery,
            anneeQuery,
          )
        : [],
    [data, niveaux, categories, lieuxSelection, libelleQuery, anneeQuery],
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
                  <FaitsTableColgroup />
                  <thead>
                    <tr>
                      <th className={`py-2 pr-3 align-top ${MENU_CLEARANCE}`}>
                        <ColumnHeaderSearch
                          title="Année"
                          value={anneeQuery}
                          onChange={setAnneeQuery}
                          placeholder="Année…"
                        />
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderMultiSelect
                          title="Niveau"
                          options={NIVEAU_FILTERS}
                          selected={niveaux}
                          setSelected={setNiveaux}
                        />
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderLieuTree
                          title="Lieu"
                          tree={lieuTree}
                          selectedIds={lieuxSelection}
                          setSelectedIds={setLieuxSelection}
                        />
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderMultiSelect
                          title="Catégorie"
                          options={CATEGORIE_FILTERS}
                          selected={categories}
                          setSelected={setCategories}
                        />
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderSearch
                          title="Libellé"
                          value={libelleQuery}
                          onChange={setLibelleQuery}
                          placeholder="Rechercher…"
                        />
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <table className={FILTER_TABLE_CLASS}>
                  <FaitsTableColgroup />
                  <tbody>
                    {filteredLignes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                          Aucun fait ne correspond aux filtres.
                        </td>
                      </tr>
                    ) : (
                      filteredLignes.map((row, index) => (
                        <tr
                          key={rowKey(row, index)}
                          className="border-b border-slate-300 last:border-0 hover:bg-slate-50/80"
                        >
                          <td className="px-3 py-2 align-top tabular-nums text-slate-600">
                            {row.periode}
                          </td>
                          <td className="px-3 py-2 align-top text-slate-600">
                            {row.niveau_label}
                          </td>
                          <td className="px-3 py-2 align-top text-slate-600">
                            {row.lieu ?? "—"}
                          </td>
                          <td className="px-3 py-2 align-top text-slate-600">
                            {row.categorie_label}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span className="font-medium text-slate-800">{row.libelle}</span>
                            {row.description && (
                              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                                {row.description}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
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
                    Zone : {stats?.nombre_faits_zone ?? data.nombre_faits_zone} — Total :{" "}
                    {stats?.nombre_faits_total ?? data.nombre_faits_total}
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
