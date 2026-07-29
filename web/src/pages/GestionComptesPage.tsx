import { useCallback, useState } from "react";
import { api, ApiError } from "../api/client";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAsync } from "../hooks/useApi";
import type { CompteLigne } from "../types/api";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-sky-900">{title}</h2>
      {children}
    </section>
  );
}

export function GestionComptesPage() {
  const { data, loading, error, reload } = useAsync(() => api.adminComptes(), []);
  const [password, setPassword] = useState("");
  const [hash, setHash] = useState<string | null>(null);
  const [hashError, setHashError] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [actionEmail, setActionEmail] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const generateHash = useCallback(async () => {
    const value = password.trim();
    if (!value) return;
    setHashing(true);
    setHashError(null);
    setHash(null);
    try {
      const result = await api.adminHashPassword(value);
      setHash(result.password_hash);
    } catch (e) {
      setHashError(e instanceof ApiError ? e.message : "Génération impossible");
    } finally {
      setHashing(false);
    }
  }, [password]);

  const toggleActif = useCallback(
    async (row: CompteLigne) => {
      setActionEmail(row.email);
      setActionError(null);
      try {
        await api.adminSetCompteActif(row.email, !row.actif);
        reload();
      } catch (e) {
        setActionError(
          e instanceof ApiError ? e.message : "Mise à jour du compte impossible",
        );
      } finally {
        setActionEmail(null);
      }
    },
    [reload],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        <div className="mx-auto max-w-3xl space-y-8 pb-8">
          <Section title="Comptes d'accès">
            <p className="text-sm text-slate-700">
              Les comptes sont stockés dans le dépôt data (
              <span className="font-mono text-xs">app/comptes/{"{email}"}.json</span>
              ). Une demande depuis la page de connexion crée le fichier avec{" "}
              <span className="font-mono text-xs">actif: false</span>. Un administrateur
              peut ensuite activer (ou désactiver) le compte ici — la mise à jour est
              poussée sur GitHub immédiatement.
            </p>
          </Section>

          <Section title="Générer un hash de mot de passe">
            <p className="text-sm text-slate-700">
              Outil manuel (Argon2id) si vous créez un fichier compte à la main. Le mot
              de passe en clair n&apos;est pas enregistré.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Mot de passe</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void generateHash();
                  }}
                  autoComplete="new-password"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </label>
              <button
                type="button"
                onClick={() => void generateHash()}
                disabled={hashing || !password.trim()}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
              >
                {hashing ? "Calcul…" : "Générer le hash"}
              </button>
            </div>
            {hashError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {hashError}
              </p>
            )}
            {hash && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hash à copier
                </p>
                <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed break-all text-slate-700">
                  {hash}
                </pre>
              </div>
            )}
          </Section>

          <Section title="Comptes disponibles">
            {loading && !data && <LoadingSpinner />}
            {!loading && error && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            )}
            {actionError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </p>
            )}
            {data && (
              <>
                <p className="text-sm text-slate-600">
                  Source :{" "}
                  <span className="font-mono text-xs">{data.source_fichier}</span>
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Nom</th>
                        <th className="px-3 py-2 font-medium">Prénom</th>
                        <th className="px-3 py-2 font-medium">Rôle</th>
                        <th className="px-3 py-2 font-medium">Actif</th>
                        <th className="px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.comptes.map((row) => (
                        <tr
                          key={row.email}
                          className="border-b border-slate-300 last:border-0"
                        >
                          <td className="px-3 py-2 font-mono text-xs text-slate-800">
                            {row.email}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.nom}</td>
                          <td className="px-3 py-2 text-slate-700">{row.prenom}</td>
                          <td className="px-3 py-2 font-mono text-xs text-sky-800">
                            {row.role}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={
                                row.actif
                                  ? "font-medium text-emerald-700"
                                  : "font-medium text-amber-700"
                              }
                            >
                              {row.actif ? "oui" : "non"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              disabled={actionEmail === row.email}
                              onClick={() => void toggleActif(row)}
                              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {actionEmail === row.email
                                ? "…"
                                : row.actif
                                  ? "Désactiver"
                                  : "Activer"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.comptes.length === 0 && (
                  <p className="text-sm text-slate-600">Aucun compte défini.</p>
                )}
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
