import type { ActeType, NoeudArbre } from "../types/api";
import { useRef } from "react";
import type { ParentsAilleursRef } from "../utils/treeLayout";
import {
  formatNom,
  formatNomArbre,
  hasMultiplePrenoms,
} from "../utils/format";
import { NODE_H, NODE_W } from "../utils/treeLayout";
import { AncreButton } from "./AncreButton";
import { EvenementsList } from "./EvenementsList";
import { FloatingTooltip } from "./FloatingTooltip";
import { PhotoIcon } from "./PhotoIcon";
import { SexeIcon } from "./SexeIcon";

const REF_BADGE_H = 26;

interface PersonNodeProps {
  noeud: NoeudArbre;
  x: number;
  y: number;
  focused: boolean;
  isAncre: boolean;
  highlighted?: boolean;
  parentsAilleurs?: ParentsAilleursRef;
  onFocus: (id: string) => void;
  onAncre: (id: string) => void;
  onActeClick?: (type: "naissance" | "mariage" | "deces", url: string, label?: string) => void;
  onPhotoClick?: (id: string, nom: string, prenoms: string | null) => void;
  onParentsRefClick?: (parentIds: string[]) => void;
}

export function PersonNode({
  noeud,
  x,
  y,
  focused,
  isAncre,
  highlighted = false,
  parentsAilleurs,
  onFocus,
  onAncre,
  onActeClick,
  onPhotoClick,
  onParentsRefClick,
}: PersonNodeProps) {
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
  const displayName = formatNomArbre(noeud.nom, noeud.prenoms);
  const extraPrenoms = hasMultiplePrenoms(noeud.prenoms);
  const handleActeClick = onActeClick
    ? (type: ActeType, url: string) => onActeClick(type, url, fullName)
    : undefined;
  const hasRef = !!parentsAilleurs;
  const extraTop = hasRef ? REF_BADGE_H : 0;
  const tapRef = useRef<{ x: number; y: number } | null>(null);

  const handleCellFocus = () => {
    onFocus(noeud.id_gedcom);
  };

  const stopTreePan = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const onCellPointerDown = (e: React.PointerEvent) => {
    stopTreePan(e);
    tapRef.current = { x: e.clientX, y: e.clientY };
  };

  const onCellPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    stopTreePan(e);
    if (
      e.target !== e.currentTarget &&
      e.target instanceof Element &&
      e.target.closest("button")
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

  return (
    <foreignObject
      x={x - NODE_W / 2}
      y={y - NODE_H / 2 - extraTop}
      width={NODE_W}
      height={NODE_H + extraTop}
      className="overflow-visible"
      data-tree-interactive
    >
      <div className="flex h-full flex-col">
        {parentsAilleurs && (
          <div className="flex shrink-0 justify-center pb-0.5">
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
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-600 shadow-sm transition hover:border-violet-400 hover:bg-violet-100"
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
          className={`relative flex min-h-0 flex-1 flex-col overflow-visible rounded-xl border-2 bg-white p-0.5 shadow-sm transition hover:shadow-md ${border}`}
        >
          <div
            className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border-2 transition-colors ${innerBorder}`}
          >
          <div
            role="button"
            onPointerDown={onCellPointerDown}
            onPointerUp={onCellPointerUp}
            className="relative flex min-h-0 flex-1 cursor-pointer flex-col p-1.5 pr-7 text-left outline-none"
          >
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-1">
                <SexeIcon sexe={noeud.sexe} className="shrink-0" />
                <PhotoIcon
                  hasPhotos={noeud.photos}
                  size="xs"
                  onClick={() =>
                    onPhotoClick?.(noeud.id_gedcom, noeud.nom, noeud.prenoms)
                  }
                />
                <span className="flex min-w-0 items-baseline gap-0.5">
                  <span className="truncate text-xs font-bold leading-tight text-slate-900">
                    {displayName}
                  </span>
                  {extraPrenoms && (
                    <FloatingTooltip content={fullName} maxWidth={220} multiline align="start">
                      <span
                        className="shrink-0 text-[11px] leading-none text-slate-500"
                        aria-hidden="true"
                      >
                        *
                      </span>
                    </FloatingTooltip>
                  )}
                </span>
              </span>
            </span>
            <div className="mt-1.5">
              <EvenementsList
                evenements={noeud.evenements ?? []}
                onActeClick={handleActeClick}
                size="compact"
                hideMissingActeWarnings
                vieDates={{
                  date_naissance_min: noeud.date_naissance_min,
                  date_naissance_min_approximation: noeud.date_naissance_min_approximation,
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
              <span className="mt-0.5 truncate text-[10px] leading-tight italic text-slate-400">
                {noeud.profession}
              </span>
            )}
          </div>
          <div
            className="absolute right-1.5 top-1.5 z-10"
            data-tree-interactive
          >
            <AncreButton
              active={isAncre}
              onAncre={() => onAncre(noeud.id_gedcom)}
              size="sm"
            />
          </div>
          </div>
        </div>
      </div>
    </foreignObject>
  );
}
