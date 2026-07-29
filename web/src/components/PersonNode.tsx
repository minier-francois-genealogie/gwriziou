import type { ActeType, NoeudArbre } from "../types/api";
import { useRef, type CSSProperties } from "react";
import {
  formatNom,
  hasMultiplePrenoms,
  splitPrenoms,
} from "../utils/format";
import {
  getTreeLayoutMetrics,
  type TreeViewMode,
} from "../utils/treeLayoutMetrics";
import { AncreButton } from "./AncreButton";
import { AvatarIcon } from "./AvatarIcon";
import { CheckedIcon } from "./CheckedIcon";
import { EvenementsList } from "./EvenementsList";
import { FloatingTooltip } from "./FloatingTooltip";
import { PhotoIcon } from "./PhotoIcon";
import { NoteIcon } from "./NoteIcon";

const REF_BADGE_H = 26;

interface PersonNodeProps {
  noeud: NoeudArbre;
  x: number;
  y: number;
  focused: boolean;
  isAncre: boolean;
  highlighted?: boolean;
  viewMode?: TreeViewMode;
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
  const m = getTreeLayoutMetrics(viewMode);
  const isOverview = viewMode === "overview";
  const isMale = noeud.sexe === "M";
  const isFemale = noeud.sexe === "F";

  const innerBorder = highlighted
    ? "border-amber-400"
    : focused
      ? isFemale
        ? "border-rose-500"
        : isMale
          ? "border-sky-500"
          : "border-slate-500"
      : "border-transparent";
  const border = highlighted
    ? "border-amber-300"
    : isMale
      ? "border-sky-300"
      : isFemale
        ? "border-rose-300"
        : "border-slate-300";

  const fullName = formatNom(noeud.nom, noeud.prenoms);
  const prenomArbre = splitPrenoms(noeud.prenoms)[0] ?? null;
  const extraPrenoms = hasMultiplePrenoms(noeud.prenoms);
  const handleActeClick = onActeClick
    ? (type: ActeType, url: string) => onActeClick(type, url, fullName)
    : undefined;
  const hasRef = !!parentsAilleurs && !isOverview;
  const extraTop = hasRef ? REF_BADGE_H : 0;
  const tapRef = useRef<{ x: number; y: number } | null>(null);

  const handleCellFocus = () => {
    onFocus(noeud.id_gedcom);
  };

  const onCellPointerDown = (e: React.PointerEvent) => {
    // Laisser remonter pour permettre le pan depuis la cellule ;
    // seuls les boutons (data-tree-interactive) bloquent le déplacement.
    tapRef.current = { x: e.clientX, y: e.clientY };
  };

  const onCellPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      e.target !== e.currentTarget &&
      e.target instanceof Element &&
      e.target.closest("button, [data-tree-interactive]")
    ) {
      return;
    }
    const start = tapRef.current;
    tapRef.current = null;
    if (!start) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved > 8) return;
    handleCellFocus();
  };

  const shellStyle: CSSProperties = {
    position: "absolute",
    left: x - m.nodeW / 2,
    top: y - m.nodeH / 2 - extraTop,
    width: m.nodeW,
    height: m.nodeH + extraTop,
    boxSizing: "border-box",
  };

  if (isOverview) {
    const nameRow = (
      <span className="flex max-h-full w-full items-end justify-center gap-1 overflow-hidden px-0.5 pb-0.5">
        <span className="shrink-0 overflow-hidden text-[8px] font-bold leading-none text-slate-900 [writing-mode:vertical-rl] rotate-180">
          {noeud.nom}
        </span>
        {prenomArbre && (
          <span className="shrink-0 overflow-hidden text-[8px] font-semibold leading-none text-slate-700 [writing-mode:vertical-rl] rotate-180">
            {prenomArbre}
            {extraPrenoms && (
              <span className="text-[7px] font-normal text-slate-500" aria-hidden="true">
                *
              </span>
            )}
          </span>
        )}
      </span>
    );

    return (
      <div style={shellStyle}>
        <div
          className={`flex h-full w-full flex-col items-center rounded-md border bg-white p-0.5 shadow-sm ${border}`}
        >
          <div
            className={`relative flex min-h-0 flex-1 w-full flex-col items-center rounded border ${innerBorder}`}
          >
            <div
              role="button"
              onPointerDown={onCellPointerDown}
              onPointerUp={onCellPointerUp}
              className="flex min-h-0 w-full flex-1 cursor-pointer flex-col justify-end overflow-hidden outline-none"
            >
              <div className="flex min-h-0 flex-1 w-full flex-col justify-end overflow-hidden">
                <FloatingTooltip
                  content={fullName}
                  maxWidth={220}
                  multiline
                  align="center"
                  className="w-full"
                >
                  {nameRow}
                </FloatingTooltip>
              </div>
            </div>
            <div className="shrink-0 pb-px" data-tree-interactive>
              <AncreButton
                active={isAncre}
                onAncre={() => onAncre(noeud.id_gedcom)}
                size="xs"
              />
            </div>
            {noeud.chemin_dossier && (
              <div
                className="absolute bottom-0.5 right-0.5 z-10"
                data-tree-interactive
              >
                <CheckedIcon
                  checked={isChecked}
                  disabled={checkedPending}
                  onToggle={(next) =>
                    onToggleChecked?.(noeud.chemin_dossier!, next)
                  }
                  size="xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div className="flex h-full flex-col">
        {parentsAilleurs && (
          <div className="flex shrink-0 justify-center pb-0.5" data-tree-interactive>
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
                  className="h-3 w-3"
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
          className={`relative flex min-h-0 flex-1 flex-col overflow-visible rounded-xl border-2 bg-white p-0.5 shadow-sm hover:shadow-md ${border}`}
        >
          <div
            className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border-2 ${innerBorder}`}
          >
            <div
              role="button"
              onPointerDown={onCellPointerDown}
              onPointerUp={onCellPointerUp}
              className="flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col overflow-hidden p-1.5 text-left outline-none"
            >
              <div className="flex min-w-0 shrink-0 items-center justify-between gap-1">
                <span className="flex min-w-0 items-center gap-1">
                  <PhotoIcon
                    hasPhotos={noeud.photos}
                    size="xs"
                    onClick={() =>
                      onPhotoClick?.(noeud.id_gedcom, noeud.nom, noeud.prenoms)
                    }
                  />
                  <NoteIcon
                    hasNotes={hasNotes}
                    size="xs"
                    onClick={() =>
                      onNoteClick?.(
                        noeud.chemin_dossier ?? null,
                        noeud.nom,
                        noeud.prenoms,
                      )
                    }
                  />
                </span>
                <div className="shrink-0" data-tree-interactive>
                  <AncreButton
                    active={isAncre}
                    onAncre={() => onAncre(noeud.id_gedcom)}
                    size="sm"
                  />
                </div>
              </div>
              <div className="mt-0.5 flex min-w-0 shrink-0 items-start gap-1.5">
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
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-xs font-bold text-slate-900">
                      {noeud.nom}
                    </span>
                    {prenomArbre && (
                      <span className="flex min-w-0 items-baseline gap-0.5">
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
                  </span>
                </FloatingTooltip>
              </div>
              <div className="mt-1 min-w-0 shrink-0 pr-5">
                <EvenementsList
                  evenements={noeud.evenements ?? []}
                  onActeClick={handleActeClick}
                  size="compact"
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
              {noeud.profession && (
                <span className="mt-0.5 truncate pr-5 text-[10px] leading-tight italic text-slate-400">
                  {noeud.profession}
                </span>
              )}
            </div>
            {noeud.chemin_dossier && (
              <div
                className="absolute bottom-0.5 right-0.5 z-10"
                data-tree-interactive
              >
                <CheckedIcon
                  checked={isChecked}
                  disabled={checkedPending}
                  onToggle={(next) =>
                    onToggleChecked?.(noeud.chemin_dossier!, next)
                  }
                  size="xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
