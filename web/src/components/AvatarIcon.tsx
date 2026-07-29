import avatarHommePng from "../assets/icons/avatar_homme.png";
import avatarFemmePng from "../assets/icons/avatar_femme.png";
import { FloatingTooltip } from "./FloatingTooltip";

const SIZE = {
  xs: "h-6 w-6",
  sm: "h-7 w-7",
  md: "h-8 w-8",
} as const;

const PLUS = {
  xs: "h-3 w-3 text-[8px]",
  sm: "h-3.5 w-3.5 text-[9px]",
  md: "h-4 w-4 text-[10px]",
} as const;

interface AvatarIconProps {
  sexe: string | null | undefined;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
  /** Affiche le « + » et rend l'avatar cliquable pour choisir une photo. */
  editable?: boolean;
  onEdit?: () => void;
}

/**
 * Avatar : photo type A si présente, sinon glyphe gris homme/femme.
 * Mode editable : pastille « + » pour cadrer / uploader.
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
      className={`relative inline-flex ${SIZE[size]} items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-500 ${
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
      {editable && (
        <span
          className={`absolute bottom-0 right-0 flex ${PLUS[size]} items-center justify-center rounded-full bg-slate-700 font-bold leading-none text-white shadow`}
          aria-hidden="true"
        >
          +
        </span>
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
