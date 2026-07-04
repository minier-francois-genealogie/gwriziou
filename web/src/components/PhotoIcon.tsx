function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function photoTooltip(hasPhotos: boolean, count?: number): string {
  if (!hasPhotos) return "Aucune photo";
  if (count === 1) return "1 photo";
  if (count != null && count > 1) return `${count} photos`;
  return "Photo(s) disponible(s)";
}

interface PhotoIconProps {
  hasPhotos: boolean;
  photoCount?: number;
  onClick?: () => void;
  size?: "xs" | "sm";
  className?: string;
}

export function PhotoIcon({
  hasPhotos,
  photoCount,
  onClick,
  size = "sm",
  className = "",
}: PhotoIconProps) {
  const dim = size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4";
  const tooltip = photoTooltip(hasPhotos, photoCount);
  const color = hasPhotos ? "text-slate-900" : "text-slate-400";

  return (
    <span className={`group/photo relative inline-flex shrink-0 justify-center ${className}`}>
      <button
        type="button"
        aria-disabled={!hasPhotos}
        aria-label={tooltip}
        onClick={(e) => {
          e.stopPropagation();
          if (!hasPhotos || !onClick) return;
          onClick();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className={`inline-flex items-center justify-center rounded-full transition-colors ${dim} ${color} ${
          hasPhotos ? "hover:bg-slate-100" : "cursor-default"
        }`}
      >
        <CameraIcon className={dim} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] text-white shadow-md group-hover/photo:block"
      >
        {tooltip}
      </span>
    </span>
  );
}
