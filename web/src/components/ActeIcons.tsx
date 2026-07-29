import type { ActeResume, ActeType, ActesPersonne } from "../types/api";
import { formatActeTooltipLines } from "../utils/format";
import { ICON_ABSENT_BTN } from "../utils/iconStyles";
import { FloatingTooltip } from "./FloatingTooltip";
import { EvenementIcon } from "./GenealogyIcons";

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

/** Symbole plus grand que le disque ne le suggère (disque inchangé). */
const ACTE_ICON_SIZE: Record<"xs" | "sm" | "md", "xs" | "sm" | "md" | "lg"> = {
  xs: "sm",
  sm: "md",
  md: "lg",
};

interface ActeIconsProps {
  actes: ActesPersonne;
  onActeClick?: (type: ActeType, url: string) => void;
  size?: "xs" | "sm" | "md";
}

interface ActeIconSingleProps {
  type: ActeType;
  acte: ActeResume | null;
  onActeClick?: (type: ActeType, url: string) => void;
  size?: "xs" | "sm" | "md";
}

export function ActeIconSingle({
  type,
  acte,
  onActeClick,
  size = "sm",
}: ActeIconSingleProps) {
  const dim =
    size === "xs" ? "h-4 w-4" : size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const meta = ACTE_META[type];
  const iconSize = ACTE_ICON_SIZE[size];
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
      className="justify-center"
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
        className={`inline-flex items-center justify-center rounded-full p-0 leading-none transition-colors ${dim} ${
          active
            ? canOpen
              ? meta.activeClass
              : `${meta.activeClass} cursor-default opacity-90`
            : ICON_ABSENT_BTN
        }`}
        aria-label={ariaLabel}
      >
        <EvenementIcon type={type} size={iconSize} />
      </button>
    </FloatingTooltip>
  );
}

export function ActeIcons({
  actes,
  onActeClick,
  size = "md",
}: ActeIconsProps) {
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
          size={size}
        />
      ))}
    </div>
  );
}
