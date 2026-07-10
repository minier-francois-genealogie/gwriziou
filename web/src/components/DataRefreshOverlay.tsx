import { LoadingSpinner } from "./LoadingSpinner";

export function DataRefreshOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-3 bg-slate-100/90 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Rafraîchissement des données en cours"
    >
      <LoadingSpinner variant="inline" />
      <p className="text-sm text-slate-600">Rafraîchissement des données en cours…</p>
    </div>
  );
}
