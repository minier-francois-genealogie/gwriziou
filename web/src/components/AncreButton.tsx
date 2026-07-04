interface AncreButtonProps {
  active: boolean;
  onAncre: () => void;
  size?: "sm" | "md";
  className?: string;
}

const SIZE = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
} as const;

const ICON = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
} as const;

/** Interrupteur ancre : gris (off) ou noir (on). Clic actif = noop. */
export function AncreButton({
  active,
  onAncre,
  size = "sm",
  className = "",
}: AncreButtonProps) {
  return (
    <span className={`group/ancre relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        aria-label={active ? "Ancre actuelle" : "Ancrer l'arbre sur cette personne"}
        aria-pressed={active}
        disabled={active}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!active) onAncre();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`inline-flex ${SIZE[size]} items-center justify-center rounded-md border transition ${
          active
            ? "cursor-default border-slate-800 bg-slate-900 text-white"
            : "border-slate-300 bg-slate-100 text-slate-400 hover:border-slate-400 hover:bg-slate-200 hover:text-slate-600"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={ICON[size]}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="3" />
          <path d="M12 22V8" />
          <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-50 mb-1 hidden min-w-[140px] rounded-md bg-slate-800 px-2 py-1 text-left text-[10px] font-normal text-white shadow-md group-hover/ancre:block"
      >
        {active ? "Ancre actuelle de l'arbre" : "Ancrer l'arbre ici"}
      </span>
    </span>
  );
}
