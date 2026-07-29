import {
  ICON_ABSENT_BTN,
  ICON_ABSENT_BTN_HOVER,
  ICON_ACTIVE_GREEN,
  ICON_ACTIVE_GREEN_HOVER,
} from "../utils/iconStyles";
import { useAuth } from "../context/AuthContext";
import { FloatingTooltip } from "./FloatingTooltip";
import { GlyphIcon } from "./GlyphIcon";

const SIZE = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
} as const;

const GLYPH = {
  xs: "xs",
  sm: "sm",
  md: "md",
} as const;

interface CheckedIconProps {
  checked: boolean;
  onToggle?: (next: boolean) => void;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/**
 * Marqueur « individu validé ».
 * Admin : interrupteur toujours visible (off / on).
 * Autres : icône visible uniquement si validé, non cliquable.
 */
export function CheckedIcon({
  checked,
  onToggle,
  disabled = false,
  size = "sm",
  className = "",
}: CheckedIconProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (!isAdmin && !checked) return null;

  const label = checked
    ? isAdmin
      ? "Individu validé — cliquer pour retirer"
      : "Individu validé"
    : "Marquer l'individu comme validé";

  const diskClass = checked
    ? ICON_ACTIVE_GREEN
    : `${ICON_ABSENT_BTN} ${ICON_ABSENT_BTN_HOVER}`;

  if (!isAdmin) {
    return (
      <FloatingTooltip
        content={label}
        className={`shrink-0 ${className}`}
        contentClassName="min-w-[120px]"
        align="end"
      >
        <span
          aria-label={label}
          className={`inline-flex ${SIZE[size]} items-center justify-center ${diskClass}`}
        >
          <GlyphIcon name="checked" size={GLYPH[size]} />
        </span>
      </FloatingTooltip>
    );
  }

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
        aria-pressed={checked}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) onToggle?.(!checked);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`inline-flex ${SIZE[size]} items-center justify-center transition ${
          checked
            ? `cursor-pointer ${ICON_ACTIVE_GREEN} ${ICON_ACTIVE_GREEN_HOVER}`
            : `cursor-pointer ${ICON_ABSENT_BTN} ${ICON_ABSENT_BTN_HOVER}`
        } ${disabled ? "opacity-60" : ""}`}
      >
        <GlyphIcon name="checked" size={GLYPH[size]} />
      </button>
    </FloatingTooltip>
  );
}
