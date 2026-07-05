import {
  APPROXIMATION_LABELS,
  REGLE_DECES_MAX_LABELS,
  REGLE_NAISSANCE_MIN_LABELS,
  VIE_DATES_CONSTANTES,
} from "../content/vieDatesRegles";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-sky-900">{title}</h2>
      {children}
    </section>
  );
}

function RulesTable({ rules }: { rules: Record<string, string> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-300 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 font-medium">Code</th>
            <th className="px-3 py-2 font-medium">Signification</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(rules).map(([code, label]) => (
            <tr key={code} className="border-b border-slate-300 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-sky-800">
                {code}
              </td>
              <td className="px-3 py-2 text-slate-700">{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ASavoirPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-300 bg-white px-4 py-3 pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        <h1 className="text-lg font-bold text-sky-900">À savoir</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Bornes de vie estimées, constantes et légende d&apos;affichage.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-8 pb-8">
          <Section title="Constantes">
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[20rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Variable</th>
                    <th className="px-3 py-2 font-medium">Valeur</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {VIE_DATES_CONSTANTES.map((c) => (
                    <tr key={c.nom} className="border-b border-slate-300 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-sky-800">
                        {c.nom}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">{c.valeur}</td>
                      <td className="px-3 py-2 text-slate-700">{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Naissance minimale (date_naissance_min)">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Date GEDCOM complète → EXACT.</li>
              <li>Sinon acte avec date complète → ENVIRON.</li>
              <li>Sinon année seule GEDCOM → 01/01/année (SUPERIEUR_A).</li>
              <li>
                Sinon maximum des features dérivées (mariage, décès, dernier enfant) — voir
                tableau ci-dessous.
              </li>
            </ol>
            <RulesTable rules={REGLE_NAISSANCE_MIN_LABELS} />
          </Section>

          <Section title="Décès maximal (date_deces_max)">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Date GEDCOM complète → EXACT.</li>
              <li>Sinon acte avec date complète → ENVIRON.</li>
              <li>Sinon année seule GEDCOM → 31/12/année (INFERIEUR_A).</li>
              <li>
                Sinon minimum des features dérivées (naissance, mariage, premier enfant) — voir
                tableau ci-dessous.
              </li>
            </ol>
            <RulesTable rules={REGLE_DECES_MAX_LABELS} />
          </Section>

          <Section title="Affichage IHM">
            <p className="text-sm text-slate-700">
              Sans date GEDCOM complète, la borne estimée s&apos;affiche en{" "}
              <span className="text-red-600">rouge</span>. Survoler la date pour voir la règle
              appliquée.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {Object.entries(APPROXIMATION_LABELS).map(([code, label]) => (
                <li key={code}>
                  <span className="font-mono text-xs text-sky-800">{code}</span>
                  {" — "}
                  {label}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Géoloc">
            <p className="text-sm text-slate-700">
              Une personne est considérée vivante en année N si{" "}
              <span className="font-mono text-xs">year(date_naissance_min) ≤ N ≤ year(date_deces_max)</span>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
