import { useCallback, useState } from "react";
import { api, ApiError } from "../api/client";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAsync } from "../hooks/useApi";
import type { NoteLigne } from "../types/api";

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-sky-900">{title}</h2>
      {children}
    </section>
  );
}

export function GestionNotesPage() {
  const { data, loading, error, reload } = useAsync(() => api.adminNotes(), []);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const supprimer = useCallback(
    async (note: NoteLigne) => {
      const key = `${note.chemin}/${note.fichier}`;
      setActionKey(key);
      setActionError(null);
      try {
        await api.deleteNote(note.chemin, note.fichier);
        reload();
      } catch (e) {
        setActionError(
          e instanceof ApiError ? e.message : "Suppression impossible",
        );
      } finally {
        setActionKey(null);
      }
    },
    [reload],
  );

  const notes = data?.notes ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        <div className="mx-auto max-w-3xl space-y-8 pb-8">
          <Section title="Notes en attente">
            <p className="text-sm text-slate-700">
              File de travail stockée dans le dépôt data (
              <span className="font-mono text-xs">
                app/notes/{"{A-Z}/{NOM}/{CLE}/*.json"}
              </span>
              ). La croix rouge supprime le fichier (le dossier disparaît s&apos;il
              est vide).
            </p>
          </Section>

          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner variant="inline" />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}

          {!loading && notes.length === 0 && (
            <p className="text-sm text-slate-500">Aucune note en attente.</p>
          )}

          {!loading && notes.length > 0 && (
            <ul className="space-y-3">
              {notes.map((note) => {
                const key = `${note.chemin}/${note.fichier}`;
                return (
                  <li
                    key={key}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-slate-500">{note.cle}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {note.auteur_nom || note.auteur_email}
                          </span>
                          {note.cree_le && <> · {formatDate(note.cree_le)}</>}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                          {note.texte}
                        </p>
                        <p className="mt-2 font-mono text-[11px] text-slate-400">
                          {note.chemin}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void supprimer(note)}
                        disabled={actionKey === key}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Supprimer la note"
                        aria-label="Supprimer la note"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.25"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
