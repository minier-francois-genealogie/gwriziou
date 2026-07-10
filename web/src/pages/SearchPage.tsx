import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ActeModal } from "../components/ActeModal";
import { PhotoModal } from "../components/PhotoModal";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PersonPanel } from "../components/PersonPanel";
import { PersonVieResume } from "../components/PersonVieResume";
import { PersonName } from "../components/SexeIcon";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import { usePhotoModal } from "../hooks/usePhotoModal";
import type { ActeType, PersonneResume } from "../types/api";

const PAGE_GUTTER = "pl-[calc(env(safe-area-inset-left,0px)+3.75rem)]";

export function SearchPage() {
  const { ancrePersonneId, setAncrePersonneId } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [fichePersonneId, setFichePersonneId] = useState(ancrePersonneId);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [acteModal, setActeModal] = useState<{
    type: ActeType;
    url: string;
    name: string;
  } | null>(null);

  const { photoModal, openPhotos, openPhotosForPerson, closePhotos } = usePhotoModal();

  const trimmed = query.trim();
  const { data, loading, error } = useAsync(
    () => (trimmed.length >= 1 ? api.recherche(trimmed, page, 20) : Promise.resolve(null)),
    [trimmed, page],
  );

  const { data: personne, loading: personneLoading } = useAsync(
    () => api.personne(fichePersonneId),
    [fichePersonneId],
  );

  useEffect(() => {
    const state = location.state as { fichePersonneId?: string } | null;
    if (state?.fichePersonneId) {
      setFichePersonneId(state.fichePersonneId);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    setPage(1);
    if (trimmed.length >= 1) setSuggestionsOpen(true);
    else setSuggestionsOpen(false);
  }, [trimmed]);

  const selectPerson = (person: PersonneResume) => {
    setFichePersonneId(person.id_gedcom);
    setSuggestionsOpen(false);
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const showSuggestions = suggestionsOpen && trimmed.length >= 1;

  const handleActeClick = (type: ActeType, url: string, name = "Personne") => {
    setActeModal({ type, url, name });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={`relative isolate z-40 shrink-0 bg-slate-100 pb-3 pr-3 pt-3 ${PAGE_GUTTER}`}
      >
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? "search-person-suggestions" : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (trimmed.length >= 1) setSuggestionsOpen(true);
          }}
          placeholder="Nom, prénom…"
          className="min-w-0 w-full cursor-text rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />

        {showSuggestions && (
          <div
            id="search-person-suggestions"
            className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            {loading && (
              <div className="flex justify-center py-8">
                <LoadingSpinner variant="inline" />
              </div>
            )}
            {error && (
              <p className="border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {data && data.total > 0 && (
              <ul className="max-h-[min(50vh,18rem)] overflow-y-auto bg-white">
                {data.resultats.map((person) => (
                  <li key={person.id_gedcom}>
                    <button
                      type="button"
                      onClick={() => selectPerson(person)}
                      className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-sky-50 ${
                        person.id_gedcom === fichePersonneId ? "bg-sky-100 font-medium" : ""
                      }`}
                    >
                      <PersonName
                        nom={person.nom}
                        prenoms={person.prenoms}
                        sexe={person.sexe}
                      />
                      <PersonVieResume
                        naissance={person.naissance}
                        lieuNaissance={person.lieu_naissance}
                        deces={person.deces}
                        lieuDeces={person.lieu_deces}
                        date_naissance_min={person.date_naissance_min}
                        date_naissance_min_approximation={
                          person.date_naissance_min_approximation
                        }
                        date_naissance_min_regle={person.date_naissance_min_regle}
                        date_deces_max={person.date_deces_max}
                        date_deces_max_approximation={person.date_deces_max_approximation}
                        date_deces_max_regle={person.date_deces_max_regle}
                        naissance_gedcom={person.naissance_gedcom}
                        deces_gedcom={person.deces_gedcom}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {data && data.total === 0 && !loading && (
              <p className="px-3 py-2 text-sm text-slate-500">
                Aucun résultat pour « {trimmed} ».
              </p>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 border-t border-slate-300 bg-white px-3 py-2 text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Page précédente"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <span className="text-slate-500">
                  {page}/{totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Page suivante"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <PersonPanel
          personne={personne ?? null}
          loading={personneLoading}
          ancrePersonneId={ancrePersonneId}
          onAncre={setAncrePersonneId}
          onActeClick={handleActeClick}
          onNavigate={setFichePersonneId}
          onPhotoClick={openPhotos}
          onRelationPhotoClick={(id, nom, prenoms) => {
            void openPhotosForPerson(id, nom, prenoms);
          }}
        />
      </div>

      {acteModal && (
        <ActeModal
          type={acteModal.type}
          url={acteModal.url}
          personName={acteModal.name}
          onClose={() => setActeModal(null)}
        />
      )}

      {photoModal && (
        <PhotoModal
          photos={photoModal.photos}
          personName={photoModal.personName}
          onClose={closePhotos}
        />
      )}
    </div>
  );
}
