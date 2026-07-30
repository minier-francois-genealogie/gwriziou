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

const STROKE = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Glyphe homme (SVG). */
function AvatarHommeGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={`block ${className}`}
      aria-hidden="true"
      {...STROKE}
    >
      <path d="M31 52V24c0-12 14-21 33-21h8c18 0 25 10 25 24v22" />
      <path d="M35 40 46 27 56 37 74 22 91 40" />
      <path d="M37 42c0 22 10 39 27 39s27-17 27-39" />
      <path d="M53 83v8M73 83v8" />
      <path d="M40 91 52 105 58 96" />
      <path d="M88 91 76 105 70 96" />
      <path d="M56 104v23M71 104v23" />
      <path d="M34 94C24 108 22 118 22 127" />
      <path d="M94 94c10 14 12 24 12 33" />
    </svg>
  );
}

/** Glyphe femme (SVG). */
function AvatarFemmeGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={`block ${className}`}
      aria-hidden="true"
      {...STROKE}
    >
      <path d="M31 96V28C31 10 46 2 64 2s33 8 33 26v68" />
      <path d="M37 40H70l4 8 4-8h13" />
      <path d="M37 46c0 20 10 35 27 35s27-15 27-35" />
      <path d="M22 127C22 110 26 100 34 97c8-2 18-2 30 8 12-10 22-10 30-8 8 3 12 13 12 30" />
    </svg>
  );
}

/**
 * Avatar : photo type A si présente, sinon glyphe SVG homme/femme.
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
        editable ? "cursor-pointer ring-1 ring-inset ring-slate-300 hover:ring-slate-400" : ""
      }`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : isMale ? (
        <AvatarHommeGlyph className="h-[78%] w-[78%]" />
      ) : isFemale ? (
        <AvatarFemmeGlyph className="h-[78%] w-[78%]" />
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
