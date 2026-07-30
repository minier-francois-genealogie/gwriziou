import {
  ICON_ABSENT_BTN,
  ICON_ABSENT_BTN_HOVER,
  ICON_ACTIVE_AMBER,
  ICON_ACTIVE_AMBER_HOVER,
  ICON_DISK,
  ICON_GLYPH_INSET,
} from "../utils/iconStyles";
import { FloatingTooltip } from "./FloatingTooltip";
import { GlyphIcon } from "./GlyphIcon";

export function noteTooltip(hasNotes: boolean): string {
  return hasNotes ? "Note(s) disponible(s)" : "Ajouter une note";
}

interface NoteIconProps {
  hasNotes: boolean;
  onClick?: () => void;
  className?: string;
}

export function NoteIcon({
  hasNotes,
  onClick,
  className = "",
}: NoteIconProps) {
  const tooltip = noteTooltip(hasNotes);

  return (
    <FloatingTooltip
      content={tooltip}
      className={`${ICON_DISK} shrink-0 ${className}`}
    >
      <button
        type="button"
        aria-label={tooltip}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className={`relative box-border ${ICON_DISK} m-0 cursor-pointer overflow-hidden border-0 p-0 leading-none transition-colors ${
          hasNotes
            ? `${ICON_ACTIVE_AMBER} ${ICON_ACTIVE_AMBER_HOVER}`
            : `${ICON_ABSENT_BTN} ${ICON_ABSENT_BTN_HOVER}`
        }`}
      >
        <GlyphIcon
          name="note"
          size="fill"
          className={ICON_GLYPH_INSET}
        />
      </button>
    </FloatingTooltip>
  );
}
