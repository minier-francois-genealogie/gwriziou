import type { ActeType, EvenementArbre, VieDatesAffichage, WarningEvenement } from "../types/api";
import { formatNaissanceEnfantLabel, formatWarningDetail } from "../utils/format";
import { ActeIconSingle } from "./ActeIcons";
import { WarningIcon } from "./GenealogyIcons";
import { resolveEventDateDisplay } from "./PersonVieResume";
import { VieDateTooltip } from "./VieDateTooltip";
const EVENT_ACTE_TYPE: Record<string, ActeType> = {
  naissance: "naissance",
  mariage: "mariage",
  deces: "deces",
};

const EMPTY_EVENEMENT = (type: EvenementArbre["type"]): EvenementArbre => ({
  type,
  date: null,
  date_brute: null,
  lieu: null,
  departement: null,
  acte: null,
  warnings: [],
});

/** Au minimum une ligne naissance, mariage, décès ; naissances d'enfants si demandé. */
export function normalizeEvenements(
  evenements: EvenementArbre[],
  includeNaissancesEnfants = false,
): EvenementArbre[] {
  const naissance =
    evenements.find((e) => e.type === "naissance") ?? EMPTY_EVENEMENT("naissance");
  const mariages = evenements.filter((e) => e.type === "mariage");
  const naissancesEnfants = includeNaissancesEnfants
    ? evenements.filter((e) => e.type === "naissance_enfant")
    : [];
  const deces =
    evenements.find((e) => e.type === "deces") ?? EMPTY_EVENEMENT("deces");
  return [
    naissance,
    ...(mariages.length > 0 ? mariages : [EMPTY_EVENEMENT("mariage")]),
    ...naissancesEnfants,
    deces,
  ];
}

function EventWarnings({
  warnings,
  size,
  hideMissingActeWarnings = false,
}: {
  warnings: WarningEvenement[];
  size: "compact" | "comfortable";
  hideMissingActeWarnings?: boolean;
}) {
  const iconSize = size === "compact" ? "xs" : "sm";
  const visible = hideMissingActeWarnings
    ? warnings.filter((w) => w.code !== "MANQUE_ACTE")
    : warnings;
  if (visible.length === 0) {
    return <span className="inline-block w-3" aria-hidden="true" />;
  }
  return (
    <span className="inline-flex justify-end gap-0.5">
      {visible.map((w, i) => (
        <span key={`${w.code}-${i}`} className="group/warn relative inline-flex">
          <span aria-label={w.message}>
            <WarningIcon size={iconSize} />
          </span>          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 z-50 mb-1 hidden min-w-[120px] max-w-[220px] whitespace-pre-line rounded-md bg-slate-800 px-2 py-1 text-left text-[10px] font-normal leading-snug text-white shadow-md group-hover/warn:block"
          >
            {w.message}
            {w.detail ? `\n${formatWarningDetail(w.detail)}` : ""}
          </span>
        </span>
      ))}
    </span>
  );
}

function EventRow({
  evt,
  onActeClick,
  size,
  individuNaissance,
  hideMissingActeWarnings = false,
  vieDates,
}: {
  evt: EvenementArbre;
  onActeClick?: (type: ActeType, url: string) => void;
  size: "compact" | "comfortable";
  individuNaissance?: EvenementArbre;
  hideMissingActeWarnings?: boolean;
  vieDates?: VieDatesAffichage;
}) {
  const isNaissanceEnfant = evt.type === "naissance_enfant";
  const acteType = isNaissanceEnfant ? undefined : EVENT_ACTE_TYPE[evt.type];
  const acteSize = size === "compact" ? "xs" : "sm";
  let dateDisplay: string | null = null;
  let dateEstimated = false;
  let dateTooltip: string | null = null;
  if (evt.type === "naissance" || evt.type === "deces") {
    const resolved = resolveEventDateDisplay(
      evt.type,
      evt.date,
      evt.date_brute,
      vieDates,
    );
    dateDisplay = resolved.text;
    dateEstimated = resolved.estimated;
    dateTooltip = resolved.regleTooltip;
  }
  const detail =
    isNaissanceEnfant && evt.enfant
      ? formatNaissanceEnfantLabel(
          evt.enfant.prenoms,
          individuNaissance,
          { date: evt.date, date_brute: evt.date_brute },
        )
      : (evt.lieu?.trim() ?? "");
  const gridClass =
    size === "compact"
      ? "grid-cols-[1.25rem_minmax(3.25rem,auto)_1fr_0.75rem]"
      : "grid-cols-[1.75rem_minmax(4.5rem,auto)_1fr_1rem]";

  return (
    <div
      className={`grid ${gridClass} items-center gap-x-1.5 leading-tight text-slate-500`}
    >
      {isNaissanceEnfant ? (
        <span className="inline-block w-4" aria-hidden="true" />
      ) : acteType ? (
        <ActeIconSingle
          type={acteType}
          acte={evt.acte}
          onActeClick={onActeClick}
          size={acteSize}
        />
      ) : (
        <span className="inline-block w-4" aria-hidden="true" />
      )}
      {dateEstimated ? (
        <VieDateTooltip tooltip={dateTooltip} className="min-w-0">
          <span className="block truncate tabular-nums text-red-600">
            {dateDisplay ?? ""}
          </span>
        </VieDateTooltip>
      ) : (
        <span className="truncate tabular-nums">{dateDisplay ?? ""}</span>
      )}
      <span className="truncate">{detail}</span>
      <EventWarnings
        warnings={evt.warnings}
        size={size}
        hideMissingActeWarnings={hideMissingActeWarnings}
      />
    </div>
  );
}

interface EvenementsListProps {
  evenements: EvenementArbre[];
  onActeClick?: (type: ActeType, url: string) => void;
  size?: "compact" | "comfortable";
  className?: string;
  /** Naissances d'enfants : fiche individu uniquement. */
  showNaissancesEnfants?: boolean;
  /** Arbre : l'icône d'acte grisée suffit pour signaler l'absence d'acte. */
  hideMissingActeWarnings?: boolean;
  vieDates?: VieDatesAffichage;
}

export function EvenementsList({
  evenements,
  onActeClick,
  size = "compact",
  className = "",
  showNaissancesEnfants = false,
  hideMissingActeWarnings = false,
  vieDates,
}: EvenementsListProps) {
  const rows = normalizeEvenements(evenements, showNaissancesEnfants);
  const individuNaissance = rows.find((e) => e.type === "naissance");
  const textClass = size === "compact" ? "text-[10px]" : "text-sm";

  return (
    <div
      className={`flex flex-col gap-y-0.5 ${textClass} ${className}`}
      aria-label="Événements"
    >
      {rows.map((evt, i) => (
        <EventRow
          key={`${evt.type}-${evt.enfant?.id_gedcom ?? evt.id_famille ?? i}`}
          evt={evt}
          onActeClick={onActeClick}
          size={size}
          individuNaissance={individuNaissance}
          hideMissingActeWarnings={hideMissingActeWarnings}
          vieDates={vieDates}
        />
      ))}
    </div>
  );
}
