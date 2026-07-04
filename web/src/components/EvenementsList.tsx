import type { ActeType, EvenementArbre, WarningEvenement } from "../types/api";
import { formatDateJJMMAAAA } from "../utils/format";
import { ActeIconSingle } from "./ActeIcons";
import { WarningIcon } from "./GenealogyIcons";
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

/** Au minimum une ligne naissance, mariage, décès. */
export function normalizeEvenements(evenements: EvenementArbre[]): EvenementArbre[] {
  const naissance =
    evenements.find((e) => e.type === "naissance") ?? EMPTY_EVENEMENT("naissance");
  const mariages = evenements.filter((e) => e.type === "mariage");
  const deces =
    evenements.find((e) => e.type === "deces") ?? EMPTY_EVENEMENT("deces");
  return [
    naissance,
    ...(mariages.length > 0 ? mariages : [EMPTY_EVENEMENT("mariage")]),
    deces,
  ];
}

function EventWarnings({
  warnings,
  size,
}: {
  warnings: WarningEvenement[];
  size: "compact" | "comfortable";
}) {
  const iconSize = size === "compact" ? "xs" : "sm";
  if (warnings.length === 0) {
    return <span className="inline-block w-3" aria-hidden="true" />;
  }
  return (
    <span className="inline-flex justify-end gap-0.5">
      {warnings.map((w, i) => (
        <span key={`${w.code}-${i}`} className="group/warn relative inline-flex">
          <span aria-label={w.message}>
            <WarningIcon size={iconSize} />
          </span>          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 z-50 mb-1 hidden min-w-[120px] max-w-[220px] whitespace-pre-line rounded-md bg-slate-800 px-2 py-1 text-left text-[10px] font-normal leading-snug text-white shadow-md group-hover/warn:block"
          >
            {w.message}
            {w.detail ? `\n${w.detail}` : ""}
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
}: {
  evt: EvenementArbre;
  onActeClick?: (type: ActeType, url: string) => void;
  size: "compact" | "comfortable";
}) {
  const date = formatDateJJMMAAAA(evt.date, evt.date_brute);
  const lieu = evt.lieu?.trim();
  const acteType = EVENT_ACTE_TYPE[evt.type];
  const acteSize = size === "compact" ? "xs" : "sm";
  const gridClass =
    size === "compact"
      ? "grid-cols-[1.25rem_minmax(3.25rem,auto)_1fr_0.75rem]"
      : "grid-cols-[1.75rem_minmax(4.5rem,auto)_1fr_1rem]";

  return (
    <div
      className={`grid ${gridClass} items-center gap-x-1.5 leading-tight text-slate-500`}
    >
      {acteType ? (
        <ActeIconSingle
          type={acteType}
          acte={evt.acte}
          onActeClick={onActeClick}
          size={acteSize}
        />
      ) : (
        <span className="inline-block w-4" aria-hidden="true" />
      )}
      <span className="truncate tabular-nums">{date ?? ""}</span>
      <span className="truncate">{lieu ?? ""}</span>
      <EventWarnings warnings={evt.warnings} size={size} />    </div>
  );
}

interface EvenementsListProps {
  evenements: EvenementArbre[];
  onActeClick?: (type: ActeType, url: string) => void;
  size?: "compact" | "comfortable";
  className?: string;
}

export function EvenementsList({
  evenements,
  onActeClick,
  size = "compact",
  className = "",
}: EvenementsListProps) {
  const rows = normalizeEvenements(evenements);
  const textClass = size === "compact" ? "text-[10px]" : "text-sm";

  return (
    <div
      className={`flex flex-col gap-y-0.5 ${textClass} ${className}`}
      aria-label="Événements"
    >
      {rows.map((evt, i) => (
        <EventRow
          key={`${evt.type}-${evt.id_famille ?? i}`}
          evt={evt}
          onActeClick={onActeClick}
          size={size}
        />
      ))}
    </div>
  );
}
