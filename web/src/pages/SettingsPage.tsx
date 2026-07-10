import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { RefreshButton } from "../components/RefreshButton";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";

export function SettingsPage() {
  const { ancetres, descendants, setAncetres, setDescendants } = useApp();
  const { data: status, reload } = useAsync(() => api.status(), []);
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 overflow-y-auto p-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Arbre généalogique</h2>
        <label className="mb-4 flex flex-col gap-2">
          <span className="flex items-center justify-between text-sm text-slate-600">
            <span>Ancêtres</span>
            <span className="font-medium text-slate-900">{ancetres}</span>
          </span>
          <input
            type="range"
            min={0}
            max={8}
            value={ancetres}
            onChange={(e) => setAncetres(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="flex items-center justify-between text-sm text-slate-600">
            <span>Descendants</span>
            <span className="font-medium text-slate-900">{descendants}</span>
          </span>
          <input
            type="range"
            min={0}
            max={6}
            value={descendants}
            onChange={(e) => setDescendants(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <p className="mt-3 text-xs text-slate-400">
          Appliqué au prochain chargement de l&apos;écran Arbre.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Données</h2>
        {status && (
          <p className="mb-3 text-sm text-slate-600">
            {status.nb_personnes} personnes · {status.nb_actes} actes
          </p>
        )}
        <RefreshButton onDone={reload} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-800">Navigation (écran Arbre)</h2>
        <ul className="space-y-1 text-xs leading-relaxed">
          <li>↑ père (ou mère) · ↓ enfant aîné · ←→ même génération</li>
          <li>+ / − : zoom avant / arrière</li>
          <li>Icône ancre : centre de l&apos;arbre (reload)</li>
          <li>Clic cellule = focus · chevrons en bas à droite</li>
          <li>Glisser : déplacer · boutons + / − à droite des chevrons</li>
        </ul>
      </section>

      <button
        type="button"
        onClick={() => navigate("/recherche")}
        className="text-sm text-sky-700 hover:underline"
      >
        ← Retour à la recherche
      </button>
    </div>
  );
}
