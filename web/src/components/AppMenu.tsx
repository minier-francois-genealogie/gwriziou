import { useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { TreeMenuIcon } from "./GenealogyIcons";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import { saveDerniereVue, type AppView } from "../utils/appStorage";

function NavItem({
  to,
  label,
  icon,
  badge,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  onNavigate: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium ${
          isActive
            ? "bg-sky-700 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`
      }
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {badge && (
        <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-900 [.bg-sky-700_&]:bg-white/20 [.bg-sky-700_&]:text-white">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

export function AppMenu() {
  const { menuOpen, setMenuOpen, toggleMenu, ancrePersonneId, ancetres, descendants } =
    useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: warningStats } = useAsync(
    () => api.warningsStats(ancrePersonneId, ancetres, descendants),
    [ancrePersonneId, ancetres, descendants],
  );

  const { data: faitsStats } = useAsync(
    () => api.faitsHistoriquesStats(ancrePersonneId, ancetres, descendants),
    [ancrePersonneId, ancetres, descendants],
  );

  const closeAndGo = (view: AppView, path: string) => {
    saveDerniereVue(view);
    setMenuOpen(false);
    if (location.pathname !== path) navigate(path);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen, setMenuOpen]);

  const warningBadge = warningStats
    ? `${warningStats.nombre_warning_zone} / ${warningStats.nombre_warning_total}`
    : undefined;

  const faitsBadge = faitsStats
    ? `${faitsStats.nombre_faits_zone} / ${faitsStats.nombre_faits_total}`
    : undefined;

  const onMap = location.pathname === "/geoloc";

  return (
    <div
      ref={panelRef}
      className={`fixed left-3 top-3 z-[1100] w-fit max-w-[calc(100vw-1.5rem)] rounded-2xl border ${
        menuOpen
          ? "min-w-[10.5rem] border-slate-200/80 bg-white/95 shadow-lg backdrop-blur-sm"
          : "border-transparent bg-transparent shadow-none"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <button
        type="button"
        onClick={toggleMenu}
        className={`flex items-center rounded-xl py-1 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 ${
          menuOpen ? "w-full gap-2.5 pr-2" : "pr-1"
        }`}
        aria-label={menuOpen ? "Replier le menu" : "Ouvrir le menu"}
        aria-expanded={menuOpen}
      >
        <img
          src="/icon-192.png"
          alt="Gwriziou"
          className={`h-9 w-9 shrink-0 rounded-xl ${!menuOpen && onMap ? "drop-shadow-md" : ""}`}
        />
        {menuOpen && (
          <span className="whitespace-nowrap text-base font-bold text-sky-900">Gwriziou</span>
        )}
      </button>

      {menuOpen && (
        <>
          <div
            className="mx-auto my-0.5 h-px w-4/5 max-w-[7.5rem] bg-slate-300"
            aria-hidden="true"
          />
          <nav
            className="min-w-[10.5rem] px-1.5 pb-1.5 pt-1"
            aria-label="Navigation principale"
          >
          <NavItem
            to="/recherche"
            label="Recherche"
            onNavigate={() => closeAndGo("recherche", "/recherche")}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            }
          />
          <NavItem
            to="/arbre"
            label="Arbre"
            onNavigate={() => closeAndGo("arbre", "/arbre")}
            icon={<TreeMenuIcon />}
          />
          <NavItem
            to="/warnings"
            label="Warnings"
            badge={warningBadge}
            onNavigate={() => closeAndGo("warnings", "/warnings")}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <path d="M12 9v4" />
                <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
              </svg>
            }
          />
          <NavItem
            to="/faits-historiques"
            label="Faits historiques"
            badge={faitsBadge}
            onNavigate={() => closeAndGo("faits-historiques", "/faits-historiques")}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="M8 7h8M8 11h8M8 15h5" />
              </svg>
            }
          />
          <NavItem
            to="/geoloc"
            label="Géoloc"
            onNavigate={() => closeAndGo("geoloc", "/geoloc")}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            }
          />
          <NavItem
            to="/a-savoir"
            label="À savoir"
            onNavigate={() => closeAndGo("a-savoir", "/a-savoir")}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
                <path d="M12 11v5" />
              </svg>
            }
          />
          <NavItem
            to="/parametres"
            label="Paramètres"
            onNavigate={() => closeAndGo("parametres", "/parametres")}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
        </nav>
        </>
      )}
    </div>
  );
}
