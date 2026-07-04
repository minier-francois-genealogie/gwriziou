import type { ActeType, EvenementArbre, PersonneDetail, PhotoPersonne, RelationResume } from "../types/api";
import { formatNom } from "../utils/format";
import { AncreButton } from "./AncreButton";
import { EvenementsList, normalizeEvenements } from "./EvenementsList";
import { RelationPersonLabel } from "./RelationPersonLabel";
import { PersonName } from "./SexeIcon";

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
  if (loading) {
    return (
      <aside className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Chargement de la fiche…
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

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="border-b border-slate-100 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 text-lg font-bold text-slate-900">
            <PersonName
              nom={personne.nom}
              prenoms={personne.prenoms}
              sexe={personne.sexe}
              photos={personne.photos.length > 0}
              photoCount={personne.photos.length}
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
      </header>

      <div className="mt-3 border-b border-slate-100 pb-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Événement(s)
        </h3>
        <EvenementsList
          evenements={evenements}
          onActeClick={handleActeClick}
          size="comfortable"
          showNaissancesEnfants
        />
      </div>

      <RelationList
        title="Parent(s)"
        items={personne.relations.parents}
        onNavigate={onNavigate}
        onRelationPhotoClick={onRelationPhotoClick}
      />
      <RelationList
        title="Conjoint(s)"
        items={personne.relations.conjoints}
        onNavigate={onNavigate}
        onRelationPhotoClick={onRelationPhotoClick}
      />
      <RelationList
        title="Enfant(s)"
        items={personne.relations.enfants}
        onNavigate={onNavigate}
        onRelationPhotoClick={onRelationPhotoClick}
      />
      <RelationList
        title="Fratrie(s)"
        items={personne.relations.fratrie.filter(
          (f) => f.id_gedcom !== personne.id_gedcom,
        )}
        onNavigate={onNavigate}
        onRelationPhotoClick={onRelationPhotoClick}
      />
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
}: {
  title: string;
  items: RelationResume[];
  onNavigate: (id: string) => void;
  onRelationPhotoClick: (id: string, nom: string, prenoms: string | null) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
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
                photos={item.photos ?? false}
                onPhotoClick={() =>
                  onRelationPhotoClick(item.id_gedcom, item.nom, item.prenoms)
                }
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
