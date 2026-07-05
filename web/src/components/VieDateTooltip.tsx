/** Tooltip pour une date estimée (rouge) — règle de calcul au survol. */
export function VieDateTooltip({
  tooltip,
  children,
  className = "",
}: {
  tooltip: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  if (!tooltip) return <>{children}</>;

  return (
    <span
      className={`group/viedate relative inline-flex max-w-full cursor-help ${className}`}
      title={tooltip}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-[200] mt-0.5 hidden min-w-[10rem] max-w-[18rem] whitespace-normal rounded-md bg-slate-800 px-2 py-1 text-left text-[10px] font-normal leading-snug text-white shadow-lg group-hover/viedate:block group-focus-within/viedate:block"
      >
        {tooltip}
      </span>
    </span>
  );
}
