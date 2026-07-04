import type { NoeudUnion } from "../types/api";
import { EvenementIconG } from "./GenealogyIcons";

const UNION_R = 18;

interface UnionNodeProps {
  union: NoeudUnion;
  x: number;
  y: number;
  onActeClick?: (url: string) => void;
}

export function UnionNode({ union, x, y, onActeClick }: UnionNodeProps) {
  const title = [union.date ?? union.date_brute, union.lieu].filter(Boolean).join(" — ");
  const canOpen = union.acte_m && union.acte?.url && onActeClick;

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
        r={UNION_R}
        className={union.acte_m ? "fill-amber-500" : "fill-icon-absent-bg"}
      />
      <EvenementIconG
        type="mariage"
        size={16}
        className={union.acte_m ? "text-white" : "text-icon-absent"}
      />
    </g>
  );
}

export { UNION_R };
