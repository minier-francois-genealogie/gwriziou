import { ICON_ABSENT_SURFACE, ICON_ABSENT_BTN_HOVER } from "../utils/iconStyles";
import { FloatingTooltip } from "./FloatingTooltip";
import { GlyphIcon } from "./GlyphIcon";

export function noteTooltip(hasNotes: boolean): string {
  return hasNotes ? "Note(s) disponible(s)" : "Ajouter une note";
}

const DISK = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
} as const;

const GLYPH = {
  xs: "xs",
  sm: "sm",
} as const;

interface NoteIconProps {
  hasNotes: boolean;
  onClick?: () => void;
  size?: "xs" | "sm";
  className?: string;
}

export function NoteIcon({
  hasNotes,
  onClick,
  size = "sm",
  className = "",
}: NoteIconProps) {
  const tooltip = noteTooltip(hasNotes);

  return (
    <FloatingTooltip content={tooltip} className={`shrink-0 justify-center ${className}`}>
      <button
        type="button"
        aria-label={tooltip}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className={`inline-flex items-center justify-center rounded-full p-0 leading-none transition-colors ${DISK[size]} ${
          hasNotes
            ? "cursor-pointer bg-slate-900 text-white hover:bg-slate-800"
            : `cursor-pointer ${ICON_ABSENT_SURFACE} ${ICON_ABSENT_BTN_HOVER}`
        }`}
      >
        <GlyphIcon name="note" size={GLYPH[size]} />
      </button>
    </FloatingTooltip>
  );
}
