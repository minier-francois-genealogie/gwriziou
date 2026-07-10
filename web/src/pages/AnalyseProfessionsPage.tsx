import { useState } from "react";
import { api } from "../api/client";
import { AnalyseZoneToggle } from "../components/AnalyseShared";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ProfessionWordcloud } from "../components/ProfessionWordcloud";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";

const PAGE_PAD =
  "p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]";

export function AnalyseProfessionsPage() {
  const { ancrePersonneId, ancetres, descendants, dataRefreshTick, importEnCours } =
    useApp();
  const [zoneOnly, setZoneOnly] = useState(true);

  const { data, loading, error } = useAsync(
    () => api.analyseProfessions(ancrePersonneId, ancetres, descendants, zoneOnly),
    [ancrePersonneId, ancetres, descendants, zoneOnly, dataRefreshTick],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-hidden ${PAGE_PAD}`}>
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
              <ProfessionWordcloud lignes={data.lignes} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
