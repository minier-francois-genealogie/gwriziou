import { NavLink, Outlet } from "react-router-dom";
import { useStatus } from "../hooks/useApi";
import { InstallPrompt } from "./InstallPrompt";
import { RefreshButton } from "./RefreshButton";

export function Layout() {
  const { data: status, reload } = useStatus();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-sky-700 text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <InstallPrompt />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2 sm:px-4">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-sky-900">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="hidden sm:inline">Gwriziou</span>
          </NavLink>

          <nav className="flex flex-1 gap-1">
            <NavLink to="/" end className={navClass}>
              Arbre
            </NavLink>
            <NavLink to="/recherche" className={navClass}>
              Recherche
            </NavLink>
          </nav>

          <RefreshButton onDone={reload} />

          {status?.nb_personnes != null && (
            <span className="hidden text-xs text-slate-400 md:inline">
              {status.nb_personnes} personnes
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-3 sm:p-4">
        <Outlet context={{ status, reloadStatus: reload }} />
      </main>

      <footer className="border-t border-slate-200 py-2 text-center text-xs text-slate-400">
        Flèches : parents ↑ enfants ↓ fratrie ←→ · Home : souche
      </footer>
    </div>
  );
}
