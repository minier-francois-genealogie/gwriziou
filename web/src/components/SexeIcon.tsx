import type { ActeType, ActesPersonne } from "../types/api";
import { formatNom } from "../utils/format";
import { ActeIcons } from "./ActeIcons";
import { FloatingTooltip } from "./FloatingTooltip";
import { NoteIcon } from "./NoteIcon";
import { PhotoIcon } from "./PhotoIcon";
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
      <FloatingTooltip content="Homme" className={`items-center justify-center ${className}`}>
        <span aria-label="Homme">
          <MarsIcon className={`${ICON_CLASS} text-sky-600`} />
        </span>
      </FloatingTooltip>
    );
  }
  if (sexe === "F") {
    return (
      <FloatingTooltip content="Femme" className={`items-center justify-center ${className}`}>
        <span aria-label="Femme">
          <VenusIcon className={`${ICON_CLASS} text-rose-500`} />
        </span>
      </FloatingTooltip>
    );
  }  return (
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
  photos?: boolean;
  photoCount?: number;
  onPhotoClick?: () => void;
  photoSize?: "xs" | "sm";
  showPhoto?: boolean;
  hasNotes?: boolean;
  onNoteClick?: () => void;
  showNote?: boolean;
  actes?: ActesPersonne;
  onActeClick?: (type: ActeType, url: string) => void;
  acteSize?: "xs" | "sm";
}

export function PersonName({
  nom,
  prenoms,
  sexe,
  className = "",
  photos = false,
  photoCount,
  onPhotoClick,
  photoSize = "sm",
  showPhoto = true,
  hasNotes = false,
  onNoteClick,
  showNote = true,
  actes,
  onActeClick,
  acteSize = "xs",
}: PersonNameProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <SexeIcon sexe={sexe} />
      {showPhoto && (
        <PhotoIcon
          hasPhotos={photos}
          photoCount={photoCount}
          onClick={onPhotoClick}
          size={photoSize}
        />
      )}
      {showNote && (
        <NoteIcon hasNotes={hasNotes} onClick={onNoteClick} size={photoSize} />
      )}
      {actes && (
        <ActeIcons actes={actes} onActeClick={onActeClick} size={acteSize} />
      )}
      <span>{formatNom(nom, prenoms)}</span>
    </span>
  );
}
