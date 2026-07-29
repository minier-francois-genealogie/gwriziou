import { useEffect, useMemo, useState } from "react";
import type { ActeType, EvenementArbre, PersonneDetail, PhotoPersonne, RelationResume } from "../types/api";

import { formatNom } from "../utils/format";

import { AncreButton } from "./AncreButton";
import { ActesDossierRow } from "./ActesDossierRow";
import { EvenementsList, normalizeEvenements } from "./EvenementsList";

import { LoadingSpinner } from "./LoadingSpinner";
import { DirigeantsFranceSection } from "./DirigeantsFranceSection";

import {
  countFaitsByTab,
  FaitsHistoriquesSection,
  filterFaitsByTab,
  type FaitsHistoriquesTab,
} from "./FaitsHistoriquesSection";

import { RelationPersonLabel } from "./RelationPersonLabel";

type PersonPanelTab = "individu" | FaitsHistoriquesTab;

const PANEL_TABS: { id: PersonPanelTab; label: string }[] = [
  { id: "individu", label: "Individu" },
  { id: "commune", label: "Commune" },
  { id: "departement", label: "Département" },
  { id: "region", label: "Région" },
  { id: "france", label: "Pays" },
  { id: "monde", label: "Monde" },
];

function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mx-auto h-px w-[70%] bg-slate-300 ${className}`}
      aria-hidden="true"
    />
  );
}

interface PersonPanelProps {
  personne: PersonneDetail | null;
  loading: boolean;
  ancrePersonneId: string;
  onAncre: (id: string) => void;
  onActeClick: (type: "naissance" | "mariage" | "deces", url: string, label?: string) => void;
  onNavigate: (id: string) => void;
  onPhotoClick: (photos: PhotoPersonne[], personName: string) => void;
  onRelationPhotoClick: (id: string, nom: string, prenoms: string | null) => void;
}

export function PersonPanel({
  personne,
  loading,
  ancrePersonneId,
  onAncre,
  onActeClick,
  onNavigate,
  onPhotoClick,
  onRelationPhotoClick,
}: PersonPanelProps) {
  const [activeTab, setActiveTab] = useState<PersonPanelTab>("individu");

  const faits = personne?.faits_historiques ?? [];
  const dirigeants = personne?.dirigeants_france ?? [];

  const visibleTabs = useMemo(() => {
    return PANEL_TABS.filter((tab) => {
      if (tab.id === "individu") return true;
      if (tab.id === "france") {
        return countFaitsByTab(faits, tab.id) > 0 || dirigeants.length > 0;
      }
      return countFaitsByTab(faits, tab.id) > 0;
    });
  }, [faits, dirigeants.length]);

  useEffect(() => {
    setActiveTab("individu");
  }, [personne?.id_gedcom]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("individu");
    }
  }, [activeTab, visibleTabs]);

  if (loading) {
    return (
      <aside className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <LoadingSpinner variant="inline" />
      </aside>
    );
  }

  if (!personne) {
    return (
      <aside className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Sélectionnez une personne via la recherche.
      </aside>
    );
  }

  const name = formatNom(personne.nom, personne.prenoms);
  const evenements =
    personne.evenements ?? evenementsFromPersonneDetail(personne);
  const handleActeClick = (type: ActeType, url: string) =>
    onActeClick(type, url, name);

  const tabFaits =
    activeTab === "individu" ? [] : filterFaitsByTab(faits, activeTab);

  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="shrink-0 px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0">
            <RelationPersonLabel
              nom={personne.nom}
              prenoms={personne.prenoms}
              sexe={personne.sexe}
              naissance={personne.naissance}
              deces={personne.deces}
              actes={personne.actes}
              onActeClick={handleActeClick}
              photos={personne.photos.length > 0}
              photoCount={personne.photos.length}
              photoSize="sm"
              acteSize="xs"
              className="text-lg font-bold text-slate-900"
              datesClassName="text-sm text-slate-500"
              onPhotoClick={() => onPhotoClick(personne.photos, name)}
            />
          </h2>
          <AncreButton
            active={personne.id_gedcom === ancrePersonneId}
            onAncre={() => onAncre(personne.id_gedcom)}
            size="md"
          />
        </div>
        {personne.profession && (
          <p className="text-sm text-slate-600">{personne.profession}</p>
        )}
        {personne.surnom && (
          <p className="text-sm italic text-slate-600">dit {personne.surnom}</p>
        )}
        {personne.anecdote && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {personne.anecdote}
          </p>
        )}
      </header>

      <nav
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 px-2"
        aria-label="Sections de la fiche"
      >
        {visibleTabs.map((tab) => {
          const count =
            tab.id === "individu"
              ? null
              : tab.id === "france"
                ? countFaitsByTab(faits, tab.id) + dirigeants.length
                : countFaitsByTab(faits, tab.id);
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-t-md px-3 py-2 text-xs font-medium transition ${
                selected
                  ? "border border-b-0 border-slate-200 bg-white text-sky-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
              {count !== null && (
                <span
                  className={`ml-1.5 tabular-nums ${selected ? "text-sky-600" : "text-slate-400"}`}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {activeTab === "individu" ? (
          <>
            <div>
              {personne.dossier_actes && (
                <ActesDossierRow dossier={personne.dossier_actes} />
              )}
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Événement(s)
              </h3>
              <EvenementsList
                evenements={evenements}
                onActeClick={handleActeClick}
                size="comfortable"
                showNaissancesEnfants
                hideMissingActeWarnings
                vieDates={{
                  date_naissance_min: personne.date_naissance_min,
                  date_naissance_min_approximation:
                    personne.date_naissance_min_approximation,
                  date_naissance_min_regle: personne.date_naissance_min_regle,
                  date_deces_max: personne.date_deces_max,
                  date_deces_max_approximation: personne.date_deces_max_approximation,
                  date_deces_max_regle: personne.date_deces_max_regle,
                  naissance_gedcom: personne.naissance_gedcom,
                  deces_gedcom: personne.deces_gedcom,
                }}
              />
            </div>

            <RelationList
              title="Parent(s)"
              items={personne.relations.parents}
              onNavigate={onNavigate}
              onRelationPhotoClick={onRelationPhotoClick}
              onActeClick={onActeClick}
            />
            <RelationList
              title="Conjoint(s)"
              items={personne.relations.conjoints}
              onNavigate={onNavigate}
              onRelationPhotoClick={onRelationPhotoClick}
              onActeClick={onActeClick}
            />
            <RelationList
              title="Enfant(s)"
              items={personne.relations.enfants}
              onNavigate={onNavigate}
              onRelationPhotoClick={onRelationPhotoClick}
              onActeClick={onActeClick}
            />
            <RelationList
              title="Fratrie(s)"
              items={personne.relations.fratrie.filter(
                (f) => f.id_gedcom !== personne.id_gedcom,
              )}
              onNavigate={onNavigate}
              onRelationPhotoClick={onRelationPhotoClick}
              onActeClick={onActeClick}
            />
          </>
        ) : activeTab === "france" ? (
          <>
            <DirigeantsFranceSection dirigeants={personne.dirigeants_france ?? []} />
            {tabFaits.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Contexte historique
                </h3>
                <FaitsHistoriquesSection faits={tabFaits} />
              </section>
            )}
            {(personne.dirigeants_france ?? []).length === 0 && tabFaits.length === 0 && (
              <p className="text-sm text-slate-500">Aucun contexte national pour cette personne.</p>
            )}
          </>
        ) : (
          <FaitsHistoriquesSection faits={tabFaits} />
        )}
      </div>
    </aside>
  );
}

/** Repli si l'API ne renvoie pas encore evenements[]. */
function evenementsFromPersonneDetail(personne: PersonneDetail): EvenementArbre[] {
  const rows: EvenementArbre[] = [];
  if (personne.naissance || personne.actes.naissance) {
    rows.push({
      type: "naissance",
      date: personne.naissance?.date ?? null,
      date_brute: personne.naissance?.date_brute ?? null,
      lieu: personne.naissance?.lieu ?? null,
      departement: personne.naissance?.departement ?? null,
      acte: personne.actes.naissance,
      warnings: [],
    });
  }
  if (personne.mariages.length > 0) {
    for (const m of personne.mariages) {
      rows.push({
        type: "mariage",
        date: m.date,
        date_brute: m.date_brute,
        lieu: m.lieu,
        departement: null,
        acte: personne.actes.mariage,
        warnings: [],
        conjoint: m.conjoint,
      });
    }
  }
  if (personne.deces || personne.actes.deces) {
    rows.push({
      type: "deces",
      date: personne.deces?.date ?? null,
      date_brute: personne.deces?.date_brute ?? null,
      lieu: personne.deces?.lieu ?? null,
      departement: personne.deces?.departement ?? null,
      acte: personne.actes.deces,
      warnings: [],
    });
  }
  return normalizeEvenements(rows, true);
}

function RelationList({
  title,
  items,
  onNavigate,
  onRelationPhotoClick,
  onActeClick,
}: {
  title: string;
  items: RelationResume[];
  onNavigate: (id: string) => void;
  onRelationPhotoClick: (id: string, nom: string, prenoms: string | null) => void;
  onActeClick: (type: ActeType, url: string, label?: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <SectionDivider className="mb-3" />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <ul className="mt-1 space-y-1">
        {items.map((item) => {
          const relationName = formatNom(item.nom, item.prenoms);
          return (
          <li key={item.id_gedcom}>
            <button
              type="button"
              className="text-sm text-sky-700 hover:underline"
              onClick={() => onNavigate(item.id_gedcom)}
            >
              <RelationPersonLabel
                nom={item.nom}
                prenoms={item.prenoms}
                sexe={item.sexe}
                naissance={item.naissance}
                deces={item.deces}
                actes={item.actes}
                onActeClick={(type, url) => onActeClick(type, url, relationName)}
                photos={item.photos ?? false}
                onPhotoClick={() =>
                  onRelationPhotoClick(item.id_gedcom, item.nom, item.prenoms)
                }
              />
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
