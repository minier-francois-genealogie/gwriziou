import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { TreeMenuIcon } from "./GenealogyIcons";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useApi";
import { saveDerniereVue, type AppView } from "../utils/appStorage";

function NavItem({
  to,
  label,
  icon,
  badge,
  onNavigate,
  indent = false,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  onNavigate: () => void;
  indent?: boolean;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl py-2 text-sm font-medium ${
          indent ? "pl-5 pr-2.5" : "px-2.5"
        } ${
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

function HistoireIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function FaitsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function DirigeantsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  );
}

function AideIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 4.2 1.8c-.7.6-1.2 1.2-1.2 2.2" />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AProposIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WarningsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ASavoirIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

function ParametresIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function AnalyseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-6 4 3 5-8" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M10 19V9" />
      <path d="M16 19v-4" />
      <path d="M22 19V3" />
    </svg>
  );
}

function NuageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5-2.5 0-5.5 3-6.5 1-3.5 5-4.5 7-1.5 2.5-.5 5 1.5 4.5 4.5-1 2.5-4 4-6.5 3.5Z" />
      <path d="M8 14h.01M12 12h.01M16 14h.01" />
    </svg>
  );
}

function NomsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16" />
      <path d="M6 16V8" />
      <path d="M10 16V4" />
      <path d="M14 16v-6" />
      <path d="M18 16v-3" />
    </svg>
  );
}

function GestionDataIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

function ProfessionsGestionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 7v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ComptesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="8" r="4" />
      <path d="M3 20c0-3.3 3.6-6 7-6s7 2.7 7 6" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  );
}

function PadlockOpenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    </svg>
  );
}

export function AppMenu() {
  const { menuOpen, setMenuOpen, toggleMenu, ancrePersonneId, ancetres, descendants, dataRefreshTick } =
    useApp();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: warningStats } = useAsync(
    () =>
      isAdmin
        ? api.warningsStats(ancrePersonneId, ancetres, descendants)
        : Promise.resolve(null),
    [isAdmin, ancrePersonneId, ancetres, descendants, dataRefreshTick],
  );

  const { data: faitsStats } = useAsync(
    () => api.faitsHistoriquesStats(ancrePersonneId, ancetres, descendants),
    [ancrePersonneId, ancetres, descendants, dataRefreshTick],
  );

  const { data: dirigeantsStats } = useAsync(
    () => api.dirigeantsFranceStats(ancrePersonneId, ancetres, descendants),
    [ancrePersonneId, ancetres, descendants, dataRefreshTick],
  );

  const { data: notesIndex } = useAsync(
    () => (isAdmin ? api.notesIndex() : Promise.resolve(null)),
    [isAdmin, dataRefreshTick, menuOpen],
  );

  const onHistoireRoute =
    location.pathname.startsWith("/histoire") ||
    location.pathname === "/faits-historiques";
  const [histoireOpen, setHistoireOpen] = useState(onHistoireRoute);

  const onAideRoute = location.pathname.startsWith("/aide");
  const [aideOpen, setAideOpen] = useState(onAideRoute);

  const onAnalyseRoute = location.pathname.startsWith("/analyse");
  const [analyseOpen, setAnalyseOpen] = useState(onAnalyseRoute);

  const onGestionRoute = location.pathname.startsWith("/gestion");
  const [gestionOpen, setGestionOpen] = useState(onGestionRoute);

  const onAdminRoute = location.pathname.startsWith("/admin");
  const [adminOpen, setAdminOpen] = useState(onAdminRoute);

  useEffect(() => {
    if (onHistoireRoute) setHistoireOpen(true);
  }, [onHistoireRoute]);

  useEffect(() => {
    if (onAideRoute) setAideOpen(true);
  }, [onAideRoute]);

  useEffect(() => {
    if (onAnalyseRoute) setAnalyseOpen(true);
  }, [onAnalyseRoute]);

  useEffect(() => {
    if (onGestionRoute) setGestionOpen(true);
  }, [onGestionRoute]);

  useEffect(() => {
    if (onAdminRoute) setAdminOpen(true);
  }, [onAdminRoute]);

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

  const dirigeantsBadge = dirigeantsStats
    ? `${dirigeantsStats.nombre_dirigeants_zone} / ${dirigeantsStats.nombre_dirigeants_total}`
    : undefined;

  const notesBadge =
    notesIndex && notesIndex.total > 0 ? String(notesIndex.total) : undefined;

  const onMap = location.pathname === "/geoloc";

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

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

      {menuOpen && user && (
        <button
          type="button"
          onClick={() => void onLogout()}
          className="flex w-full items-center gap-2 px-3 py-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          aria-label={`Déconnexion (${user.prenom})`}
          title="Se déconnecter"
        >
          <PadlockOpenIcon />
          <span>{user.prenom}</span>
        </button>
      )}

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
          <div>
            <button
              type="button"
              onClick={() => setHistoireOpen((open) => !open)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium ${
                onHistoireRoute
                  ? "bg-sky-50 text-sky-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              aria-expanded={histoireOpen}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                <HistoireIcon />
              </span>
              <span className="min-w-0 flex-1 text-left">Histoire</span>
              <svg
                viewBox="0 0 24 24"
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${histoireOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {histoireOpen && (
              <div className="mt-0.5 space-y-0.5">
                <NavItem
                  to="/histoire/faits"
                  label="Faits"
                  badge={faitsBadge}
                  indent
                  onNavigate={() => closeAndGo("histoire-faits", "/histoire/faits")}
                  icon={<FaitsIcon />}
                />
                <NavItem
                  to="/histoire/dirigeants"
                  label="Dirigeants"
                  badge={dirigeantsBadge}
                  indent
                  onNavigate={() => closeAndGo("histoire-dirigeants", "/histoire/dirigeants")}
                  icon={<DirigeantsIcon />}
                />
              </div>
            )}
          </div>
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
          <div>
            <button
              type="button"
              onClick={() => setAnalyseOpen((open) => !open)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium ${
                onAnalyseRoute
                  ? "bg-sky-50 text-sky-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              aria-expanded={analyseOpen}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                <AnalyseIcon />
              </span>
              <span className="min-w-0 flex-1 text-left">Analyse</span>
              <svg
                viewBox="0 0 24 24"
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${analyseOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {analyseOpen && (
              <div className="mt-0.5 space-y-0.5">
                <NavItem
                  to="/analyse/stats"
                  label="Statistiques familiales"
                  indent
                  onNavigate={() => closeAndGo("analyse-stats", "/analyse/stats")}
                  icon={<StatsIcon />}
                />
                <NavItem
                  to="/analyse/professions"
                  label="Nuage de professions"
                  indent
                  onNavigate={() => closeAndGo("analyse-professions", "/analyse/professions")}
                  icon={<NuageIcon />}
                />
                <NavItem
                  to="/analyse/noms"
                  label="Noms par décennie"
                  indent
                  onNavigate={() => closeAndGo("analyse-noms", "/analyse/noms")}
                  icon={<NomsIcon />}
                />
              </div>
            )}
          </div>
          {isAdmin && (
            <div className="space-y-0.5 rounded-xl bg-amber-50 p-1">
              <div>
                <button
                  type="button"
                  onClick={() => setGestionOpen((open) => !open)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium ${
                    onGestionRoute
                      ? "bg-amber-100 text-amber-950"
                      : "text-slate-700 hover:bg-amber-100/80"
                  }`}
                  aria-expanded={gestionOpen}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                    <GestionDataIcon />
                  </span>
                  <span className="min-w-0 flex-1 text-left">Gestion data</span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${gestionOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {gestionOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    <NavItem
                      to="/gestion/professions"
                      label="Professions"
                      indent
                      onNavigate={() => closeAndGo("gestion-professions", "/gestion/professions")}
                      icon={<ProfessionsGestionIcon />}
                    />
                    <NavItem
                      to="/gestion/warnings"
                      label="Warnings"
                      badge={warningBadge}
                      indent
                      onNavigate={() => closeAndGo("gestion-warnings", "/gestion/warnings")}
                      icon={<WarningsIcon />}
                    />
                    <NavItem
                      to="/gestion/notes"
                      label="Notes"
                      badge={notesBadge}
                      indent
                      onNavigate={() => closeAndGo("gestion-notes", "/gestion/notes")}
                      icon={<NotesIcon />}
                    />
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setAdminOpen((open) => !open)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium ${
                    onAdminRoute
                      ? "bg-amber-100 text-amber-950"
                      : "text-slate-700 hover:bg-amber-100/80"
                  }`}
                  aria-expanded={adminOpen}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                    <AdminIcon />
                  </span>
                  <span className="min-w-0 flex-1 text-left">Admin</span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${adminOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {adminOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    <NavItem
                      to="/admin/comptes"
                      label="Gestion de compte"
                      indent
                      onNavigate={() => closeAndGo("admin-comptes", "/admin/comptes")}
                      icon={<ComptesIcon />}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => setAideOpen((open) => !open)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium ${
                onAideRoute
                  ? "bg-sky-50 text-sky-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              aria-expanded={aideOpen}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                <AideIcon />
              </span>
              <span className="min-w-0 flex-1 text-left">Aide</span>
              <svg
                viewBox="0 0 24 24"
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${aideOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {aideOpen && (
              <div className="mt-0.5 space-y-0.5">
                <NavItem
                  to="/aide/a-propos"
                  label="À propos"
                  indent
                  onNavigate={() => closeAndGo("aide-a-propos", "/aide/a-propos")}
                  icon={<AProposIcon />}
                />
                <NavItem
                  to="/aide/a-savoir"
                  label="À savoir"
                  indent
                  onNavigate={() => closeAndGo("aide-a-savoir", "/aide/a-savoir")}
                  icon={<ASavoirIcon />}
                />
                <NavItem
                  to="/aide/parametres"
                  label="Paramètres"
                  indent
                  onNavigate={() => closeAndGo("aide-parametres", "/aide/parametres")}
                  icon={<ParametresIcon />}
                />
              </div>
            )}
          </div>
        </nav>
        </>
      )}
    </div>
  );
}
