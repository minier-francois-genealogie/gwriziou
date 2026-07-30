/**
 * Glyphes vectoriels (viewBox 24×24), déduits des PNG 96×96.
 * Couleur via `currentColor` — comme l'ancre.
 */

export type GlyphName =
  | "naissance"
  | "mariage"
  | "deces"
  | "photo"
  | "note"
  | "checked";

const SIZE_CLASS = {
  xs: "h-2.5 w-2.5",
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
  /** Dimensions via inset du parent (ex. ICON_GLYPH_INSET). */
  fill: "",
} as const;

export type GlyphSize = keyof typeof SIZE_CLASS;

const STROKE = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function GlyphShape({ name }: { name: GlyphName }) {
  switch (name) {
    case "naissance":
      // Astérisque 6 branches (3 barres à 60°) — bouts droits.
      return (
        <g fill="currentColor" stroke="none">
          <rect x="10.75" y="3.5" width="2.5" height="17" rx="0.2" />
          <rect
            x="10.75"
            y="3.5"
            width="2.5"
            height="17"
            rx="0.2"
            transform="rotate(60 12 12)"
          />
          <rect
            x="10.75"
            y="3.5"
            width="2.5"
            height="17"
            rx="0.2"
            transform="rotate(120 12 12)"
          />
        </g>
      );
    case "mariage":
      // ∞ lemniscate (symbole d'union).
      return (
        <path
          d="M6 12 C6 8.2 9 8.2 12 12 C15 15.8 18 15.8 18 12 C18 8.2 15 8.2 12 12 C9 15.8 6 15.8 6 12"
          {...STROKE}
          strokeWidth={2.4}
        />
      );
    case "deces":
      // Croix latine †, extrémités arrondies.
      return (
        <path d="M12 3.25v17.5M7 8.75h10" {...STROKE} strokeWidth={2.5} />
      );
    case "photo":
      // Appareil photo (contour).
      return (
        <>
          <rect x="3.5" y="7.5" width="17" height="12" rx="2.25" {...STROKE} />
          <path d="M9 7.5V6.25A1.25 1.25 0 0 1 10.25 5h3.5A1.25 1.25 0 0 1 15 6.25V7.5" {...STROKE} />
          <circle cx="12" cy="13.5" r="3.1" {...STROKE} />
        </>
      );
    case "note":
      // Bloc-notes + stylo.
      return (
        <>
          <rect x="4.5" y="3.5" width="12.5" height="15.5" rx="1.75" {...STROKE} />
          <path d="M7.25 8h6.5M7.25 11h6.5M7.25 14h3.75" {...STROKE} strokeWidth={2} />
          <path
            d="M13.5 14.5 19.2 8.8a1.35 1.35 0 0 1 1.9 1.9L15.4 16.4l-2.65.55z"
            {...STROKE}
            strokeWidth={2}
          />
        </>
      );
    case "checked":
      // Coche, bouts arrondis.
      return (
        <path d="M5.5 12.25 9.75 16.5 18.5 7.5" {...STROKE} strokeWidth={2.75} />
      );
    default:
      return null;
  }
}

/**
 * Glyphe SVG — net à toute taille, couleur = `currentColor`.
 */
export function GlyphIcon({
  name,
  size = "sm",
  className = "",
}: {
  name: GlyphName;
  size?: GlyphSize;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`block shrink-0 ${SIZE_CLASS[size]} ${className}`}
      aria-hidden="true"
    >
      <GlyphShape name={name} />
    </svg>
  );
}
