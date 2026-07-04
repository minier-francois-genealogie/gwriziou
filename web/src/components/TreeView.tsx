import { useCallback, useMemo, useState } from "react";
import type { ArbreResponse } from "../types/api";
import { layoutTree } from "../utils/treeLayout";
import { PersonNode } from "./PersonNode";
import { UnionNode } from "./UnionNode";

interface TreeViewProps {
  arbre: ArbreResponse;
  selectedId: string;
  onSelect: (id: string) => void;
  onActeClick: (type: "naissance" | "mariage" | "deces", url: string, label?: string) => void;
}

export function TreeView({
  arbre,
  selectedId,
  onSelect,
  onActeClick,
}: TreeViewProps) {
  const [highlightIds, setHighlightIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const layout = useMemo(
    () =>
      layoutTree(
        arbre.centre,
        arbre.noeuds,
        arbre.unions ?? [],
        arbre.aretes,
        arbre.ancetres,
        arbre.descendants,
      ),
    [arbre],
  );

  const handleParentsRefClick = useCallback((parentIds: string[]) => {
    setHighlightIds(new Set(parentIds));
    window.setTimeout(() => setHighlightIds(new Set()), 2500);
  }, []);

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-50/80">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="min-h-[280px] w-full"
        role="img"
        aria-label="Arbre généalogique"
      >
        <g>
          {layout.edges.map((edge, i) => (
            <path
              key={i}
              d={edge.points
                .map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                .join(" ")}
              fill="none"
              stroke={
                edge.kind === "conjoint"
                  ? "#d97706"
                  : edge.kind === "union_epoux"
                    ? "#64748b"
                    : edge.kind === "parents_ref_stub"
                      ? "#8b5cf6"
                      : "#94a3b8"
              }
              strokeWidth={edge.kind === "parents_ref_stub" ? 1.5 : 2}
              strokeDasharray={
                edge.kind === "conjoint"
                  ? "5 4"
                  : edge.kind === "parents_ref_stub"
                    ? "3 3"
                    : undefined
              }
            />
          ))}
        </g>
        <g>
          {layout.unions.map((u) => {
            const unionLabel =
              [u.union.date ?? u.union.date_brute, u.union.lieu]
                .filter(Boolean)
                .join(" — ") || "Mariage";
            return (
              <UnionNode
                key={u.union.id_famille}
                union={u.union}
                x={u.x}
                y={u.y}
                onActeClick={
                  u.union.acte?.url
                    ? (url) => onActeClick("mariage", url, unionLabel)
                    : undefined
                }
              />
            );
          })}
        </g>
        <g>
          {layout.nodes.map((node) => (
            <PersonNode
              key={node.id}
              noeud={node.noeud}
              x={node.x}
              y={node.y}
              selected={node.id === selectedId}
              highlighted={highlightIds.has(node.id)}
              parentsAilleurs={node.parentsAilleurs}
              onSelect={onSelect}
              onActeClick={onActeClick}
              onParentsRefClick={handleParentsRefClick}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
