import { useMemo, useState } from "react";
import { api } from "../api/client";
import { AnalyseZoneToggle } from "../components/AnalyseShared";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import type { ProfessionNuageItem } from "../types/api";

const PAGE_PAD =
  "p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]";

function nuageFontSize(effectif: number, max: number): string {
  if (max <= 0) return "0.875rem";
  const ratio = effectif / max;
  const size = 0.75 + ratio * 1.75;
  return `${size.toFixed(2)}rem`;
}

function ProfessionTag({ item, max }: { item: ProfessionNuageItem; max: number }) {
  return (
    <span
      className="inline-block rounded-lg bg-sky-50 px-2 py-1 font-medium leading-tight text-sky-900 transition hover:bg-sky-100"
      style={{ fontSize: nuageFontSize(item.effectif, max) }}
      title={`${item.profession} — ${item.effectif}`}
    >
      {item.profession}
      <span className="ml-1 text-[0.65em] font-normal tabular-nums text-sky-600">
        {item.effectif}
      </span>
    </span>
  );
}

export function AnalyseProfessionsPage() {
  const { ancrePersonneId, ancetres, descendants, dataRefreshTick, importEnCours } =
    useApp();
  const [zoneOnly, setZoneOnly] = useState(true);

  const { data, loading, error } = useAsync(
    () => api.analyseProfessions(ancrePersonneId, ancetres, descendants, zoneOnly),
    [ancrePersonneId, ancetres, descendants, zoneOnly, dataRefreshTick],
  );

  const maxEffectif = useMemo(
    () => Math.max(0, ...(data?.lignes.map((l) => l.effectif) ?? [])),
    [data],
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
          <>
            {data.lignes.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune profession dans le périmètre.</p>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                {data.lignes.map((item) => (
                  <ProfessionTag key={item.profession} item={item} max={maxEffectif} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
