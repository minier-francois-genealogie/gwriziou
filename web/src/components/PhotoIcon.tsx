import {
  ICON_ABSENT_BTN,
  ICON_ACTIVE_AMBER,
  ICON_ACTIVE_AMBER_HOVER,
  ICON_DISK,
  ICON_GLYPH_INSET,
} from "../utils/iconStyles";
import { FloatingTooltip } from "./FloatingTooltip";
import { GlyphIcon } from "./GlyphIcon";

export function photoTooltip(hasPhotos: boolean, count?: number): string {
  if (!hasPhotos) return "Aucune photo";
  if (count === 1) return "1 photo";
  if (count != null && count > 1) return `${count} photos`;
  return "Photo(s) disponible(s)";
}

interface PhotoIconProps {
  hasPhotos: boolean;
  photoCount?: number;
  onClick?: () => void;
  className?: string;
}

export function PhotoIcon({
  hasPhotos,
  photoCount,
  onClick,
  className = "",
}: PhotoIconProps) {
  const tooltip = photoTooltip(hasPhotos, photoCount);

  return (
    <FloatingTooltip
      content={tooltip}
      className={`${ICON_DISK} shrink-0 ${className}`}
    >
      <button
        type="button"
        aria-disabled={!hasPhotos}
        aria-label={tooltip}
        onClick={(e) => {
          e.stopPropagation();
          if (!hasPhotos || !onClick) return;
          onClick();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className={`relative box-border ${ICON_DISK} m-0 overflow-hidden border-0 p-0 leading-none transition-colors ${
          hasPhotos
            ? `${ICON_ACTIVE_AMBER} ${ICON_ACTIVE_AMBER_HOVER}`
            : ICON_ABSENT_BTN
        }`}
      >
        <GlyphIcon
          name="photo"
          size="fill"
          className={ICON_GLYPH_INSET}
        />
      </button>
    </FloatingTooltip>
  );
}
