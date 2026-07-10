import { useMemo, useState } from "react";
import { api } from "../api/client";
import { AnalyseZoneToggle } from "../components/AnalyseShared";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import type { CompteParLabel, DecennieNoms } from "../types/api";

const PAGE_PAD =
  "p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]";

type VueNoms = "famille" | "prenom";

function DecennieBlock({ row }: { row: DecennieNoms }) {
  const max = Math.max(1, ...row.labels.map((l) => l.effectif));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">
        Années {row.decennie}–{row.decennie + 9}
      </h2>
      <ul className="space-y-2">
        {row.labels.map((item) => (
          <BarRow key={item.label} item={item} max={max} />
        ))}
      </ul>
    </section>
  );
}

function BarRow({ item, max }: { item: CompteParLabel; max: number }) {
  const width = `${Math.round((item.effectif / max) * 100)}%`;
  return (
    <li className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-sm">
      <span className="truncate font-medium text-slate-800" title={item.label}>
        {item.label}
      </span>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-400"
          style={{ width }}
          aria-hidden="true"
        />
      </div>
      <span className="text-right tabular-nums text-slate-500">{item.effectif}</span>
    </li>
  );
}

export function AnalyseNomsPage() {
  const { ancrePersonneId, ancetres, descendants, dataRefreshTick, importEnCours } =
    useApp();
  const [zoneOnly, setZoneOnly] = useState(true);
  const [vue, setVue] = useState<VueNoms>("famille");

  const { data, loading, error } = useAsync(
    () => api.analyseNoms(ancrePersonneId, ancetres, descendants, zoneOnly),
    [ancrePersonneId, ancetres, descendants, zoneOnly, dataRefreshTick],
  );

  const rows = useMemo(
    () =>
      data
        ? vue === "famille"
          ? data.par_decennie_famille
          : data.par_decennie_prenom
        : [],
    [data, vue],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-auto ${PAGE_PAD}`}>
        <AnalyseZoneToggle
          zoneOnly={zoneOnly}
          onChange={setZoneOnly}
          scopeCount={data?.nombre_personnes_scope}
          totalCount={data?.nombre_personnes_total}
        />
        {(loading || importEnCours) && <LoadingSpinner />}
        {!loading && !importEnCours && error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {!loading && !importEnCours && data && (
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setVue("famille")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  vue === "famille"
                    ? "bg-violet-100 text-violet-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Noms de famille
              </button>
              <button
                type="button"
                onClick={() => setVue("prenom")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  vue === "prenom"
                    ? "bg-violet-100 text-violet-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Prénoms
              </button>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-slate-500">
                Pas assez de dates de naissance dans le périmètre.
              </p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {rows.map((row) => (
                  <DecennieBlock key={row.decennie} row={row} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
