import { AncreIcon } from "../components/GenealogyIcons";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-sky-900">{title}</h2>
      <div className="text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

function Ancre({ italic = false }: { italic?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={italic ? "italic" : undefined}>ancre</span>
      <AncreIcon />
    </span>
  );
}

export function AProposPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        <div className="mx-auto max-w-2xl space-y-6 pb-8">
          <p className="text-sm leading-relaxed text-slate-700">
            <strong className="font-semibold text-slate-900">Gwriziou</strong> est une
            application de généalogie qui permet d&apos;explorer un arbre familial, les actes
            associés et un contexte historique lié aux personnes.
          </p>

          <Section title="Recherche">
            <p>
              Saisissez un nom ou un prénom pour trouver une personne. La fiche affiche les
              dates de vie, les événements, les actes (naissance, mariage, décès), les photos
              et les relations familiales. Vous pouvez définir une personne comme{" "}
              <Ancre italic /> de l&apos;arbre.
            </p>
          </Section>

          <Section title="Arbre">
            <p>
              L&apos;arbre se construit autour de l&apos;<Ancre />, avec un nombre réglable
              d&apos;ancêtres et de descendants (voir Paramètres). Cliquez sur une personne
              pour la mettre au focus ; utilisez le pavé de navigation ou le clavier pour
              vous déplacer. L&apos;<Ancre /> peut être changée à tout moment.
            </p>
          </Section>

          <Section title="Histoire">
            <p>
              Les écrans <strong>Faits</strong> et <strong>Dirigeants</strong> présentent des
              événements historiques et les chefs d&apos;État français. Par défaut, la case{" "}
              <em>Limiter à la zone de l&apos;arbre</em> ne garde que les entrées dont la
              période ou le lieu correspond au périmètre de vie des personnes visibles autour
              de l&apos;<Ancre />.
            </p>
          </Section>

          <Section title="Géoloc">
            <p>
              Une carte montre où vivaient les personnes de la base pour une année choisie,
              selon les lieux connus de leur vie.
            </p>
          </Section>

          <Section title="Warnings">
            <p>
              Cet écran recense les anomalies détectées dans les données (dates incohérentes,
              informations manquantes, etc.) pour les personnes du périmètre de l&apos;arbre.
            </p>
          </Section>

          <Section title="Données">
            <p>
              Les informations proviennent d&apos;un fichier GEDCOM et de sources complémentaires
              (actes, faits historiques, dirigeants). Le bouton{" "}
              <strong>Rafraîchir</strong> dans Paramètres recharge la base depuis le dépôt
              distant.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
