import { EvenementIcon } from "./GenealogyIcons";

function EventPart({
  type,
  date,
  lieu,
}: {
  type: "naissance" | "deces";
  date?: string | null;
  lieu?: string | null;
}) {
  const d = date?.trim();
  const l = lieu?.trim();
  if (!d && !l) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <EvenementIcon type={type} size="xs" className="text-slate-500" />
      <span>{[d, l].filter(Boolean).join(" ")}</span>
    </span>
  );
}

interface PersonVieResumeProps {
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
  className = "",
}: PersonVieResumeProps) {
  const hasBirth = !!(naissance?.trim() || lieuNaissance?.trim());
  const hasDeath = !!(deces?.trim() || lieuDeces?.trim());
  if (!hasBirth && !hasDeath) return null;

  return (
    <span className={`flex flex-col gap-0.5 text-xs text-slate-500 ${className}`}>
      {hasBirth && (
        <EventPart type="naissance" date={naissance} lieu={lieuNaissance} />
      )}
      {hasDeath && <EventPart type="deces" date={deces} lieu={lieuDeces} />}
    </span>
  );
}
