import type { ActeType, ActesPersonne, EvenementResume } from "../types/api";
import { formatDateJJMMAAAA } from "../utils/format";
import { EvenementIcon } from "./GenealogyIcons";
import { FloatingTooltip } from "./FloatingTooltip";
import { PersonName } from "./SexeIcon";

function EventPartWithIcon({
  type,
  evt,
}: {
  type: "naissance" | "deces";
  evt: EvenementResume | null | undefined;
}) {
  const d = formatDateJJMMAAAA(evt?.date, evt?.date_brute);
  const lieu = evt?.lieu?.trim();
  const tooltip = [d, lieu].filter(Boolean).join("\n");

  const content = (
    <span className="inline-flex items-center gap-0.5">
      <EvenementIcon type={type} size="xs" className="text-slate-500" />
      {d && <span>{d}</span>}
    </span>
  );

  if (!tooltip) return content;

  return (
    <FloatingTooltip content={tooltip} multiline contentClassName="text-xs">
      {content}
    </FloatingTooltip>
  );
}
interface RelationPersonLabelProps {
  nom: string;
  prenoms: string | null;
  sexe?: string | null;
  naissance?: EvenementResume | null;
  deces?: EvenementResume | null;
  actes?: ActesPersonne;
  onActeClick?: (type: ActeType, url: string) => void;
  photos?: boolean;
  photoCount?: number;
  onPhotoClick?: () => void;
  className?: string;
  datesClassName?: string;
  photoSize?: "xs" | "sm";
  acteSize?: "xs" | "sm";
}

export function RelationPersonLabel({
  nom,
  prenoms,
  sexe,
  naissance,
  deces,
  actes = { naissance: null, mariage: null, deces: null },
  onActeClick,
  photos = false,
  photoCount,
  onPhotoClick,
  className = "",
  datesClassName = "text-slate-500",
  photoSize = "xs",
  acteSize = "xs",
}: RelationPersonLabelProps) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 text-left ${className}`}>
      <PersonName
        nom={nom}
        prenoms={prenoms}
        sexe={sexe}
        photos={photos}
        photoCount={photoCount}
        onPhotoClick={onPhotoClick}
        photoSize={photoSize}
        actes={actes}
        onActeClick={onActeClick}
        acteSize={acteSize}
      />
      <span className={`inline-flex items-center gap-x-1 font-normal ${datesClassName}`}>
        (<EventPartWithIcon type="naissance" evt={naissance} />
        <span aria-hidden="true">,</span>
        <EventPartWithIcon type="deces" evt={deces} />)
      </span>
    </span>
  );
}
