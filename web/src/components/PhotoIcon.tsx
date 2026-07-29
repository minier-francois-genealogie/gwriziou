import { ICON_ABSENT_BTN } from "../utils/iconStyles";
import { FloatingTooltip } from "./FloatingTooltip";
import { GlyphIcon } from "./GlyphIcon";

export function photoTooltip(hasPhotos: boolean, count?: number): string {
  if (!hasPhotos) return "Aucune photo";
  if (count === 1) return "1 photo";
  if (count != null && count > 1) return `${count} photos`;
  return "Photo(s) disponible(s)";
}

const DISK = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
} as const;

const GLYPH = {
  xs: "xs",
  sm: "sm",
} as const;

interface PhotoIconProps {
  hasPhotos: boolean;
  photoCount?: number;
  onClick?: () => void;
  size?: "xs" | "sm";
  className?: string;
}

export function PhotoIcon({
  hasPhotos,
  photoCount,
  onClick,
  size = "sm",
  className = "",
}: PhotoIconProps) {
  const tooltip = photoTooltip(hasPhotos, photoCount);

  return (
    <FloatingTooltip content={tooltip} className={`shrink-0 justify-center ${className}`}>
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
        className={`inline-flex items-center justify-center rounded-full p-0 leading-none transition-colors ${DISK[size]} ${
          hasPhotos
            ? "bg-slate-900 text-white hover:bg-slate-800"
            : ICON_ABSENT_BTN
        }`}
      >
        <GlyphIcon name="photo" size={GLYPH[size]} />
      </button>
    </FloatingTooltip>
  );
}
