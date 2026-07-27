import { ICON_ABSENT_BTN, ICON_ABSENT_BTN_HOVER } from "../utils/iconStyles";
import { FloatingTooltip } from "./FloatingTooltip";

interface AncreButtonProps {
  active: boolean;
  onAncre: () => void;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
} as const;

const ICON = {
  xs: "h-2.5 w-2.5",
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
} as const;

/** Interrupteur ancre : gris (off) ou noir (on). Clic actif = noop. */
export function AncreButton({
  active,
  onAncre,
  size = "sm",
  className = "",
}: AncreButtonProps) {
  const label = active ? "Ancre actuelle de l'arbre" : "Ancrer l'arbre ici";

  return (
    <FloatingTooltip
      content={label}
      className={`shrink-0 ${className}`}
      contentClassName="min-w-[140px]"
      align="end"
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={active}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!active) onAncre();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`inline-flex ${SIZE[size]} items-center justify-center transition ${
          active
            ? "cursor-default rounded-md border border-slate-800 bg-slate-900 text-white"
            : `${ICON_ABSENT_BTN} ${ICON_ABSENT_BTN_HOVER}`
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={ICON[size]}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="3" />
          <path d="M12 22V8" />
          <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
        </svg>
      </button>
    </FloatingTooltip>
  );
}
