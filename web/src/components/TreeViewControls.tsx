import { useState, type ReactNode } from "react";
import { FloatingTooltip } from "./FloatingTooltip";

const MAX_ANCETRES = 8;
const MAX_DESCENDANTS = 6;

interface TreeViewControlsProps {
  details: boolean;
  onDetailsChange: (active: boolean) => void;
  horizontal: boolean;
  onHorizontalChange: (active: boolean) => void;
  ancetres: number;
  descendants: number;
  onAncetresChange: (n: number) => void;
  onDescendantsChange: (n: number) => void;
}

function Stepper({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Diminuer ${ariaLabel}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-base leading-none text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:opacity-40"
      >
        −
      </button>
      <span className="w-5 text-center tabular-nums font-medium text-slate-900">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Augmenter ${ariaLabel}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-base leading-none text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function ControlRow({
  label,
  tooltip,
  labelActive = false,
  children,
}: {
  label: string;
  tooltip?: string;
  labelActive?: boolean;
  children: ReactNode;
}) {
  const labelNode = (
    <span
      className={`whitespace-nowrap ${labelActive ? "font-medium text-sky-800" : "text-slate-700"}`}
    >
      {label}
    </span>
  );

  return (
    <>
      {tooltip ? (
        <FloatingTooltip content={tooltip} maxWidth={220} multiline align="end">
          {labelNode}
        </FloatingTooltip>
      ) : (
        labelNode
      )}
      <div className="justify-self-start">{children}</div>
    </>
  );
}

function Switch({
  checked,
  onChange,
  ariaLabel,
  tooltip,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  tooltip: string;
}) {
  return (
    <FloatingTooltip content={tooltip} maxWidth={260} multiline align="end">
      <input
        type="checkbox"
        role="switch"
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-7 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition checked:bg-sky-600 before:block before:h-3 before:w-3 before:translate-x-0.5 before:rounded-full before:bg-white before:transition before:content-[''] checked:before:translate-x-3.5"
      />
    </FloatingTooltip>
  );
}

function GearIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15-.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function TreeViewControls({
  details,
  onDetailsChange,
  horizontal,
  onHorizontalChange,
  ancetres,
  descendants,
  onAncetresChange,
  onDescendantsChange,
}: TreeViewControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`pointer-events-none relative ${open ? "w-max min-w-[11.5rem]" : "h-8 w-8"}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Masquer les options d'affichage" : "Afficher les options d'affichage"}
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto absolute right-0 top-0 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:text-sky-800 ${
          open
            ? "text-sky-800"
            : "border border-slate-200 bg-white/95 shadow-sm backdrop-blur hover:bg-white"
        }`}
      >
        <GearIcon />
      </button>

      {open && (
        <div className="pointer-events-auto rounded-lg border border-slate-200 bg-white/95 p-2.5 pt-10 shadow-sm backdrop-blur">
          <div className="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-2.5 text-sm">
            <ControlRow
              label="Ancêtres"
              tooltip="Nombre de générations d'ancêtres affichées"
            >
              <Stepper
                value={ancetres}
                min={0}
                max={MAX_ANCETRES}
                onChange={onAncetresChange}
                ariaLabel="ancêtres"
              />
            </ControlRow>
            <ControlRow
              label="Descendants"
              tooltip="Nombre de générations de descendants affichées"
            >
              <Stepper
                value={descendants}
                min={0}
                max={MAX_DESCENDANTS}
                onChange={onDescendantsChange}
                ariaLabel="descendants"
              />
            </ControlRow>
            <ControlRow label="Détails" labelActive={details}>
              <Switch
                checked={details}
                onChange={onDetailsChange}
                ariaLabel="Afficher les détails des cellules"
                tooltip={
                  details
                    ? "Détails : événements, actes, profession…"
                    : "Sans détails : cellules réduites (nom, prénom, ancre)"
                }
              />
            </ControlRow>
            <ControlRow label="Horizontal" labelActive={horizontal}>
              <Switch
                checked={horizontal}
                onChange={onHorizontalChange}
                ariaLabel="Disposition horizontale de l'arbre"
                tooltip={
                  horizontal
                    ? "Horizontal : générations de gauche à droite"
                    : "Vertical : générations de haut en bas"
                }
              />
            </ControlRow>
          </div>
        </div>
      )}
    </div>
  );
}
