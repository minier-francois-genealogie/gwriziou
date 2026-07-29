import { ICON_ABSENT_SURFACE } from "../utils/iconStyles";
import { FloatingTooltip } from "./FloatingTooltip";
import type { DossierActes } from "../types/api";

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

interface ActesDossierRowProps {
  dossier: DossierActes;
}

export function ActesDossierRow({ dossier }: ActesDossierRowProps) {
  const tooltip = dossier.existe
    ? "Dossier GitHub présent (actes / photos indexés)"
    : "Dossier GitHub attendu — pas encore indexé";

  return (
    <div className="mb-3 flex min-w-0 items-center gap-2">
      <FloatingTooltip content={tooltip} className="shrink-0">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
            dossier.existe
              ? "bg-sky-100 text-sky-700"
              : ICON_ABSENT_SURFACE
          }`}
          aria-label={tooltip}
        >
          <FolderIcon className="h-3.5 w-3.5" />
        </span>
      </FloatingTooltip>
      <FloatingTooltip content={dossier.chemin} maxWidth={360} align="start" className="min-w-0 flex-1">
        <span
          className={`block truncate font-mono text-xs leading-snug ${
            dossier.existe ? "text-slate-700" : "text-slate-400"
          }`}
        >
          {dossier.chemin}
        </span>
      </FloatingTooltip>
    </div>
  );
}
