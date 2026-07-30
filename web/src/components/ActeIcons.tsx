import type { ActeResume, ActeType, ActesPersonne } from "../types/api";
import { formatActeTooltipLines } from "../utils/format";
import { ICON_ABSENT_BTN, ICON_DISK, ICON_GLYPH_INSET } from "../utils/iconStyles";
import { FloatingTooltip } from "./FloatingTooltip";
import { GlyphIcon } from "./GlyphIcon";

const ACTE_META: Record<
  ActeType,
  { label: string; activeClass: string; key: keyof ActesPersonne }
> = {
  naissance: {
    label: "Acte de naissance",
    activeClass: "bg-emerald-600 text-white hover:bg-emerald-700",
    key: "naissance",
  },
  mariage: {
    label: "Acte de mariage",
    activeClass: "bg-amber-600 text-white hover:bg-amber-700",
    key: "mariage",
  },
  deces: {
    label: "Acte de décès",
    activeClass: "bg-slate-600 text-white hover:bg-slate-700",
    key: "deces",
  },
};

interface ActeIconsProps {
  actes: ActesPersonne;
  onActeClick?: (type: ActeType, url: string) => void;
}

interface ActeIconSingleProps {
  type: ActeType;
  acte: ActeResume | null;
  onActeClick?: (type: ActeType, url: string) => void;
}

export function ActeIconSingle({
  type,
  acte,
  onActeClick,
}: ActeIconSingleProps) {
  const meta = ACTE_META[type];
  const active = acte !== null;
  const canOpen = active && !!acte?.url;
  const lines = formatActeTooltipLines(meta.label, acte);
  const ariaLabel = lines.join(" — ");

  return (
    <FloatingTooltip
      content={
        <>
          {lines.map((line, i) => (
            <span
              key={i}
              className={`block ${i === 0 ? "font-medium" : "font-normal text-slate-200"}`}
            >
              {line}
            </span>
          ))}
        </>
      }
      className={`${ICON_DISK} shrink-0 leading-none`}
      contentClassName="min-w-[148px] px-2.5 py-1.5"
      maxWidth={240}
      multiline
    >
      <button
        type="button"
        aria-disabled={!canOpen}
        onClick={(e) => {
          e.stopPropagation();
          if (!canOpen || !acte?.url || !onActeClick) return;
          onActeClick(type, acte.url);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className={`relative box-border ${ICON_DISK} shrink-0 overflow-hidden rounded-full border-0 m-0 p-0 leading-none transition-colors ${
          active
            ? canOpen
              ? meta.activeClass
              : `${meta.activeClass} cursor-default opacity-90`
            : ICON_ABSENT_BTN
        }`}
        aria-label={ariaLabel}
      >
        <GlyphIcon
          name={type}
          size="fill"
          className={ICON_GLYPH_INSET}
        />
      </button>
    </FloatingTooltip>
  );
}

export function ActeIcons({ actes, onActeClick }: ActeIconsProps) {
  const items: Array<{ type: ActeType; acte: ActeResume | null }> = [
    { type: "naissance", acte: actes.naissance },
    { type: "mariage", acte: actes.mariage },
    { type: "deces", acte: actes.deces },
  ];

  return (
    <div className="flex gap-0.5" role="group" aria-label="Actes d'état civil">
      {items.map(({ type, acte }) => (
        <ActeIconSingle
          key={type}
          type={type}
          acte={acte}
          onActeClick={onActeClick}
        />
      ))}
    </div>
  );
}
