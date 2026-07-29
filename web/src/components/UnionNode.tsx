import type { NoeudUnion } from "../types/api";
import { GlyphIcon } from "./GlyphIcon";

const UNION_R = 18;
/** Couleur des traits de filiation et contour des unions sur l'arbre. */
export const TREE_BRANCH_STROKE = "#94a3b8";

interface UnionNodeProps {
  union: NoeudUnion;
  x: number;
  y: number;
  radius?: number;
  onActeClick?: (url: string) => void;
}

export function UnionNode({ union, x, y, radius = UNION_R, onActeClick }: UnionNodeProps) {
  const title = [union.date ?? union.date_brute, union.lieu].filter(Boolean).join(" — ");
  const canOpen = union.acte_m && union.acte?.url && onActeClick;
  const iconPx = radius >= 16 ? 16 : 12;
  const glyphSize = radius >= 16 ? "lg" : "sm";

  return (
    <g
      transform={`translate(${x}, ${y})`}
      role="img"
      aria-label={`Union${title ? ` : ${title}` : ""}`}
      className={canOpen ? "cursor-pointer" : undefined}
      onClick={
        canOpen
          ? (e) => {
              e.stopPropagation();
              onActeClick!(union.acte!.url);
            }
          : undefined
      }
    >
      <title>{title || "Mariage"}</title>
      <circle
        cx={0}
        cy={0}
        r={radius}
        className={union.acte_m ? "fill-amber-500" : "fill-icon-absent-bg"}
        stroke={TREE_BRANCH_STROKE}
        strokeWidth={1}
      />
      <foreignObject
        x={-iconPx / 2}
        y={-iconPx / 2}
        width={iconPx}
        height={iconPx}
        className="pointer-events-none overflow-visible"
      >
        <div
          className={`flex h-full w-full items-center justify-center ${
            union.acte_m ? "text-white" : "text-icon-absent"
          }`}
        >
          <GlyphIcon name="mariage" size={glyphSize} />
        </div>
      </foreignObject>
    </g>
  );
}

export { UNION_R };
