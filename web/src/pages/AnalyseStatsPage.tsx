import { useState } from "react";
import { api } from "../api/client";
import { AnalyseZoneToggle, StatCard, formatPercent } from "../components/AnalyseShared";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";

const PAGE_PAD =
  "p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]";

export function AnalyseStatsPage() {
  const { ancrePersonneId, ancetres, descendants, dataRefreshTick, importEnCours } =
    useApp();
  const [zoneOnly, setZoneOnly] = useState(true);

  const { data, loading, error } = useAsync(
    () => api.analyseStats(ancrePersonneId, ancetres, descendants, zoneOnly),
    [ancrePersonneId, ancetres, descendants, zoneOnly, dataRefreshTick],
  );

  const scopeLabel = zoneOnly ? " (zone)" : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-auto ${PAGE_PAD}`}>
        <AnalyseZoneToggle
          zoneOnly={zoneOnly}
          onChange={setZoneOnly}
          scopeCount={data?.nombre_personnes_zone}
          totalCount={data?.nombre_personnes_total}
        />
        {(loading || importEnCours) && <LoadingSpinner />}
        {!loading && !importEnCours && error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {!loading && !importEnCours && data && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label={`Personnes${scopeLabel}`}
              value={data.nombre_personnes_zone}
              hint={
                zoneOnly
                  ? `${data.nombre_personnes_total} au total dans la base`
                  : undefined
              }
            />
            <StatCard label={`Familles${scopeLabel}`} value={data.nombre_familles_zone} />
            <StatCard
              label="Hommes / Femmes"
              value={`${data.hommes_zone} / ${data.femmes_zone}`}
              hint={
                data.sexe_inconnu_zone > 0
                  ? `${data.sexe_inconnu_zone} sexe inconnu`
                  : undefined
              }
            />
            <StatCard
              label="Avec profession"
              value={data.avec_profession_zone}
              hint={formatPercent(
                data.avec_profession_zone,
                data.nombre_personnes_zone,
              )}
            />
            <StatCard
              label="Naissance connue"
              value={data.avec_naissance_zone}
              hint={formatPercent(
                data.avec_naissance_zone,
                data.nombre_personnes_zone,
              )}
            />
            <StatCard
              label="Décès connu"
              value={data.avec_deces_zone}
              hint={formatPercent(data.avec_deces_zone, data.nombre_personnes_zone)}
            />
            <StatCard
              label="Âge moyen au décès"
              value={
                data.age_moyen_deces_zone != null
                  ? `${data.age_moyen_deces_zone} ans`
                  : "—"
              }
              hint="Personnes avec naissance et décès datés"
            />
            <StatCard
              label="Enfants par famille (moy.)"
              value={
                data.enfants_par_famille_moyen != null
                  ? data.enfants_par_famille_moyen
                  : "—"
              }
            />
            <StatCard
              label="Enfants par famille (max.)"
              value={data.enfants_par_famille_max}
            />
          </div>
        )}
      </div>
    </div>
  );
}
