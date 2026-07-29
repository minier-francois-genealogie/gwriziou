import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { NoteLigne } from "../types/api";
import { LoadingSpinner } from "./LoadingSpinner";

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

function DeleteNoteButton({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
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
  );
}

export interface NotesModalTarget {
  personName: string;
  chemin: string;
}

interface NotesModalProps {
  target: NotesModalTarget;
  onClose: () => void;
  onChanged?: () => void;
}

export function NotesModal({ target, onClose, onChanged }: NotesModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [notes, setNotes] = useState<NoteLigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.notes(target.chemin);
      setNotes(res.notes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chargement impossible");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [target.chemin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = useCallback(async () => {
    if (!texte.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createNote(target.chemin, texte.trim());
      setTexte("");
      await reload();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Envoi impossible");
    } finally {
      setSubmitting(false);
    }
  }, [texte, target.chemin, reload, onChanged]);

  const supprimer = useCallback(
    async (note: NoteLigne) => {
      setActionId(note.id);
      setError(null);
      try {
        await api.deleteNote(note.chemin, note.fichier);
        await reload();
        onChanged?.();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Suppression impossible");
      } finally {
        setActionId(null);
      }
    },
    [reload, onChanged],
  );

  const userEmail = (user?.email || "").trim().toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Notes — ${target.personName}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Notes
            </p>
            <h2 className="truncate text-base font-semibold text-slate-900">
              {target.personName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fermer"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner variant="inline" />
            </div>
          )}
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {!loading && notes.length === 0 && (
            <p className="text-sm text-slate-500">Aucune note pour le moment.</p>
          )}
          {notes.length > 0 && (
            <ul className="space-y-2">
              {notes.map((note) => {
                const isOwner =
                  !!userEmail &&
                  note.auteur_email.trim().toLowerCase() === userEmail;
                const canDelete = isAdmin || isOwner;
                return (
                  <li
                    key={`${note.chemin}/${note.fichier}`}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {note.auteur_nom || note.auteur_email}
                          </span>
                          {note.cree_le && <> · {formatDate(note.cree_le)}</>}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                          {note.texte}
                        </p>
                      </div>
                      {canDelete && (
                        <DeleteNoteButton
                          disabled={actionId === note.id}
                          onClick={() => void supprimer(note)}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="shrink-0 space-y-2 border-t border-slate-200 px-4 py-3">
          <label className="block">
            <span className="sr-only">Nouvelle note</span>
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Ajouter une note (date, source, correction…)"
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting || !texte.trim()}
              className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {submitting ? "Envoi…" : "Publier"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
