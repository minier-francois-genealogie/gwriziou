import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppMenu } from "../components/AppMenu";
import { DataRefreshOverlay } from "../components/DataRefreshOverlay";
import { InstallPrompt } from "../components/InstallPrompt";
import { MobilePwaGate } from "../components/MobilePwaGate";
import { PortraitRotateOverlay } from "../components/PortraitRotateOverlay";
import { PwaUpdateBanner } from "../components/PwaUpdateBanner";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { useAsync } from "../hooks/useApi";
import { saveDerniereVue, type AppView } from "../utils/appStorage";

function viewFromPath(pathname: string): AppView {
  if (pathname === "/arbre") return "arbre";
  if (pathname === "/geoloc") return "geoloc";
  if (pathname === "/histoire/faits" || pathname === "/faits-historiques") {
    return "histoire-faits";
  }
  if (pathname === "/histoire/dirigeants") return "histoire-dirigeants";
  if (pathname === "/analyse/stats") return "analyse-stats";
  if (pathname === "/analyse/professions") return "analyse-professions";
  if (pathname === "/gestion/professions") return "gestion-professions";
  if (pathname === "/gestion/warnings") return "gestion-warnings";
  if (pathname === "/aide/a-propos") return "aide-a-propos";
  if (pathname === "/aide/warnings" || pathname === "/warnings") return "aide-warnings";
  if (pathname === "/aide/a-savoir" || pathname === "/a-savoir") return "aide-a-savoir";
  if (pathname === "/aide/parametres" || pathname === "/parametres") {
    return "aide-parametres";
  }
  if (pathname === "/recherche") return "recherche";
  return "recherche";
}

const STATUS_POLL_IMPORT_MS = 2000;
const STATUS_POLL_IDLE_MS = 15000;

export function Layout() {
  const {
    initAncrePersonneId,
    setImportEnCours,
    dataRefreshTick,
    bumpDataRefresh,
    importEnCours,
  } = useApp();
  const { data: status, reload: reloadStatus } = useAsync(
    () => api.status(),
    [dataRefreshTick],
  );
  const location = useLocation();
  const navigate = useNavigate();
  const wasImportingRef = useRef(false);

  useEffect(() => {
    setImportEnCours(Boolean(status?.import_en_cours));
  }, [status?.import_en_cours, setImportEnCours]);

  useEffect(() => {
    if (wasImportingRef.current && !importEnCours) {
      bumpDataRefresh();
    }
    wasImportingRef.current = importEnCours;
  }, [importEnCours, bumpDataRefresh]);

  useEffect(() => {
    reloadStatus();
  }, [reloadStatus]);

  useEffect(() => {
    const pollMs = importEnCours ? STATUS_POLL_IMPORT_MS : STATUS_POLL_IDLE_MS;
    const timer = window.setInterval(() => reloadStatus(), pollMs);
    return () => window.clearInterval(timer);
  }, [importEnCours, reloadStatus]);

  useEffect(() => {
    if (status?.id_gedcom_racine) {
      initAncrePersonneId(status.id_gedcom_racine);
    }
  }, [status?.id_gedcom_racine, initAncrePersonneId]);

  useEffect(() => {
    saveDerniereVue(viewFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/tree") {
      navigate("/arbre", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <MobilePwaGate>
      <div className="relative flex h-dvh flex-col overflow-hidden bg-slate-100">
        {importEnCours && <DataRefreshOverlay />}
        <PortraitRotateOverlay />
        <PwaUpdateBanner />
        <InstallPrompt />
        <AppMenu />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </MobilePwaGate>
  );
}
