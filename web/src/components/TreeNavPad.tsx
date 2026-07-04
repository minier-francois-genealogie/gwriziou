import type { TreeNavDirection } from "../utils/treeNav";

interface TreeNavPadProps {
  canUp: boolean;
  canDown: boolean;
  canLeft: boolean;
  canRight: boolean;
  onMove: (direction: TreeNavDirection) => void;
}

function ChevronBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm backdrop-blur transition ${
        disabled
          ? "cursor-default border-slate-200 bg-white/60 text-slate-300"
          : "border-slate-200 bg-white/95 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function ChevronIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function TreeNavPad({
  canUp,
  canDown,
  canLeft,
  canRight,
  onMove,
}: TreeNavPadProps) {
  return (
    <div
      className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1"
      role="group"
      aria-label="Navigation dans l'arbre"
    >
      <span />
      <ChevronBtn label="Parent" disabled={!canUp} onClick={() => onMove("up")}>
        <ChevronIcon d="m18 15-6-6-6 6" />
      </ChevronBtn>
      <span />
      <ChevronBtn
        label="Personne à gauche"
        disabled={!canLeft}
        onClick={() => onMove("left")}
      >
        <ChevronIcon d="m15 18-6-6 6-6" />
      </ChevronBtn>
      <span className="flex items-center justify-center text-[10px] text-slate-400">
        ◎
      </span>
      <ChevronBtn
        label="Personne à droite"
        disabled={!canRight}
        onClick={() => onMove("right")}
      >
        <ChevronIcon d="m9 18 6-6-6-6" />
      </ChevronBtn>
      <span />
      <ChevronBtn label="Enfant aîné" disabled={!canDown} onClick={() => onMove("down")}>
        <ChevronIcon d="m6 9 6 6 6-6" />
      </ChevronBtn>
      <span />
    </div>
  );
}
