import type { EvenementResume } from "../types/api";
import { formatDateJJMMAAAA } from "../utils/format";
import { EvenementIcon } from "./GenealogyIcons";
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

  return (
    <span className="group/relEvt relative inline-flex items-center gap-0.5">
      <EvenementIcon type={type} size="xs" className="text-slate-500" />
      {d && <span>{d}</span>}
      {tooltip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 whitespace-pre-line rounded-md bg-slate-800 px-2 py-1 text-left text-xs font-normal text-white shadow-md group-hover/relEvt:block"
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}

interface RelationPersonLabelProps {
  nom: string;
  prenoms: string | null;
  sexe?: string | null;
  naissance?: EvenementResume | null;
  deces?: EvenementResume | null;
  photos?: boolean;
  onPhotoClick?: () => void;
}

export function RelationPersonLabel({
  nom,
  prenoms,
  sexe,
  naissance,
  deces,
  photos = false,
  onPhotoClick,
}: RelationPersonLabelProps) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1 text-left">
      <PersonName
        nom={nom}
        prenoms={prenoms}
        sexe={sexe}
        photos={photos}
        onPhotoClick={onPhotoClick}
        photoSize="xs"
      />
      <span className="inline-flex items-center gap-x-1 text-slate-500">
        (<EventPartWithIcon type="naissance" evt={naissance} />
        <span aria-hidden="true">,</span>
        <EventPartWithIcon type="deces" evt={deces} />)
      </span>
    </span>
  );
}
