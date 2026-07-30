import {
  ICON_ABSENT_BTN,
  ICON_ABSENT_BTN_HOVER,
  ICON_ACTIVE_GREEN,
  ICON_ACTIVE_GREEN_HOVER,
  ICON_DISK,
  ICON_GLYPH_INSET,
} from "../utils/iconStyles";
import { useAuth } from "../context/AuthContext";
import { FloatingTooltip } from "./FloatingTooltip";
import { GlyphIcon } from "./GlyphIcon";

interface CheckedIconProps {
  checked: boolean;
  onToggle?: (next: boolean) => void;
  disabled?: boolean;
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
        className={`${ICON_DISK} shrink-0 ${className}`}
        contentClassName="min-w-[120px]"
        align="end"
      >
        <span
          aria-label={label}
          className={`relative box-border block ${ICON_DISK} overflow-hidden leading-none ${diskClass}`}
        >
          <GlyphIcon
            name="checked"
            size="fill"
            className={ICON_GLYPH_INSET}
          />
        </span>
      </FloatingTooltip>
    );
  }

  return (
    <FloatingTooltip
      content={label}
      className={`${ICON_DISK} shrink-0 ${className}`}
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
        className={`relative box-border ${ICON_DISK} m-0 overflow-hidden border-0 p-0 leading-none transition ${
          checked
            ? `cursor-pointer ${ICON_ACTIVE_GREEN} ${ICON_ACTIVE_GREEN_HOVER}`
            : `cursor-pointer ${ICON_ABSENT_BTN} ${ICON_ABSENT_BTN_HOVER}`
        } ${disabled ? "opacity-60" : ""}`}
      >
        <GlyphIcon name="checked" size="fill" className={ICON_GLYPH_INSET} />
      </button>
    </FloatingTooltip>
  );
}
