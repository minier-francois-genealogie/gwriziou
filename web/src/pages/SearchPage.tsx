import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAsync } from "../hooks/useApi";
import type { PersonneResume } from "../types/api";
import { formatDates, formatNom } from "../utils/format";

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setQuery(initialQ);
    setPage(1);
  }, [initialQ]);

  const trimmed = query.trim();
  const { data, loading, error } = useAsync(
    () => (trimmed.length >= 1 ? api.recherche(trimmed, page, 20) : Promise.resolve(null)),
    [trimmed, page],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query.trim() ? { q: query.trim() } : {});
    setPage(1);
  };

  const goToTree = (person: PersonneResume) => {
    navigate(`/tree?id=${encodeURIComponent(person.id_gedcom)}`);
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, prénom, profession…"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          autoFocus
        />
        <button
          type="submit"
          className="rounded-xl bg-sky-700 px-5 py-3 font-medium text-white hover:bg-sky-800"
        >
          Chercher
        </button>
      </form>

      {loading && (
        <p className="text-center text-slate-500">Recherche en cours…</p>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {data && data.total === 0 && trimmed && (
        <p className="text-center text-slate-500">Aucun résultat pour « {trimmed} ».</p>
      )}

      {data && data.total > 0 && (
        <>
          <p className="text-sm text-slate-500">
            {data.total} résultat{data.total > 1 ? "s" : ""}
          </p>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {data.resultats.map((person) => (
              <li key={person.id_gedcom}>
                <button
                  type="button"
                  onClick={() => goToTree(person)}
                  className="flex w-full flex-col px-4 py-3 text-left hover:bg-sky-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-slate-900">
                    {formatNom(person.nom, person.prenoms)}
                  </span>
                  <span className="text-sm text-slate-500">
                    {[formatDates(person.naissance, null), person.lieu_naissance, person.profession]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                ← Préc.
              </button>
              <span className="text-sm text-slate-500">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                Suiv. →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
