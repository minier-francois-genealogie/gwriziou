type LoadingSpinnerProps = {
  /** fill : occupe le conteneur · inline : spinner seul · overlay : couvre le parent positionné */
  variant?: "fill" | "inline" | "overlay";
  className?: string;
};

export function LoadingSpinner({
  variant = "fill",
  className = "",
}: LoadingSpinnerProps) {
  const wrapClass =
    variant === "fill"
      ? "flex min-h-0 flex-1 items-center justify-center"
      : variant === "overlay"
        ? "absolute inset-0 z-20 flex items-center justify-center bg-slate-100/75"
        : "flex items-center justify-center";

  const sizeClass =
    variant === "inline" ? "h-7 w-7 border-2" : "h-10 w-10 border-[3px]";

  return (
    <div
      className={`${wrapClass} ${className}`.trim()}
      role="status"
      aria-label="Chargement"
    >
      <div
        className={`${sizeClass} animate-spin rounded-full border-slate-200 border-t-sky-600`}
      />
    </div>
  );
}
