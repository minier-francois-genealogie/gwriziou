import type { FaitHistoriqueLigne } from "../types/api";

export interface LieuTreeNode {
  id: string;
  label: string;
  depth: number;
  children: LieuTreeNode[];
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function slugPart(value: string): string {
  return normalizeSearchText(value.trim())
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

function nodeId(segments: string[]): string {
  return segments.map(slugPart).join("/");
}

/** Chemins hiérarchiques : Monde → France → Région → Département → Commune. */
export function getRowLieuPathIds(row: FaitHistoriqueLigne): string[] {
  const paths: string[] = ["monde"];
  if (row.niveau === "MONDE") {
    return paths;
  }

  paths.push("monde/france");
  if (row.niveau === "NATIONAL") {
    return paths;
  }

  const region = row.region?.trim();
  const departement = row.departement?.trim();
  const commune = row.commune?.trim();

  if (region) {
    paths.push(nodeId(["monde", "france", region]));
  }
  if (region && departement) {
    paths.push(nodeId(["monde", "france", region, departement]));
  }
  if (region && departement && commune) {
    paths.push(nodeId(["monde", "france", region, departement, commune]));
  }

  return paths;
}

/** Nœud géographique le plus spécifique associé à la ligne. */
export function getRowLeafLieuId(row: FaitHistoriqueLigne): string {
  const paths = getRowLieuPathIds(row);
  return paths[paths.length - 1]!;
}

export function buildLieuTree(lignes: FaitHistoriqueLigne[]): LieuTreeNode[] {
  const nodeMap = new Map<string, LieuTreeNode>();

  function ensureNode(id: string, label: string, depth: number): LieuTreeNode {
    let node = nodeMap.get(id);
    if (!node) {
      node = { id, label, depth, children: [] };
      nodeMap.set(id, node);
    }
    return node;
  }

  function linkChild(parentId: string, childId: string) {
    const parent = nodeMap.get(parentId);
    const child = nodeMap.get(childId);
    if (parent && child && !parent.children.some((c) => c.id === childId)) {
      parent.children.push(child);
    }
  }

  ensureNode("monde", "Monde", 0);

  for (const row of lignes) {
    if (row.niveau === "MONDE") {
      continue;
    }

    ensureNode("monde/france", "France", 1);
    linkChild("monde", "monde/france");

    if (row.niveau === "NATIONAL") {
      continue;
    }

    const region = row.region?.trim();
    const departement = row.departement?.trim();
    const commune = row.commune?.trim();
    if (!region) continue;

    const regionNodeId = nodeId(["monde", "france", region]);
    ensureNode(regionNodeId, region, 2);
    linkChild("monde/france", regionNodeId);

    if (departement) {
      const deptNodeId = nodeId(["monde", "france", region, departement]);
      ensureNode(deptNodeId, departement, 3);
      linkChild(regionNodeId, deptNodeId);

      if (commune) {
        const communeNodeId = nodeId(["monde", "france", region, departement, commune]);
        ensureNode(communeNodeId, commune, 4);
        linkChild(deptNodeId, communeNodeId);
      }
    }
  }

  const monde = nodeMap.get("monde");
  if (!monde) return [];

  const sortNodes = (list: LieuTreeNode[]) => {
    list.sort((a, b) => a.label.localeCompare(b.label, "fr"));
    list.forEach((n) => sortNodes(n.children));
  };
  sortNodes(monde.children);
  return [monde];
}

export function collectAllNodeIds(nodes: LieuTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (node: LieuTreeNode) => {
    ids.push(node.id);
    node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return ids;
}

export function toggleLieuNodeSelection(
  selected: readonly string[],
  nodeIdToToggle: string,
  checked: boolean,
): string[] {
  const next = new Set(selected);
  if (checked) next.add(nodeIdToToggle);
  else next.delete(nodeIdToToggle);
  return [...next];
}

export function rowMatchesLieuSelection(
  row: FaitHistoriqueLigne,
  selected: ReadonlySet<string>,
): boolean {
  if (selected.size === 0) return false;
  // Chaque ligne n'est visible que si son nœud géographique propre est coché
  // (ex. Morbihan seul → faits départementaux, pas les communes du 56).
  return selected.has(getRowLeafLieuId(row));
}

export function lieuSelectionSummary(
  selectedCount: number,
  totalCount: number,
): string {
  if (selectedCount === 0) return "Aucun";
  if (selectedCount >= totalCount) return "Tous";
  return `${selectedCount} sélectionné${selectedCount > 1 ? "s" : ""}`;
}

export function nodeCheckState(
  node: LieuTreeNode,
  selected: ReadonlySet<string>,
): "checked" | "unchecked" {
  return selected.has(node.id) ? "checked" : "unchecked";
}
