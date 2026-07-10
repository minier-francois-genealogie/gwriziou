import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useApp } from "../context/AppContext";

interface RefreshButtonProps {
  onDone?: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForImportEnd(): Promise<void> {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const status = await api.status();
    if (!status.import_en_cours) return;
    await sleep(1000);
  }
  throw new ApiError("Import trop long", 408);
}

export function RefreshButton({ onDone }: RefreshButtonProps) {
  const { bumpDataRefresh, setImportEnCours } = useApp();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setMessage(null);
    setImportEnCours(true);
    try {
      let result;
      try {
        result = await api.rafraichir();
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          await waitForImportEnd();
          result = { status: "unchanged" as const };
        } else {
          throw err;
        }
      }

      if (result.status === "running") {
        await waitForImportEnd();
        const status = await api.status();
        if (status.nb_personnes != null) {
          setMessage(
            `${status.nb_personnes} personnes, ${status.nb_actes ?? "?"} actes`,
          );
        } else {
          setMessage("Données mises à jour");
        }
      } else if (result.status === "unchanged") {
        setMessage("GEDCOM inchangé");
      } else {
        setMessage(
          `${result.nb_personnes ?? "?"} personnes, ${result.nb_actes ?? "?"} actes`,
        );
      }
      bumpDataRefresh();
      onDone?.();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erreur");
      setImportEnCours(false);
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
