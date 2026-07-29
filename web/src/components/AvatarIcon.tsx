import avatarHommePng from "../assets/icons/avatar_homme.png";
import avatarFemmePng from "../assets/icons/avatar_femme.png";
import { FloatingTooltip } from "./FloatingTooltip";

const SIZE = {
  xs: "h-8 w-8",
  sm: "h-9 w-9",
  md: "h-10 w-10",
} as const;

interface AvatarIconProps {
  sexe: string | null | undefined;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
  /** Rend l'avatar cliquable pour choisir / cadrer une photo. */
  editable?: boolean;
  onEdit?: () => void;
}

/**
 * Avatar : photo type A si présente, sinon glyphe gris homme/femme.
 */
export function AvatarIcon({
  sexe,
  avatarUrl,
  size = "sm",
  className = "",
  editable = false,
  onEdit,
}: AvatarIconProps) {
  const isMale = sexe === "M";
  const isFemale = sexe === "F";
  const glyph = isMale ? avatarHommePng : isFemale ? avatarFemmePng : null;
  const label = avatarUrl
    ? editable
      ? "Changer l'avatar"
      : "Avatar"
    : editable
      ? "Ajouter un avatar"
      : isMale
        ? "Homme"
        : isFemale
          ? "Femme"
          : "Sexe inconnu";

  const disk = (
    <span
      aria-label={label}
      className={`relative inline-flex ${SIZE[size]} items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-600 ${
        editable ? "cursor-pointer ring-1 ring-slate-300 hover:ring-slate-400" : ""
      }`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : glyph ? (
        <span
          className="block h-[70%] w-[70%] bg-current"
          style={{
            WebkitMaskImage: `url(${glyph})`,
            maskImage: `url(${glyph})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
          aria-hidden="true"
        />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
    </span>
  );

  if (!editable) {
    return (
      <FloatingTooltip content={label} className={`shrink-0 ${className}`}>
        {disk}
      </FloatingTooltip>
    );
  }

  return (
    <FloatingTooltip content={label} className={`shrink-0 ${className}`}>
      <button
        type="button"
        data-tree-interactive
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit?.();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 rounded-full p-0"
      >
        {disk}
      </button>
    </FloatingTooltip>
  );
}
