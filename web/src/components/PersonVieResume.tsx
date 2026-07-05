import type { VieDatesAffichage } from "../types/api";
import {
  regleDecesMaxLabel,
  regleNaissanceMinLabel,
} from "../content/vieDatesRegles";
import { formatDateJJMMAAAA, formatVieDateDisplay, isProbablyAlive } from "../utils/format";
import { EvenementIcon } from "./GenealogyIcons";
import { VieDateTooltip } from "./VieDateTooltip";

function EventPart({
  type,
  date,
  lieu,
  estimated = false,
  tooltip,
}: {
  type: "naissance" | "deces";
  date?: string | null;
  lieu?: string | null;
  estimated?: boolean;
  tooltip?: string | null;
}) {
  const d = date?.trim();
  const l = lieu?.trim();
  if (!d && !l) return null;

  const text = (
    <span className={estimated ? "text-red-600" : undefined}>
      {[d, l].filter(Boolean).join(" ")}
    </span>
  );

  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <EvenementIcon type={type} size="xs" className="shrink-0 text-slate-500" />
      {estimated ? (
        <VieDateTooltip tooltip={tooltip}>{text}</VieDateTooltip>
      ) : (
        text
      )}
    </span>
  );
}

export interface PersonVieResumeProps extends VieDatesAffichage {
  naissance?: string | null;
  lieuNaissance?: string | null;
  deces?: string | null;
  lieuDeces?: string | null;
  className?: string;
}

export function PersonVieResume({
  naissance,
  lieuNaissance,
  deces,
  lieuDeces,
  date_naissance_min,
  date_naissance_min_approximation,
  date_naissance_min_regle,
  date_deces_max,
  date_deces_max_approximation,
  date_deces_max_regle,
  naissance_gedcom = false,
  deces_gedcom = false,
  className = "",
}: PersonVieResumeProps) {
  const birthGedcom = naissance_gedcom ? naissance?.trim() : null;
  const birthEstime =
    !naissance_gedcom && date_naissance_min
      ? formatVieDateDisplay(date_naissance_min, date_naissance_min_approximation)
      : null;
  const birthDate = birthGedcom ?? birthEstime;
  const birthEstimated = !birthGedcom && !!birthEstime;
  const birthTooltip = birthEstimated
    ? regleNaissanceMinLabel(date_naissance_min_regle) ??
      "Date de naissance estimée."
    : null;

  const deathGedcom = deces_gedcom ? deces?.trim() : null;
  const deathEstime =
    !deces_gedcom && date_deces_max && !isProbablyAlive(date_deces_max)
      ? formatVieDateDisplay(date_deces_max, date_deces_max_approximation)
      : null;
  const deathDate = deathGedcom ?? deathEstime;
  const deathEstimated = !deathGedcom && !!deathEstime;
  const deathTooltip = deathEstimated
    ? regleDecesMaxLabel(date_deces_max_regle) ?? "Date de décès estimée."
    : null;

  const hasBirth = !!(birthDate || lieuNaissance?.trim());
  const hasDeath = !!(deathDate || lieuDeces?.trim());
  if (!hasBirth && !hasDeath) return null;

  return (
    <span className={`flex flex-col gap-0.5 text-xs text-slate-500 ${className}`}>
      {hasBirth && (
        <EventPart
          type="naissance"
          date={birthDate}
          lieu={lieuNaissance}
          estimated={birthEstimated}
          tooltip={birthTooltip}
        />
      )}
      {hasDeath && (
        <EventPart
          type="deces"
          date={deathDate}
          lieu={lieuDeces}
          estimated={deathEstimated}
          tooltip={deathTooltip}
        />
      )}
    </span>
  );
}

/** Dates naissance/décès pour une ligne d'événement (arbre / fiche). */
export function resolveEventDateDisplay(
  type: "naissance" | "deces",
  dateIso: string | null | undefined,
  dateBrute: string | null | undefined,
  vieDates: VieDatesAffichage | undefined,
): { text: string | null; estimated: boolean; regleTooltip: string | null } {
  const gedcom = formatDateJJMMAAAA(dateIso, dateBrute);
  if (gedcom) return { text: gedcom, estimated: false, regleTooltip: null };

  if (type === "naissance" && vieDates && !vieDates.naissance_gedcom) {
    const est = formatVieDateDisplay(
      vieDates.date_naissance_min,
      vieDates.date_naissance_min_approximation,
    );
    if (est) {
      return {
        text: est,
        estimated: true,
        regleTooltip:
          regleNaissanceMinLabel(vieDates.date_naissance_min_regle) ??
          "Date de naissance estimée.",
      };
    }
  }
  if (type === "deces" && vieDates && !vieDates.deces_gedcom) {
    if (isProbablyAlive(vieDates.date_deces_max)) {
      return { text: null, estimated: false, regleTooltip: null };
    }
    const est = formatVieDateDisplay(
      vieDates.date_deces_max,
      vieDates.date_deces_max_approximation,
    );
    if (est) {
      return {
        text: est,
        estimated: true,
        regleTooltip:
          regleDecesMaxLabel(vieDates.date_deces_max_regle) ??
          "Date de décès estimée.",
      };
    }
  }
  return { text: null, estimated: false, regleTooltip: null };
}
