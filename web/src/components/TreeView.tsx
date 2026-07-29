import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import type { ArbreResponse } from "../types/api";
import { useSvgViewport } from "../hooks/useSvgViewport";
import { layoutTree, type TreeViewMode } from "../utils/treeLayout";
import { getTreeLayoutMetrics } from "../utils/treeLayoutMetrics";
import { PersonNode } from "./PersonNode";
import { UnionNode, TREE_BRANCH_STROKE } from "./UnionNode";

export interface TreeViewHandle {
  recenterOn: (nodeId: string) => void;
  panTo: (nodeId: string) => void;
  fitAll: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface TreeViewProps {
  arbre: ArbreResponse;
  focusId: string;
  ancreId: string;
  viewMode?: TreeViewMode;
  onFocus: (id: string) => void;
  onAncre: (id: string) => void;
  onActeClick: (type: "naissance" | "mariage" | "deces", url: string, label?: string) => void;
  onPhotoClick: (id: string, nom: string, prenoms: string | null) => void;
  onNoteClick?: (chemin: string | null, nom: string, prenoms: string | null) => void;
  hasNotes?: (chemin: string | null | undefined) => boolean;
  isChecked?: (chemin: string | null | undefined) => boolean;
  isCheckedPending?: (chemin: string | null | undefined) => boolean;
  onToggleChecked?: (chemin: string, next: boolean) => void;
  onAvatarEdit?: (id: string, nom: string, prenoms: string | null) => void;
}

export const TreeView = forwardRef<TreeViewHandle, TreeViewProps>(function TreeView(
  {
    arbre,
    focusId,
    ancreId,
    viewMode = "detail",
    onFocus,
    onAncre,
    onActeClick,
    onPhotoClick,
    onNoteClick,
    hasNotes,
    isChecked,
    isCheckedPending,
    onToggleChecked,
    onAvatarEdit,
  },
  ref,
) {
  const metrics = getTreeLayoutMetrics(viewMode);
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
        viewMode,
      ),
    [arbre, viewMode],
  );

  const nodeMap = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes],
  );

  const {
    containerRef,
    svgTransform,
    recenterOn: panRecenterWithZoom,
    panTo: panRecenter,
    fitAll,
    zoomIn,
    zoomOut,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isPanning,
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
    zoomIn,
    zoomOut,
  }));

  const handleParentsRefClick = useCallback((parentIds: string[]) => {
    setHighlightIds(new Set(parentIds));
    window.setTimeout(() => setHighlightIds(new Set()), 2500);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={containerRef}
        className={`min-h-0 flex-1 touch-none overscroll-none overflow-hidden bg-slate-50/80 ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/*
          Conteneur unique transformé : SVG (traits/unions) + HTML (cellules).
          Évite foreignObject (clics cassés sous CSS transform / Safari iOS).
        */}
        <div
          className="relative"
          style={{
            width: layout.width,
            height: layout.height,
            transform: svgTransform,
            transformOrigin: "0 0",
            willChange: isPanning ? "transform" : undefined,
          }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className={`absolute inset-0 block ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
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
                      : edge.kind === "parents_ref_stub"
                        ? "#8b5cf6"
                        : TREE_BRANCH_STROKE
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
                    radius={metrics.unionR}
                    onActeClick={
                      u.union.acte?.url
                        ? (url) => onActeClick("mariage", url, unionLabel)
                        : undefined
                    }
                  />
                );
              })}
            </g>
          </svg>
          <div
            className="absolute inset-0"
            style={{ width: layout.width, height: layout.height }}
          >
            {layout.nodes.map((node) => (
              <PersonNode
                key={node.id}
                noeud={node.noeud}
                x={node.x}
                y={node.y}
                focused={node.id === focusId}
                isAncre={node.id === ancreId}
                highlighted={highlightIds.has(node.id)}
                viewMode={viewMode}
                parentsAilleurs={node.parentsAilleurs}
                onFocus={onFocus}
                onAncre={onAncre}
                onActeClick={onActeClick}
                onPhotoClick={onPhotoClick}
                onNoteClick={onNoteClick}
                hasNotes={hasNotes?.(node.noeud.chemin_dossier)}
                isChecked={isChecked?.(node.noeud.chemin_dossier)}
                checkedPending={isCheckedPending?.(node.noeud.chemin_dossier)}
                onToggleChecked={onToggleChecked}
                onAvatarEdit={onAvatarEdit}
                onParentsRefClick={handleParentsRefClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
