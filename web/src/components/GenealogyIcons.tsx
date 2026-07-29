import type { ActeType } from "../types/api";
import { GlyphIcon, type GlyphSize } from "./GlyphIcon";

export type EvenementType = ActeType | "naissance_enfant";

const VIEWBOX = "0 0 24 24";
const STROKE = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Naissance d'un enfant : silhouette (listes d'événements, pas disque). */
function NaissanceEnfantShape() {
  return (
    <>
      <circle cx="12" cy="8" r="3" {...STROKE} />
      <path d="M12 11v6M8.5 14.5h7" {...STROKE} />
    </>
  );
}

function shapeForSvgNative(type: EvenementType | string) {
  switch (type) {
    case "naissance":
      return (
        <>
          <path d="M12 3.5v17M3.5 12h17" {...STROKE} />
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...STROKE} />
        </>
      );
    case "naissance_enfant":
      return <NaissanceEnfantShape />;
    case "mariage":
      return (
        <path
          d="M6 12 C6 8.2, 9 8.2, 12 12 C15 15.8, 18 15.8, 18 12 C18 8.2, 15 8.2, 12 12 C9 15.8, 6 15.8, 6 12"
          {...STROKE}
        />
      );
    case "deces":
      return <path d="M12 5.25v14.5M8 9.5h8" {...STROKE} strokeWidth={2.25} />;
    default:
      return null;
  }
}

const SIZE_CLASS = {
  xs: "h-2.5 w-2.5",
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
} as const;

interface EvenementIconProps {
  type: EvenementType | string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

/** Icône événement HTML — PNG masqué (N/M/D) pour centrage stable. */
export function EvenementIcon({
  type,
  size = "xs",
  className = "",
}: EvenementIconProps) {
  if (type === "naissance" || type === "mariage" || type === "deces") {
    return (
      <GlyphIcon
        name={type}
        size={size as GlyphSize}
        className={className}
      />
    );
  }
  const shape = shapeForSvgNative(type);
  if (!shape) {
    return (
      <span
        className={`inline-block shrink-0 ${SIZE_CLASS[size]} ${className}`}
        aria-hidden="true"
      >
        ·
      </span>
    );
  }
  return (
    <svg
      viewBox={VIEWBOX}
      className={`block shrink-0 ${SIZE_CLASS[size]} ${className}`}
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}

interface EvenementIconGProps {
  type: EvenementType;
  size?: number;
  className?: string;
}

/** Variante SVG native (UnionNode, etc.). */
export function EvenementIconG({
  type,
  size = 14,
  className,
}: EvenementIconGProps) {
  const scale = size / 24;
  const shape = shapeForSvgNative(type);
  if (!shape) return null;
  return (
    <g
      transform={`scale(${scale})`}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform="translate(-12, -12)">{shape}</g>
    </g>
  );
}

const WARNING_SIZE = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
} as const;

/** Chêne : houppier en nuage + long tronc (menu navigation arbre). */
export function TreeMenuIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox={VIEWBOX}
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
      {...STROKE}
    >
      <circle cx="12" cy="5.5" r="4" />
      <circle cx="7.5" cy="8.5" r="3.5" />
      <circle cx="16.5" cy="8.5" r="3.5" />
      <circle cx="10" cy="11" r="3" />
      <circle cx="14" cy="11" r="3" />
      <path d="M12 12v10" />
    </svg>
  );
}

/** Ancre de l'arbre (même pictogramme que le bouton ancre). */
export function AncreIcon({ className = "h-3.5 w-3.5 text-slate-800" }: { className?: string }) {
  return (
    <svg
      viewBox={VIEWBOX}
      className={`inline-block shrink-0 align-[-0.12em] ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="3" />
      <path d="M12 22V8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  );
}

/** Triangle d'avertissement (alerte sur un événement). */
export function WarningIcon({
  size = "xs",
  className = "",
}: {
  size?: keyof typeof WARNING_SIZE;
  className?: string;
}) {
  return (
    <svg
      viewBox={VIEWBOX}
      className={`inline-block shrink-0 ${WARNING_SIZE[size]} text-amber-500 ${className}`}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 2.2 2.2 20.8c-.3.5.1 1.2.8 1.2h18c.7 0 1.1-.7.8-1.2L12 2.2z"
      />
      <rect x="11" y="8.5" width="2" height="5.5" rx="1" fill="white" />
      <circle cx="12" cy="17" r="1.35" fill="white" />
    </svg>
  );
}
