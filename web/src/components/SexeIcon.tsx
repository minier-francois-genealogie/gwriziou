import { formatNom } from "../utils/format";

const ICON_CLASS = "h-3.5 w-3.5 shrink-0";

function MarsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="14" r="5" />
      <path d="M15 9 20 4M20 9V4h-5" />
    </svg>
  );
}

function VenusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7M9 18h6" />
    </svg>
  );
}

interface SexeIconProps {
  sexe: string | null | undefined;
  className?: string;
}

export function SexeIcon({ sexe, className = "" }: SexeIconProps) {
  if (sexe === "M") {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        aria-label="Homme"
        title="Homme"
      >
        <MarsIcon className={`${ICON_CLASS} text-sky-600`} />
      </span>
    );
  }
  if (sexe === "F") {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        aria-label="Femme"
        title="Femme"
      >
        <VenusIcon className={`${ICON_CLASS} text-rose-500`} />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <span className="h-1 w-1 rounded-full bg-slate-300" />
    </span>
  );
}

interface PersonNameProps {
  nom: string;
  prenoms: string | null;
  sexe?: string | null;
  className?: string;
}

export function PersonName({ nom, prenoms, sexe, className = "" }: PersonNameProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <SexeIcon sexe={sexe} />
      <span>{formatNom(nom, prenoms)}</span>
    </span>
  );
}
