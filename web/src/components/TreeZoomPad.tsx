interface TreeZoomPadProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
}

function ZoomBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-50 active:bg-slate-100"
    >
      {children}
    </button>
  );
}

export function TreeZoomPad({ onZoomIn, onZoomOut, onFitAll }: TreeZoomPadProps) {
  return (
    <div
      className="pointer-events-auto flex flex-col gap-1"
      role="group"
      aria-label="Zoom de l'arbre"
    >
      <ZoomBtn label="Zoom avant" onClick={onZoomIn}>
        <span className="text-base font-medium leading-none">+</span>
      </ZoomBtn>
      <ZoomBtn label="Zoom arrière" onClick={onZoomOut}>
        <span className="text-base font-medium leading-none">−</span>
      </ZoomBtn>
      <ZoomBtn label="Tout voir" onClick={onFitAll}>
        <span className="text-xs leading-none">⊡</span>
      </ZoomBtn>
    </div>
  );
}
