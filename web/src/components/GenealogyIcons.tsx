import type { ActeType } from "../types/api";

export type EvenementType = ActeType | "naissance_enfant";

const VIEWBOX = "0 0 24 24";
const STROKE = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Naissance : astérisque à 8 branches (symbole courant en généalogie). */
function NaissanceShape() {
  return (
    <>
      <path d="M12 3v18M3 12h18" {...STROKE} />
      <path d="M6.34 6.34l11.32 11.32M17.66 6.34 6.34 17.66" {...STROKE} />
    </>
  );
}

/** Mariage : lemniscate ∞ (symbole d'union en généalogie). */
function MariageShape() {
  return (
    <path
      d="M6 12 C6 8, 9 8, 12 12 C15 16, 18 16, 18 12 C18 8, 15 8, 12 12 C9 16, 6 16, 6 12"
      {...STROKE}
    />
  );
}

/** Décès : croix latine † (symbole de fin de vie en généalogie). */
function DecesShape() {
  return <path d="M12 4v16M8 8h8" {...STROKE} strokeWidth={2.25} />;
}

/** Naissance d'un enfant : silhouette enfant. */
function NaissanceEnfantShape() {
  return (
    <>
      <circle cx="12" cy="8" r="3" {...STROKE} />
      <path d="M12 11v6M8.5 14.5h7" {...STROKE} />
    </>
  );
}

function shapeFor(type: EvenementType | string) {
  switch (type) {
    case "naissance":
      return <NaissanceShape />;
    case "naissance_enfant":
      return <NaissanceEnfantShape />;
    case "mariage":
      return <MariageShape />;
    case "deces":
      return <DecesShape />;
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

/** Icône événement pour HTML (fiche, arbre foreignObject, actes). */
export function EvenementIcon({
  type,
  size = "xs",
  className = "",
}: EvenementIconProps) {
  const shape = shapeFor(type);
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
      className={`inline-block shrink-0 ${SIZE_CLASS[size]} ${className}`}
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
  const shape = shapeFor(type);
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
