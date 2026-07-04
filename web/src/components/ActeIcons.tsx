import type { ActeResume, ActeType, ActesPersonne } from "../types/api";
import { formatActeTooltipLines } from "../utils/format";
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

const ACTE_ICON_SIZE: Record<"xs" | "sm" | "md", "xs" | "sm" | "md"> = {
  xs: "xs",
  sm: "sm",
  md: "md",
};

interface ActeIconsProps {
  actes: ActesPersonne;
  onActeClick?: (type: ActeType, url: string) => void;
  size?: "sm" | "md";
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
    <span className="group/acte relative inline-flex justify-center">
      <button
        type="button"
        aria-disabled={!canOpen}
        onClick={(e) => {
          e.stopPropagation();
          if (!canOpen || !acte?.url || !onActeClick) return;
          onActeClick(type, acte.url);
        }}
        className={`inline-flex items-center justify-center rounded-full transition-colors ${dim} ${
          active
            ? canOpen
              ? meta.activeClass
              : `${meta.activeClass} cursor-default opacity-90`
            : "cursor-default bg-slate-200 text-slate-400"
        }`}
        aria-label={ariaLabel}
      >
        <EvenementIcon type={type} size={iconSize} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden min-w-[148px] max-w-[240px] -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1.5 text-left text-[10px] leading-snug text-white shadow-md group-hover/acte:block"
      >
        {lines.map((line, i) => (
          <span
            key={i}
            className={`block ${i === 0 ? "font-medium" : "font-normal text-slate-200"}`}
          >
            {line}
          </span>
        ))}
      </span>
    </span>
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
    <div className="flex gap-1" role="group" aria-label="Actes d'état civil">
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
