import type { ActeType, NoeudArbre } from "../types/api";
import { type CSSProperties } from "react";
import {
  actesFromEvenements,
  formatAnneesVie,
  formatNom,
  hasMultiplePrenoms,
  splitPrenoms,
} from "../utils/format";
import {
  getTreeModeConfig,
  type TreeViewMode,
} from "../utils/treeLayoutMetrics";
import { ActeIcons } from "./ActeIcons";
import { AncreButton } from "./AncreButton";
import { AvatarIcon } from "./AvatarIcon";
import { CheckedIcon } from "./CheckedIcon";
import { EvenementsList } from "./EvenementsList";
import { FloatingTooltip } from "./FloatingTooltip";
import { PhotoIcon } from "./PhotoIcon";
import { NoteIcon } from "./NoteIcon";

/** Espace réservé au badge « parents déjà affichés » (= refBadgeRowGap métriques). */
const REF_BADGE = 26;

interface PersonNodeProps {
  noeud: NoeudArbre;
  x: number;
  y: number;
  focused: boolean;
  isAncre: boolean;
  highlighted?: boolean;
  viewMode?: TreeViewMode;
  /** Disposition horizontale (générations gauche→droite). */
  horizontal?: boolean;
  parentsAilleurs?: import("../utils/treeLayout").ParentsAilleursRef;
  onFocus: (id: string) => void;
  onAncre: (id: string) => void;
  onActeClick?: (type: "naissance" | "mariage" | "deces", url: string, label?: string) => void;
  onPhotoClick?: (id: string, nom: string, prenoms: string | null) => void;
  onNoteClick?: (chemin: string | null, nom: string, prenoms: string | null) => void;
  hasNotes?: boolean;
  isChecked?: boolean;
  checkedPending?: boolean;
  onToggleChecked?: (chemin: string, next: boolean) => void;
  onAvatarEdit?: (id: string, nom: string, prenoms: string | null) => void;
  onParentsRefClick?: (parentIds: string[]) => void;
}

export function PersonNode({
  noeud,
  x,
  y,
  focused,
  isAncre,
  highlighted = false,
  viewMode = "detail",
  horizontal = false,
  parentsAilleurs,
  onFocus,
  onAncre,
  onActeClick,
  onPhotoClick,
  onNoteClick,
  hasNotes = false,
  isChecked = false,
  checkedPending = false,
  onToggleChecked,
  onAvatarEdit,
  onParentsRefClick,
}: PersonNodeProps) {
  const { metrics: m, cartouche, orientation } = getTreeModeConfig(
    viewMode,
    horizontal,
  );
  const refOnLeft = orientation.parentsRefSide === "left";
  const isMale = noeud.sexe === "M";
  const isFemale = noeud.sexe === "F";

  void onFocus;

  const border = highlighted || focused
    ? "border-2 border-amber-500"
    : isMale
      ? "border border-sky-300"
      : isFemale
        ? "border border-rose-300"
        : "border border-slate-300";

  const fullName = formatNom(noeud.nom, noeud.prenoms);
  const prenomArbre = splitPrenoms(noeud.prenoms)[0] ?? null;
  const extraPrenoms = hasMultiplePrenoms(noeud.prenoms);
  const anneesVie = cartouche.showAnneesVie
    ? formatAnneesVie({
        evenements: noeud.evenements,
        date_naissance_min: noeud.date_naissance_min,
        date_deces_max: noeud.date_deces_max,
      })
    : null;
  const handleActeClick = onActeClick
    ? (type: ActeType, url: string) => onActeClick(type, url, fullName)
    : undefined;
  const hasRef = !!parentsAilleurs;
  const extraTop = hasRef && !refOnLeft ? REF_BADGE : 0;
  const extraLeft = hasRef && refOnLeft ? REF_BADGE : 0;
  const shellStyle: CSSProperties = {
    position: "absolute",
    left: x - m.nodeW / 2 - extraLeft,
    top: y - m.nodeH / 2 - extraTop,
    width: m.nodeW + extraLeft,
    height: m.nodeH + extraTop,
    boxSizing: "border-box",
  };

  return (
    <div style={shellStyle} data-person-id={noeud.id_gedcom}>
      <div
        className={`flex h-full ${refOnLeft ? "flex-row items-stretch" : "flex-col"}`}
      >
        {parentsAilleurs && (
          <div
            className={
              refOnLeft
                ? "flex w-[26px] shrink-0 items-center justify-center self-center pr-0.5"
                : "flex shrink-0 justify-center pb-0.5"
            }
            data-tree-interactive
          >
            <FloatingTooltip
              content={
                <>
                  <span className="block font-medium">Parents déjà affichés</span>
                  <span className="block font-normal text-slate-200">
                    {parentsAilleurs.label}
                  </span>
                  <span className="mt-0.5 block text-[9px] text-slate-400">
                    Cliquer pour surligner
                  </span>
                </>
              }
              contentClassName="min-w-[160px] px-2 py-1.5 text-center"
              maxWidth={240}
              multiline
            >
              <button
                type="button"
                aria-label={`Parents déjà affichés : ${parentsAilleurs.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onParentsRefClick?.(parentsAilleurs.parentIds);
                }}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-600 shadow-sm hover:border-violet-400 hover:bg-violet-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-3 w-3 ${refOnLeft ? "-rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h10a4 4 0 0 1 4 4v7" />
                </svg>
              </button>
            </FloatingTooltip>
          </div>
        )}
        <div
          className={`relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md ${border}`}
        >
            <div
              role="button"
              className="flex h-full min-h-0 min-w-0 cursor-pointer flex-col justify-start overflow-hidden p-[2px] text-left outline-none"
            >
              <div className="flex h-4 min-w-0 shrink-0 items-center justify-between gap-0.5 leading-none">
                <span className="flex h-4 min-w-0 items-center gap-0.5" data-tree-interactive>
                  <PhotoIcon
                    hasPhotos={noeud.photos}
                    onClick={() =>
                      onPhotoClick?.(noeud.id_gedcom, noeud.nom, noeud.prenoms)
                    }
                  />
                  <NoteIcon
                    hasNotes={hasNotes}
                    onClick={() =>
                      onNoteClick?.(
                        noeud.chemin_dossier ?? null,
                        noeud.nom,
                        noeud.prenoms,
                      )
                    }
                  />
                </span>
                <span
                  className="inline-flex h-4 shrink-0 items-center gap-0.5 leading-none"
                  data-tree-interactive
                >
                  {cartouche.showNmdInHeader && (
                    <ActeIcons
                      actes={actesFromEvenements(noeud.evenements ?? [])}
                      onActeClick={handleActeClick}
                    />
                  )}
                  {noeud.chemin_dossier && (
                    <CheckedIcon
                      checked={isChecked}
                      disabled={checkedPending}
                      onToggle={(next) =>
                        onToggleChecked?.(noeud.chemin_dossier!, next)
                      }
                    />
                  )}
                </span>
              </div>
              <div className="flex min-w-0 shrink-0 items-start gap-1">
                <span data-tree-interactive className="shrink-0">
                  <AvatarIcon
                    sexe={noeud.sexe}
                    avatarUrl={noeud.avatar_url}
                    size="sm"
                    editable={Boolean(onAvatarEdit)}
                    onEdit={() =>
                      onAvatarEdit?.(noeud.id_gedcom, noeud.nom, noeud.prenoms)
                    }
                  />
                </span>
                <FloatingTooltip
                  content={fullName}
                  maxWidth={220}
                  multiline
                  align="start"
                  className="min-w-0"
                >
                  <span className="flex min-w-0 flex-col leading-none">
                    <span className="truncate text-xs font-bold text-slate-900">
                      {noeud.nom}
                    </span>
                    {prenomArbre && (
                      <span className="mt-px flex min-w-0 items-baseline gap-0.5">
                        <span className="truncate text-xs font-bold text-slate-900">
                          {prenomArbre}
                        </span>
                        {extraPrenoms && (
                          <span
                            className="shrink-0 text-[11px] leading-none text-slate-500"
                            aria-hidden="true"
                          >
                            *
                          </span>
                        )}
                      </span>
                    )}
                    {anneesVie && (
                      <span className="mt-px truncate text-[10px] leading-none text-slate-500">
                        {anneesVie}
                      </span>
                    )}
                  </span>
                </FloatingTooltip>
              </div>
              {cartouche.showEventRows && (
                <div className="min-w-0 shrink-0">
                  <EvenementsList
                    evenements={noeud.evenements ?? []}
                    onActeClick={handleActeClick}
                    size="compact"
                    className="!gap-y-px leading-none"
                    hideMissingActeWarnings
                    vieDates={{
                      date_naissance_min: noeud.date_naissance_min,
                      date_naissance_min_approximation:
                        noeud.date_naissance_min_approximation,
                      date_naissance_min_regle: noeud.date_naissance_min_regle,
                      date_deces_max: noeud.date_deces_max,
                      date_deces_max_approximation: noeud.date_deces_max_approximation,
                      date_deces_max_regle: noeud.date_deces_max_regle,
                      naissance_gedcom: noeud.naissance_gedcom,
                      deces_gedcom: noeud.deces_gedcom,
                    }}
                  />
                </div>
              )}
              {cartouche.showProfession && noeud.profession && (
                <span className="mt-px truncate text-[10px] leading-none italic text-slate-400">
                  {noeud.profession}
                </span>
              )}
            </div>
            <div
              className="absolute bottom-[2px] right-[2px] z-10 flex leading-none"
              data-tree-interactive
            >
              <AncreButton
                active={isAncre}
                onAncre={() => onAncre(noeud.id_gedcom)}
              />
            </div>
        </div>
      </div>
    </div>
  );
}
