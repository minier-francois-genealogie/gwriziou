import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppMenu } from "../components/AppMenu";
import { InstallPrompt } from "../components/InstallPrompt";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { useAsync } from "../hooks/useApi";
import { saveDerniereVue } from "../utils/appStorage";

export function Layout() {
  const { initAncrePersonneId } = useApp();
  const { data: status } = useAsync(() => api.status(), []);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (status?.id_gedcom_racine) {
      initAncrePersonneId(status.id_gedcom_racine);
    }
  }, [status?.id_gedcom_racine, initAncrePersonneId]);

  useEffect(() => {
    const view =
      location.pathname === "/arbre"
        ? "arbre"
        : location.pathname === "/parametres"
          ? "parametres"
          : location.pathname === "/warnings"
            ? "warnings"
            : "recherche";
    saveDerniereVue(view);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/tree") {
      navigate("/arbre", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-slate-100">
      <InstallPrompt />
      <AppMenu />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
