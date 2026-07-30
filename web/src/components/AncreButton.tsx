import {
  ICON_ABSENT_BTN,
  ICON_ABSENT_BTN_HOVER,
  ICON_ACTIVE_BLACK,
  ICON_DISK,
  ICON_GLYPH_INSET,
} from "../utils/iconStyles";
import { FloatingTooltip } from "./FloatingTooltip";

interface AncreButtonProps {
  active: boolean;
  onAncre: () => void;
  className?: string;
}

/** Interrupteur ancre : gris (off) ou noir (on). Clic actif = noop. */
export function AncreButton({
  active,
  onAncre,
  className = "",
}: AncreButtonProps) {
  const label = active ? "Ancre actuelle de l'arbre" : "Ancrer l'arbre ici";

  return (
    <FloatingTooltip
      content={label}
      className={`${ICON_DISK} shrink-0 ${className}`}
      contentClassName="min-w-[140px]"
      align="end"
    >
      <button
        type="button"
        data-tree-interactive
        aria-label={label}
        aria-pressed={active}
        disabled={active}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!active) onAncre();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`relative box-border ${ICON_DISK} m-0 overflow-hidden border-0 p-0 leading-none transition ${
          active
            ? `cursor-default ${ICON_ACTIVE_BLACK}`
            : `${ICON_ABSENT_BTN} ${ICON_ABSENT_BTN_HOVER}`
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={ICON_GLYPH_INSET}
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
