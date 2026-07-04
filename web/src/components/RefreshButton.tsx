import { useState } from "react";
import { api, ApiError } from "../api/client";

interface RefreshButtonProps {
  onDone?: () => void;
}

export function RefreshButton({ onDone }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await api.rafraichir();
      if (result.status === "unchanged") {
        setMessage("GEDCOM inchangé");
      } else {
        setMessage(
          `${result.nb_personnes ?? "?"} personnes, ${result.nb_actes ?? "?"} actes`,
        );
      }
      onDone?.();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={loading}
        title="Rafraîchir les données"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        aria-label="Rafraîchir"
      >
        <span className={loading ? "inline-block animate-spin" : ""}>↻</span>
      </button>
      {message && (
        <span className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white shadow">
          {message}
        </span>
      )}
    </div>
  );
}
