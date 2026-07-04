import type { AreteArbre, NoeudArbre } from "../types/api";
import type { TreeLayout } from "./treeLayout";

export type TreeNavDirection = "up" | "down" | "left" | "right";

function buildRelationMaps(aretes: AreteArbre[]) {
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const unionParents = new Map<string, string[]>();
  const unionChildren = new Map<string, string[]>();

  for (const { de, vers, type } of aretes) {
    if (type === "union_epoux") {
      if (!unionParents.has(vers)) unionParents.set(vers, []);
      if (!unionParents.get(vers)!.includes(de)) unionParents.get(vers)!.push(de);
    } else if (type === "union_enfant") {
      if (!unionChildren.has(de)) unionChildren.set(de, []);
      if (!unionChildren.get(de)!.includes(vers)) unionChildren.get(de)!.push(vers);
    }
  }

  for (const [idFamille, par] of unionParents) {
    const kids = unionChildren.get(idFamille) ?? [];
    for (const kid of kids) {
      if (!parents.has(kid)) parents.set(kid, []);
      for (const pid of par) {
        if (!parents.get(kid)!.includes(pid)) parents.get(kid)!.push(pid);
      }
    }
    for (const pid of par) {
      if (!children.has(pid)) children.set(pid, []);
      for (const kid of kids) {
        if (!children.get(pid)!.includes(kid)) children.get(pid)!.push(kid);
      }
    }
  }

  return { parents, children };
}

function sexeRank(sexe: string | null | undefined): number {
  if (sexe === "M") return 0;
  if (sexe === "F") return 1;
  return 2;
}

function sortChildren(ids: string[], byId: Map<string, NoeudArbre>): string[] {
  return [...ids].sort((a, b) => {
    const da = byId.get(a)?.naissance_tri;
    const db = byId.get(b)?.naissance_tri;
    if (da && db && da !== db) return da.localeCompare(db);
    if (da && !db) return -1;
    if (!da && db) return 1;
    return a.localeCompare(b);
  });
}

export interface TreeNavIndex {
  graphIds: ReadonlySet<string>;
  canMove: (id: string, direction: TreeNavDirection) => boolean;
  move: (id: string, direction: TreeNavDirection) => string | null;
}

export function buildTreeNavIndex(
  layout: TreeLayout,
  aretes: AreteArbre[],
  noeuds: NoeudArbre[],
): TreeNavIndex {
  const byId = new Map(noeuds.map((n) => [n.id_gedcom, n]));
  const graphIds = new Set(layout.nodes.map((n) => n.id));
  const { parents, children } = buildRelationMaps(aretes);

  const rowByGen = new Map<number, string[]>();
  for (const node of layout.nodes) {
    const gen = node.generation;
    if (!rowByGen.has(gen)) rowByGen.set(gen, []);
    rowByGen.get(gen)!.push(node.id);
  }
  for (const ids of rowByGen.values()) {
    ids.sort((a, b) => {
      const na = layout.nodes.find((n) => n.id === a);
      const nb = layout.nodes.find((n) => n.id === b);
      return (na?.x ?? 0) - (nb?.x ?? 0);
    });
  }

  const pickParent = (id: string): string | null => {
    const par = (parents.get(id) ?? []).filter((pid) => graphIds.has(pid));
    if (par.length === 0) return null;
    par.sort((a, b) => sexeRank(byId.get(a)?.sexe) - sexeRank(byId.get(b)?.sexe));
    return par[0] ?? null;
  };

  const pickChild = (id: string): string | null => {
    const kids = sortChildren(
      (children.get(id) ?? []).filter((cid) => graphIds.has(cid)),
      byId,
    );
    return kids[0] ?? null;
  };

  const rowIndex = (id: string): { row: string[]; index: number } | null => {
    const node = layout.nodes.find((n) => n.id === id);
    if (!node) return null;
    const row = rowByGen.get(node.generation) ?? [];
    const index = row.indexOf(id);
    if (index < 0) return null;
    return { row, index };
  };

  const canMove = (id: string, direction: TreeNavDirection): boolean => {
    if (!graphIds.has(id)) return false;
    switch (direction) {
      case "up":
        return pickParent(id) != null;
      case "down":
        return pickChild(id) != null;
      case "left": {
        const ri = rowIndex(id);
        return ri != null && ri.index > 0;
      }
      case "right": {
        const ri = rowIndex(id);
        return ri != null && ri.index < ri.row.length - 1;
      }
    }
  };

  const move = (id: string, direction: TreeNavDirection): string | null => {
    if (!canMove(id, direction)) return null;
    switch (direction) {
      case "up":
        return pickParent(id);
      case "down":
        return pickChild(id);
      case "left": {
        const ri = rowIndex(id)!;
        return ri.row[ri.index - 1] ?? null;
      }
      case "right": {
        const ri = rowIndex(id)!;
        return ri.row[ri.index + 1] ?? null;
      }
    }
  };

  return { graphIds, canMove, move };
}
