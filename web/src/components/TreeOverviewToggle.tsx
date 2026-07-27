import { FloatingTooltip } from "./FloatingTooltip";

interface TreeOverviewToggleProps {
  active: boolean;
  onChange: (active: boolean) => void;
}

export function TreeOverviewToggle({ active, onChange }: TreeOverviewToggleProps) {
  return (
    <FloatingTooltip
      content={
        active
          ? "Compresser : cellules réduites (nom, prénom, ancre)"
          : "Vue détaillée : événements, actes, profession…"
      }
      maxWidth={260}
      multiline
      align="end"
    >
      <label className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-sm text-slate-700 shadow-sm backdrop-blur">
        <span className={active ? "font-medium text-sky-800" : ""}>Compresser</span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Compresser l'affichage de l'arbre"
          checked={active}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-7 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition checked:bg-sky-600 before:block before:h-3 before:w-3 before:translate-x-0.5 before:rounded-full before:bg-white before:transition before:content-[''] checked:before:translate-x-3.5"
        />
      </label>
    </FloatingTooltip>
  );
}
