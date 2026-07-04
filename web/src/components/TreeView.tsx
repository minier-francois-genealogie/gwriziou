import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import type { ArbreResponse } from "../types/api";
import { useSvgViewport } from "../hooks/useSvgViewport";
import { layoutTree } from "../utils/treeLayout";
import { PersonNode } from "./PersonNode";
import { UnionNode } from "./UnionNode";

export interface TreeViewHandle {
  recenterOn: (nodeId: string) => void;
  panTo: (nodeId: string) => void;
  fitAll: () => void;
}

interface TreeViewProps {
  arbre: ArbreResponse;
  focusId: string;
  ancreId: string;
  onFocus: (id: string) => void;
  onAncre: (id: string) => void;
  onActeClick: (type: "naissance" | "mariage" | "deces", url: string, label?: string) => void;
  onPhotoClick: (id: string, nom: string, prenoms: string | null) => void;
}

export const TreeView = forwardRef<TreeViewHandle, TreeViewProps>(function TreeView(
  { arbre, focusId, ancreId, onFocus, onAncre, onActeClick, onPhotoClick },
  ref,
) {
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

  const nodeMap = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes],
  );

  const {
    containerRef,
    viewBoxString,
    recenterOn: panRecenterWithZoom,
    panTo: panRecenter,
    fitAll,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useSvgViewport({
    contentWidth: layout.width,
    contentHeight: layout.height,
  });

  const recenterOnNode = useCallback(
    (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      panRecenterWithZoom(node.x, node.y);
    },
    [nodeMap, panRecenterWithZoom],
  );

  const panToNode = useCallback(
    (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      panRecenter(node.x, node.y);
    },
    [nodeMap, panRecenter],
  );

  useImperativeHandle(ref, () => ({
    recenterOn: recenterOnNode,
    panTo: panToNode,
    fitAll,
  }));

  const handleParentsRefClick = useCallback((parentIds: string[]) => {
    setHighlightIds(new Set(parentIds));
    window.setTimeout(() => setHighlightIds(new Set()), 2500);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={containerRef}
        className="min-h-0 flex-1 touch-none overflow-hidden bg-slate-50/80"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          viewBox={viewBoxString}
          className="h-full w-full"
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
                focused={node.id === focusId}
                isAncre={node.id === ancreId}
                highlighted={highlightIds.has(node.id)}
                parentsAilleurs={node.parentsAilleurs}
                onFocus={onFocus}
                onAncre={onAncre}
                onActeClick={onActeClick}
                onPhotoClick={onPhotoClick}
                onParentsRefClick={handleParentsRefClick}
              />
            ))}
          </g>
        </svg>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 flex gap-1">
        <button
          type="button"
          onClick={fitAll}
          className="pointer-events-auto rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-xs text-slate-600 shadow-sm backdrop-blur"
          title="Tout voir"
        >
          ⊡
        </button>
      </div>
    </div>
  );
});
