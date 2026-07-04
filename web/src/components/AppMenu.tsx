import { useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import { saveDerniereVue, type AppView } from "../utils/appStorage";

const MENU_EASE = "duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]";

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
        `flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
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

  return (
    <div
      ref={panelRef}
      className="fixed left-3 top-3 z-50 max-w-[calc(100vw-1.5rem)]"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <button
        type="button"
        onClick={toggleMenu}
        className={`flex items-center overflow-hidden transition-all ${MENU_EASE} ${
          menuOpen
            ? "gap-2.5 rounded-2xl border border-slate-200/70 bg-white/90 py-1 pl-1 pr-3 shadow-md backdrop-blur-sm"
            : "gap-0 rounded-xl bg-transparent p-0 shadow-none hover:opacity-90"
        }`}
        aria-label={menuOpen ? "Replier le menu" : "Ouvrir le menu"}
        aria-expanded={menuOpen}
      >
        <img
          src="/icon-192.png"
          alt="Gwriziou"
          className={`shrink-0 rounded-xl ${menuOpen ? "h-9 w-9" : "h-10 w-10"}`}
        />
        <span
          className={`overflow-hidden whitespace-nowrap text-base font-bold text-sky-900 transition-all ${MENU_EASE} ${
            menuOpen ? "max-w-28 translate-x-0 opacity-100" : "max-w-0 -translate-x-1 opacity-0"
          }`}
          aria-hidden={!menuOpen}
        >
          Gwriziou
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] ${MENU_EASE} ${
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <nav
            className={`mt-2 w-max min-w-[10.5rem] origin-top rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm transition-all ${MENU_EASE} ${
              menuOpen
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
            }`}
            aria-label="Navigation principale"
            aria-hidden={!menuOpen}
          >
            <NavItem
              to="/arbre"
              label="Arbre"
              onNavigate={() => closeAndGo("arbre", "/arbre")}
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v6M8 9c-4 0-6 3-6 6v2h16v-2c0-3-2-6-6-6M6 19h12" />
                  <circle cx="12" cy="6" r="2" />
                </svg>
              }
            />
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
              to="/warnings"
              label="Warnings"
              badge={warningBadge}
              onNavigate={() => closeAndGo("warnings", "/warnings")}
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
              }
            />
            <NavItem
              to="/parametres"
              label="Paramètres"
              onNavigate={() => closeAndGo("parametres", "/parametres")}
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              }
            />
          </nav>
        </div>
      </div>
    </div>
  );
}
