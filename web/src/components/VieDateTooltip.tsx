import type { ReactNode } from "react";
import { FloatingTooltip } from "./FloatingTooltip";

/** Tooltip pour une date estimée (rouge) — règle de calcul au survol. */
export function VieDateTooltip({
  tooltip,
  children,
  className = "",
}: {
  tooltip: string | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  if (!tooltip) return <>{children}</>;

  return (
    <FloatingTooltip
      content={tooltip}
      className={`max-w-full cursor-help ${className}`}
      maxWidth={288}
      multiline
    >
      <span tabIndex={0} className="inline-flex max-w-full">
        {children}
      </span>
    </FloatingTooltip>
  );
}
