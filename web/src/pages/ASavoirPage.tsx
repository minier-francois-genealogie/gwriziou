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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
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

          <Section title="Documents GitHub — dossiers et fichiers">
            <p className="text-sm text-slate-700">
              Les scans d&apos;état civil et les photos sont stockés sur GitHub sous{" "}
              <span className="font-mono text-xs">sources/documents/</span>, un dossier par
              personne. La clé est sémantique (identité de naissance), indépendante des id
              GEDCOM.
            </p>

            <h3 className="text-sm font-semibold text-slate-800">Arborescence</h3>
            <p className="text-sm text-slate-700">
              Chemin relatif :{" "}
              <span className="font-mono text-xs">
                sources/documents/&#123;A-Z&#125;/&#123;NOM&#125;/&#123;clé personne&#125;/
              </span>
            </p>
            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-700">
{`{NOM}__{prenoms}__{AAAA-MM-JJ}__{dept}__{commune}

Exemple :
B/BELLAMY/BELLAMY__Joseph_Marie_Jean_Barnabe__1805-06-10__56__Guer/`}
            </pre>
            <ul className="space-y-1 text-sm text-slate-700">
              <li>
                <span className="font-mono text-xs text-sky-800">&#123;NOM&#125;</span> — nom de
                famille en majuscules ASCII
              </li>
              <li>
                <span className="font-mono text-xs text-sky-800">&#123;prenoms&#125;</span> — tous
                les prénoms, séparés par <span className="font-mono text-xs">_</span>
              </li>
              <li>
                <span className="font-mono text-xs text-sky-800">&#123;AAAA-MM-JJ&#125;</span> —
                date de <strong>naissance</strong> (
                <span className="font-mono text-xs">XXXX-XX-XX</span> si inconnue)
              </li>
              <li>
                <span className="font-mono text-xs text-sky-800">&#123;dept&#125;</span> /{" "}
                <span className="font-mono text-xs text-sky-800">&#123;commune&#125;</span> — lieu
                de naissance (<span className="font-mono text-xs">XX</span> /{" "}
                <span className="font-mono text-xs">X</span> si inconnu)
              </li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-800">Types de fichiers</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Signification</th>
                    <th className="px-3 py-2 font-medium">Date / lieu dans le nom</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 font-mono text-xs text-sky-800">N</td>
                    <td className="px-3 py-2 text-slate-700">Acte de naissance</td>
                    <td className="px-3 py-2 text-slate-700">Événement naissance</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 font-mono text-xs text-sky-800">M</td>
                    <td className="px-3 py-2 text-slate-700">Acte de mariage</td>
                    <td className="px-3 py-2 text-slate-700">Événement mariage</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 font-mono text-xs text-sky-800">D</td>
                    <td className="px-3 py-2 text-slate-700">Acte de décès</td>
                    <td className="px-3 py-2 text-slate-700">Événement décès</td>
                  </tr>
                  <tr className="border-b border-slate-300 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-sky-800">P</td>
                    <td className="px-3 py-2 text-slate-700">Photo de la personne</td>
                    <td className="px-3 py-2 text-slate-700">
                      Identiques à la clé du dossier (naissance) + suffixe obligatoire
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-slate-800">Nomenclature des fichiers</h3>
            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-700">
{`Actes N / M / D :
{NOM}__{prenoms}__{TYPE}__{AAAA-MM-JJ}__{dept}__{commune}[__suffix].{ext}

Photos P :
{NOM}__{prenoms}__P__{AAAA-MM-JJ}__{dept}__{commune}__{suffixe}.{ext}

Exemples :
…__N__1805-06-10__56__Guer.jpg
…__M__1846-07-25__56__La_Gacilly.jpg
…__D__1871-03-16__56__La_Gacilly.pdf
…__P__1981-11-03__56__Ploermel__Photo_01.jpg`}
            </pre>
            <ul className="space-y-1 text-sm text-slate-700">
              <li>
                Extensions : <span className="font-mono text-xs">.jpg</span>,{" "}
                <span className="font-mono text-xs">.jpeg</span>,{" "}
                <span className="font-mono text-xs">.png</span>,{" "}
                <span className="font-mono text-xs">.pdf</span>
              </li>
              <li>
                Suffixe optionnel sur un acte (ex.{" "}
                <span className="font-mono text-xs">COMMUNE</span>,{" "}
                <span className="font-mono text-xs">GREFFE</span>) ; obligatoire sur une photo
              </li>
              <li>
                Segments séparés par <span className="font-mono text-xs">__</span> ; prénoms
                multiples par <span className="font-mono text-xs">_</span>
              </li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-800">Normalisation ASCII</h3>
            <p className="text-sm text-slate-700">
              Les chemins fichiers sont sans accents (François → Francois, Ploërmel → Ploermel).
              Le GEDCOM et l&apos;affichage IHM gardent l&apos;UTF-8. Nom en majuscules ;
              prénoms en Title_Case ; espaces et tirets de commune →{" "}
              <span className="font-mono text-xs">_</span>.
            </p>
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
