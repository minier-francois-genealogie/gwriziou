import type { AreteArbre, NoeudArbre, NoeudUnion } from "../types/api";
import { formatNomArbre } from "./format";
import { UNION_R } from "../components/UnionNode";

export interface ParentsAilleursRef {
  unionId: string;
  parentIds: string[];
  label: string;
}

export interface TreeLayoutNode {
  id: string;
  noeud: NoeudArbre;
  generation: number;
  x: number;
  y: number;
  parentsAilleurs?: ParentsAilleursRef;
}

export interface TreeLayoutUnion {
  union: NoeudUnion;
  x: number;
  y: number;
}

export interface TreeLayoutEdge {
  points: { x: number; y: number }[];
  kind?: "union_descendant" | "union_epoux" | "conjoint" | "parents_ref_stub";
}

function edgeLine(
  kind: TreeLayoutEdge["kind"],
  ...points: { x: number; y: number }[]
): TreeLayoutEdge {
  return { kind, points };
}

export interface TreeLayout {
  nodes: TreeLayoutNode[];
  unions: TreeLayoutUnion[];
  edges: TreeLayoutEdge[];
  width: number;
  height: number;
}

const NODE_W = 176;
const NODE_H = 112;
/** Descente verticale sous l'icône union avant la ramification vers les enfants. */
const UNION_DESC_STEM = NODE_H / 2;
const GAP_X = 24;
const GAP_Y = 56;
/** Au-delà, filiation abrégée (parents déjà affichés ailleurs). */
const DISTANT_FILIATION_PX = (NODE_W + GAP_X) * 1.5;
const PARENTS_REF_STUB = 22;
/** Espace vertical réservé au-dessus d'un nœud avec icône ↩ (voir PersonNode). */
const REF_BADGE_ROW_GAP = 26;
const COLUMN_MIN_GAP = 1;

function parentLabel(ids: string[], byId: Map<string, NoeudArbre>): string {
  return ids
    .map((id) => {
      const n = byId.get(id);
      return n ? formatNomArbre(n.nom, n.prenoms) : id;
    })
    .join(" · ");
}

function isDistantFiliation(unionX: number, childX: number): boolean {
  return Math.abs(childX - unionX) > DISTANT_FILIATION_PX;
}

/** Évite deux personnes sur la même colonne logique (ex. branche déportée + CHARUEL). */
function resolveColumnCollisions(
  positions: Map<string, number>,
  generations: Map<string, number>,
): void {
  const byGen = new Map<number, string[]>();
  for (const [id, gen] of generations) {
    if (!positions.has(id)) continue;
    if (!byGen.has(gen)) byGen.set(gen, []);
    byGen.get(gen)!.push(id);
  }
  for (const ids of byGen.values()) {
    ids.sort((a, b) => (positions.get(a) ?? 0) - (positions.get(b) ?? 0));
    for (let i = 1; i < ids.length; i++) {
      const prevX = positions.get(ids[i - 1]!)!;
      const currId = ids[i]!;
      const currX = positions.get(currId)!;
      if (currX < prevX + COLUMN_MIN_GAP) {
        positions.set(currId, prevX + COLUMN_MIN_GAP);
      }
    }
  }
}

function generationY(
  gen: number,
  minGen: number,
  refBadgeExtra: number,
): number {
  return (gen - minGen) * (NODE_H + GAP_Y) + NODE_H / 2 + refBadgeExtra;
}

/** Décale vers le bas les rangées qui contiennent une icône ↩ (badge au-dessus de la cellule). */
function refBadgeExtraBeforeGen(
  nodes: TreeLayoutNode[],
  minGen: number,
): Map<number, number> {
  const rowHasRef = new Set<number>();
  for (const n of nodes) {
    if (n.parentsAilleurs) rowHasRef.add(n.generation);
  }
  const extra = new Map<number, number>();
  let cumulative = 0;
  for (let g = minGen; g <= Math.max(...nodes.map((n) => n.generation), 0); g++) {
    if (g > minGen && rowHasRef.has(g)) {
      cumulative += REF_BADGE_ROW_GAP;
    }
    extra.set(g, cumulative);
  }
  return extra;
}

/** Homme (M) à gauche, femme (F) à droite. */
function sexeRank(sexe: string | null | undefined): number {
  return sexe === "M" ? 0 : sexe === "F" ? 1 : 2;
}

function sortParents(ids: string[], byId: Map<string, NoeudArbre>): string[] {
  return [...ids].sort((a, b) => {
    const d = sexeRank(byId.get(a)?.sexe) - sexeRank(byId.get(b)?.sexe);
    return d !== 0 ? d : a.localeCompare(b);
  });
}

function sortSpouses(
  _personId: string,
  ids: string[],
  byId: Map<string, NoeudArbre>,
): string[] {
  return [...ids].sort((a, b) => {
    const d = sexeRank(byId.get(a)?.sexe) - sexeRank(byId.get(b)?.sexe);
    return d !== 0 ? d : a.localeCompare(b);
  });
}

function spouseIdsFor(
  id: string,
  spouses: Map<string, string[]>,
  generations: Map<string, number>,
  gen: number,
  byId: Map<string, NoeudArbre>,
): string[] {
  return sortSpouses(
    id,
    (spouses.get(id) ?? []).filter((sid) => {
      const g = generations.get(sid);
      return g === undefined || g === gen;
    }),
    byId,
  );
}

/** Largeur en colonnes : personne (1) + conjoint(s). */
function coupleBlockWidth(
  id: string,
  gen: number,
  spouses: Map<string, string[]>,
  generations: Map<string, number>,
  byId: Map<string, NoeudArbre>,
): number {
  if (gen < 0) return 1;
  return 1 + spouseIdsFor(id, spouses, generations, gen, byId).length;
}

/** Place personne + conjoint(s) dans un bloc [coupleLeft, coupleLeft + width). */
function placeCouple(
  id: string,
  coupleLeft: number,
  gen: number,
  positions: Map<string, number>,
  generations: Map<string, number>,
  spouses: Map<string, string[]>,
  byId: Map<string, NoeudArbre>,
): number {
  const spouseList = gen >= 0 ? spouseIdsFor(id, spouses, generations, gen, byId) : [];
  positions.set(id, coupleLeft + 0.5);
  for (let i = 0; i < spouseList.length; i++) {
    const sid = spouseList[i]!;
    if (!positions.has(sid)) {
      generations.set(sid, gen);
      positions.set(sid, coupleLeft + 1.5 + i);
    }
  }
  return 1 + spouseList.length;
}

/** Enfants triés par date de naissance (plus ancien à gauche). */
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

function buildMaps(_centre: string, aretes: AreteArbre[]) {
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const spouses = new Map<string, string[]>();
  const unionParents = new Map<string, string[]>();
  const unionChildren = new Map<string, string[]>();

  for (const { de, vers, type } of aretes) {
    if (type === "union_epoux") {
      if (!unionParents.has(vers)) unionParents.set(vers, []);
      if (!unionParents.get(vers)!.includes(de)) unionParents.get(vers)!.push(de);
    } else if (type === "union_enfant") {
      if (!unionChildren.has(de)) unionChildren.set(de, []);
      if (!unionChildren.get(de)!.includes(vers)) unionChildren.get(de)!.push(vers);
    } else if (type === "conjoint") {
      if (!spouses.has(de)) spouses.set(de, []);
      if (!spouses.get(de)!.includes(vers)) spouses.get(de)!.push(vers);
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

  return { parents, children, spouses, unionParents, unionChildren };
}

function unionAnchorX(
  personId: string,
  unionParents: Map<string, string[]>,
  positions: Map<string, number>,
): number | null {
  for (const [, par] of unionParents) {
    if (!par.includes(personId)) continue;
    const xs = par
      .map((p) => positions.get(p))
      .filter((x): x is number => x !== undefined);
    if (xs.length > 0) return xs.reduce((a, b) => a + b, 0) / xs.length;
  }
  return null;
}

function placeUnionNodes(
  unionParents: Map<string, string[]>,
  unionData: Map<string, NoeudUnion>,
  positions: Map<string, number>,
  generations: Map<string, number>,
): TreeLayoutUnion[] {
  const result: TreeLayoutUnion[] = [];
  for (const [idFamille, par] of unionParents) {
    const union = unionData.get(idFamille);
    if (!union) continue;
    const xs = par.map((p) => positions.get(p)).filter((x): x is number => x !== undefined);
    if (xs.length === 0) continue;
    const unionX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const unionGen = generations.get(par[0]!) ?? -1;
    positions.set(idFamille, unionX);
    generations.set(idFamille, unionGen);
    result.push({ union, x: 0, y: 0 });
  }
  return result;
}

/** Fratrie + nœud courant, triés par date de naissance. */
function gen0RowIds(
  centre: string,
  parents: Map<string, string[]>,
  children: Map<string, string[]>,
  generations: Map<string, number>,
  byId: Map<string, NoeudArbre>,
): string[] {
  const centreGen = generations.get(centre) ?? 0;
  const row = new Set<string>([centre]);
  for (const pid of parents.get(centre) ?? []) {
    if (generations.get(pid) !== centreGen - 1) continue;
    for (const cid of children.get(pid) ?? []) {
      generations.set(cid, centreGen);
      row.add(cid);
    }
  }
  return sortChildren([...row], byId);
}

function rowBlockWidth(
  rowIds: string[],
  gen: number,
  spouses: Map<string, string[]>,
  generations: Map<string, number>,
  byId: Map<string, NoeudArbre>,
): number {
  return rowIds.reduce(
    (sum, id) => sum + coupleBlockWidth(id, gen, spouses, generations, byId),
    0,
  );
}

function placeGen0Row(
  rowIds: string[],
  rowLeft: number,
  positions: Map<string, number>,
  generations: Map<string, number>,
  spouses: Map<string, string[]>,
  byId: Map<string, NoeudArbre>,
): number {
  let cursor = rowLeft;
  for (const id of rowIds) {
    const w = placeCouple(id, cursor, 0, positions, generations, spouses, byId);
    cursor += w;
  }
  return cursor;
}

function assignGenerations(
  centre: string,
  parents: Map<string, string[]>,
  children: Map<string, string[]>,
  unionChildren: Map<string, string[]>,
  _spouses: Map<string, string[]>,
  aretes: AreteArbre[],
  maxAncestors: number,
  maxDescendants: number,
): Map<string, number> {
  const generations = new Map<string, number>();
  generations.set(centre, 0);

  const upQueue: Array<{ id: string; gen: number }> = [{ id: centre, gen: 0 }];
  while (upQueue.length) {
    const { id, gen } = upQueue.shift()!;
    if (Math.abs(gen) >= maxAncestors) continue;
    for (const parentId of parents.get(id) ?? []) {
      const nextGen = gen - 1;
      if (!generations.has(parentId) || (generations.get(parentId) ?? 0) > nextGen) {
        generations.set(parentId, nextGen);
        upQueue.push({ id: parentId, gen: nextGen });
      }
    }
  }

  const downQueue: Array<{ id: string; gen: number }> = [{ id: centre, gen: 0 }];
  while (downQueue.length) {
    const { id, gen } = downQueue.shift()!;
    if (gen >= maxDescendants) continue;
    for (const childId of children.get(id) ?? []) {
      const nextGen = gen + 1;
      if (!generations.has(childId) || (generations.get(childId) ?? 0) < nextGen) {
        generations.set(childId, nextGen);
        downQueue.push({ id: childId, gen: nextGen });
      }
    }
  }

  for (const { de, vers, type } of aretes) {
    if (type !== "conjoint") continue;
    const partnerGen = generations.get(de);
    if (partnerGen !== undefined && !generations.has(vers)) {
      generations.set(vers, partnerGen);
    }
  }

  // Fratrie via unions (même génération que le nœud courant)
  const centreGen = generations.get(centre) ?? 0;
  for (const [, kids] of unionChildren) {
    if (!kids.includes(centre)) continue;
    for (const cid of kids) generations.set(cid, centreGen);
  }

  return generations;
}

function subtreeWidth(
  id: string,
  children: Map<string, string[]>,
  spouses: Map<string, string[]>,
  generations: Map<string, number>,
  gen: number,
  maxGen: number,
  byId: Map<string, NoeudArbre>,
  memo: Map<string, number>,
): number {
  if (memo.has(id)) return memo.get(id)!;
  const blockW = coupleBlockWidth(id, gen, spouses, generations, byId);

  if (gen >= maxGen) {
    memo.set(id, blockW);
    return blockW;
  }
  const kids = sortChildren(
    (children.get(id) ?? []).filter((cid) => generations.get(cid) === gen + 1),
    byId,
  );
  if (kids.length === 0) {
    memo.set(id, blockW);
    return blockW;
  }
  const kidsW = kids.reduce(
    (sum, kid) =>
      sum +
      subtreeWidth(kid, children, spouses, generations, gen + 1, maxGen, byId, memo),
    0,
  );
  const w = Math.max(kidsW, blockW);
  memo.set(id, w);
  return w;
}

function placeSubtree(
  id: string,
  left: number,
  children: Map<string, string[]>,
  spouses: Map<string, string[]>,
  generations: Map<string, number>,
  gen: number,
  maxGen: number,
  byId: Map<string, NoeudArbre>,
  memo: Map<string, number>,
  positions: Map<string, number>,
): number {
  const kids = sortChildren(
    (children.get(id) ?? []).filter((cid) => generations.get(cid) === gen + 1),
    byId,
  );
  if (kids.length === 0 || gen >= maxGen) {
    const blockW = placeCouple(
      id,
      left,
      gen,
      positions,
      generations,
      spouses,
      byId,
    );
    return left + blockW;
  }
  let cursor = left;
  for (const kid of kids) {
    cursor = placeSubtree(
      kid,
      cursor,
      children,
      spouses,
      generations,
      gen + 1,
      maxGen,
      byId,
      memo,
      positions,
    );
  }
  const first = positions.get(kids[0]!)!;
  const last = positions.get(kids[kids.length - 1]!)!;
  const coupleCenter = (first + last) / 2;
  const blockW = coupleBlockWidth(id, gen, spouses, generations, byId);
  const coupleLeft = Math.max(left, coupleCenter - blockW / 2);
  placeCouple(id, coupleLeft, gen, positions, generations, spouses, byId);
  return Math.max(cursor, coupleLeft + blockW);
}

function ancestorSubtreeWidth(
  id: string,
  parents: Map<string, string[]>,
  generations: Map<string, number>,
  gen: number,
  minGen: number,
  byId: Map<string, NoeudArbre>,
  memo: Map<string, number>,
): number {
  if (memo.has(id)) return memo.get(id)!;
  if (gen <= minGen) {
    memo.set(id, 1);
    return 1;
  }
  const par = sortParents(
    (parents.get(id) ?? []).filter((pid) => generations.get(pid) === gen - 1),
    byId,
  );
  if (par.length === 0) {
    memo.set(id, 1);
    return 1;
  }
  const w = par.reduce(
    (sum, pid) =>
      sum +
      ancestorSubtreeWidth(pid, parents, generations, gen - 1, minGen, byId, memo),
    0,
  );
  memo.set(id, w);
  return w;
}

function placeAncestorBranch(
  id: string,
  left: number,
  parents: Map<string, string[]>,
  generations: Map<string, number>,
  gen: number,
  minGen: number,
  byId: Map<string, NoeudArbre>,
  _memo: Map<string, number>,
  positions: Map<string, number>,
  skipSelfAtGen0 = false,
): number {
  // Déjà placé via une autre branche (ancêtre commun ou parent partagé).
  if (positions.has(id)) {
    return left;
  }

  const par = sortParents(
    (parents.get(id) ?? []).filter((pid) => generations.get(pid) === gen - 1),
    byId,
  );

  if (par.length === 0 || gen <= minGen) {
    if (!(skipSelfAtGen0 && gen === 0)) {
      positions.set(id, left + 0.5);
    }
    return left + 1;
  }

  if (skipSelfAtGen0 && gen === 0) {
    let cursor = left;
    for (const pid of par) {
      cursor = placeAncestorBranch(
        pid,
        cursor,
        parents,
        generations,
        gen - 1,
        minGen,
        byId,
        _memo,
        positions,
        false,
      );
    }
    return cursor;
  }

  let cursor = left;
  for (const pid of par) {
    cursor = placeAncestorBranch(
      pid,
      cursor,
      parents,
      generations,
      gen - 1,
      minGen,
      byId,
      _memo,
      positions,
      false,
    );
  }
  if (!(skipSelfAtGen0 && gen === 0)) {
    const parentsAlreadyPlaced = par.every((p) => positions.has(p));
    if (parentsAlreadyPlaced) {
      // Ex. frère/sœur sur branche maternelle alors que les parents sont déjà
      // positionnés côté paternel : rester dans la colonne courante de la branche.
      positions.set(id, left + 0.5);
    } else {
      positions.set(
        id,
        (positions.get(par[0]!)! + positions.get(par[par.length - 1]!)!) / 2,
      );
    }
  }
  return cursor;
}

/** Descendants du nœud courant (gén ≥ 1), sans repositionner le nœud courant. */
function placeDescendants(
  centre: string,
  gen: number,
  maxGen: number,
  children: Map<string, string[]>,
  spouses: Map<string, string[]>,
  unionParents: Map<string, string[]>,
  generations: Map<string, number>,
  byId: Map<string, NoeudArbre>,
  memo: Map<string, number>,
  positions: Map<string, number>,
): void {
  const kids = sortChildren(
    (children.get(centre) ?? []).filter((cid) => generations.get(cid) === gen + 1),
    byId,
  );
  if (kids.length === 0 || gen >= maxGen) return;

  const totalW = kids.reduce(
    (sum, kid) =>
      sum + subtreeWidth(kid, children, spouses, generations, gen + 1, maxGen, byId, memo),
    0,
  );
  const anchorX =
    unionAnchorX(centre, unionParents, positions) ?? positions.get(centre) ?? 0;
  let cursor = anchorX - totalW / 2 + 0.5;

  for (const kid of kids) {
    cursor = placeSubtree(
      kid,
      cursor,
      children,
      spouses,
      generations,
      gen + 1,
      maxGen,
      byId,
      memo,
      positions,
    );
  }
}

function assignPositions(
  centre: string,
  parents: Map<string, string[]>,
  children: Map<string, string[]>,
  spouses: Map<string, string[]>,
  unionParents: Map<string, string[]>,
  _unionChildren: Map<string, string[]>,
  unionData: Map<string, NoeudUnion>,
  generations: Map<string, number>,
  minGen: number,
  maxDescGen: number,
  byId: Map<string, NoeudArbre>,
): { positions: Map<string, number>; unionLayouts: TreeLayoutUnion[] } {
  const rowIds = gen0RowIds(centre, parents, children, generations, byId);
  const rowW = rowBlockWidth(rowIds, 0, spouses, generations, byId);

  const ancestorMemo = new Map<string, number>();
  ancestorSubtreeWidth(centre, parents, generations, 0, minGen, byId, ancestorMemo);

  const positions = new Map<string, number>();
  placeAncestorBranch(
    centre,
    0,
    parents,
    generations,
    0,
    minGen,
    byId,
    ancestorMemo,
    positions,
    true,
  );

  const parentIds = sortParents(parents.get(centre) ?? [], byId);
  let rowLeft = 0;
  if (parentIds.length > 0 && parentIds.every((p) => positions.has(p))) {
    const pFirst = positions.get(parentIds[0]!)!;
    const pLast = positions.get(parentIds[parentIds.length - 1]!)!;
    rowLeft = Math.max(0, (pFirst + pLast) / 2 - rowW / 2);
  }

  placeGen0Row(rowIds, rowLeft, positions, generations, spouses, byId);

  const descMemo = new Map<string, number>();
  subtreeWidth(centre, children, spouses, generations, 0, maxDescGen, byId, descMemo);
  placeDescendants(
    centre,
    0,
    maxDescGen,
    children,
    spouses,
    unionParents,
    generations,
    byId,
    descMemo,
    positions,
  );

  resolveColumnCollisions(positions, generations);

  const unionLayouts = placeUnionNodes(
    unionParents,
    unionData,
    positions,
    generations,
  );

  return { positions, unionLayouts };
}

export function layoutTree(
  centre: string,
  noeuds: NoeudArbre[],
  unions: NoeudUnion[],
  aretes: AreteArbre[],
  ancetres: number,
  descendants: number,
): TreeLayout {
  const byId = new Map(noeuds.map((n) => [n.id_gedcom, n]));
  const unionData = new Map(unions.map((u) => [u.id_famille, u]));
  const { parents, children, spouses, unionParents, unionChildren } = buildMaps(
    centre,
    aretes,
  );
  const generations = assignGenerations(
    centre,
    parents,
    children,
    unionChildren,
    spouses,
    aretes,
    ancetres,
    descendants,
  );

  const minGen = Math.min(...generations.values(), 0);
  const maxGen = Math.max(...generations.values(), 0);

  const { positions, unionLayouts } = assignPositions(
    centre,
    parents,
    children,
    spouses,
    unionParents,
    unionChildren,
    unionData,
    generations,
    minGen,
    descendants,
    byId,
  );

  const allX = [...positions.values()];
  const minX = Math.min(...allX, 0);
  const maxX = Math.max(...allX, 1);
  const span = Math.max(maxX - minX, 1);

  const toPixelX = (rawX: number) =>
    ((rawX - minX) / span) * (span * (NODE_W + GAP_X)) + NODE_W / 2;

  const nodes: TreeLayoutNode[] = [];
  for (const [id, gen] of generations) {
    const noeud = byId.get(id);
    if (!noeud || !positions.has(id)) continue;
    nodes.push({
      id,
      noeud,
      generation: gen,
      x: toPixelX(positions.get(id) ?? 0),
      y: 0,
    });
  }

  const layoutUnions: TreeLayoutUnion[] = unionLayouts.map(({ union }) => {
    const rawX = positions.get(union.id_famille) ?? 0;
    const gen = generations.get(union.id_famille) ?? -1;
    return {
      union,
      x: toPixelX(rawX),
      y: 0,
    };
  });

  const nodePos = new Map(nodes.map((n) => [n.id, n]));
  const unionPos = new Map(layoutUnions.map((u) => [u.union.id_famille, u]));
  const parentsAilleursByChild = new Map<string, ParentsAilleursRef>();

  const childrenByUnion = new Map<string, TreeLayoutNode[]>();
  for (const { de, vers, type } of aretes) {
    if (type !== "union_enfant") continue;
    const child = nodePos.get(vers);
    if (!child) continue;
    if (!childrenByUnion.has(de)) childrenByUnion.set(de, []);
    childrenByUnion.get(de)!.push(child);
  }

  for (const [unionId, unionChildren] of childrenByUnion) {
    const unionNode = unionPos.get(unionId);
    if (!unionNode || unionChildren.length === 0) continue;

    const sorted = [...unionChildren].sort((a, b) => a.x - b.x);
    const ux = unionNode.x;
    const parIds = unionParents.get(unionId) ?? [];
    const refLabel = parentLabel(parIds, byId);

    const gen0Plus = sorted.filter((c) => c.generation >= 0);
    const ancestorChildren = sorted.filter((c) => c.generation < 0);
    const nearAncestors = ancestorChildren.filter(
      (c) => !isDistantFiliation(ux, c.x),
    );
    const farAncestors = ancestorChildren.filter((c) =>
      isDistantFiliation(ux, c.x),
    );
    const far =
      nearAncestors.length > 0 ? farAncestors : [];

    for (const child of far) {
      parentsAilleursByChild.set(child.id, {
        unionId,
        parentIds: parIds,
        label: refLabel,
      });
    }
  }

  for (const node of nodes) {
    const ref = parentsAilleursByChild.get(node.id);
    if (ref) node.parentsAilleurs = ref;
  }

  const refBadgeExtra = refBadgeExtraBeforeGen(nodes, minGen);
  for (const node of nodes) {
    node.y = generationY(
      node.generation,
      minGen,
      refBadgeExtra.get(node.generation) ?? 0,
    );
  }
  for (const union of layoutUnions) {
    const gen = generations.get(union.union.id_famille) ?? -1;
    union.y = generationY(gen, minGen, refBadgeExtra.get(gen) ?? 0);
  }

  const edges: TreeLayoutEdge[] = [];

  for (const { de, vers, type } of aretes) {
    if (type === "conjoint") {
      const from = nodePos.get(de);
      const to = nodePos.get(vers);
      if (!from || !to) continue;
      const left = from.x <= to.x ? from : to;
      const right = from.x <= to.x ? to : from;
      edges.push(
        edgeLine(
          "conjoint",
          { x: left.x + NODE_W / 2, y: left.y },
          { x: right.x - NODE_W / 2, y: right.y },
        ),
      );
      continue;
    }

    if (type === "union_epoux") {
      const parent = nodePos.get(de);
      const unionNode = unionPos.get(vers);
      if (!parent || !unionNode) continue;
      const toLeft = parent.x < unionNode.x;
      edges.push(
        edgeLine(
          "union_epoux",
          {
            x: parent.x + (toLeft ? NODE_W / 2 : -NODE_W / 2),
            y: parent.y,
          },
          {
            x: unionNode.x + (toLeft ? -UNION_R : UNION_R),
            y: unionNode.y,
          },
        ),
      );
    }
  }

  for (const [unionId, unionChildren] of childrenByUnion) {
    const unionNode = unionPos.get(unionId);
    if (!unionNode || unionChildren.length === 0) continue;

    const sorted = [...unionChildren].sort((a, b) => a.x - b.x);
    const ux = unionNode.x;
    const stemTop = unionNode.y + UNION_R;
    const stemBottom = stemTop + UNION_DESC_STEM;
    const parIds = unionParents.get(unionId) ?? [];
    const refLabel = parentLabel(parIds, byId);

    const gen0Plus = sorted.filter((c) => c.generation >= 0);
    const ancestorChildren = sorted.filter((c) => c.generation < 0);
    const nearAncestors = ancestorChildren.filter(
      (c) => !isDistantFiliation(ux, c.x),
    );
    const farAncestors = ancestorChildren.filter((c) =>
      isDistantFiliation(ux, c.x),
    );
    // Icône ↩ seulement si un autre enfant de la même union est déjà relié
    // directement (branche principale) — ex. @54@ proche, @185@ loin.
    const far =
      nearAncestors.length > 0 ? farAncestors : [];
    const near = [
      ...gen0Plus,
      ...nearAncestors,
      ...(nearAncestors.length === 0 ? farAncestors : []),
    ];

    if (near.length > 0) {
      edges.push(
        edgeLine(
          "union_descendant",
          { x: ux, y: stemTop },
          { x: ux, y: stemBottom },
        ),
      );
    }

    if (near.length === 1) {
      const child = near[0]!;
      const top = { x: child.x, y: child.y - NODE_H / 2 };
      if (Math.abs(child.x - ux) < 1) {
        edges.push(edgeLine("union_descendant", { x: ux, y: stemTop }, top));
      } else {
        edges.push(
          edgeLine(
            "union_descendant",
            { x: ux, y: stemTop },
            { x: ux, y: stemBottom },
            { x: child.x, y: stemBottom },
            top,
          ),
        );
      }
    } else if (near.length > 1) {
      const nearXs = near.map((c) => c.x);
      const busLeft = Math.min(ux, ...nearXs);
      const busRight = Math.max(ux, ...nearXs);
      edges.push(
        edgeLine(
          "union_descendant",
          { x: busLeft, y: stemBottom },
          { x: busRight, y: stemBottom },
        ),
      );
      for (const child of near) {
        const top = { x: child.x, y: child.y - NODE_H / 2 };
        edges.push(
          edgeLine(
            "union_descendant",
            { x: child.x, y: stemBottom },
            top,
          ),
        );
      }
    }

    for (const child of far) {
      const top = { x: child.x, y: child.y - NODE_H / 2 };
      edges.push(
        edgeLine(
          "parents_ref_stub",
          { x: child.x, y: top - PARENTS_REF_STUB },
          top,
        ),
      );
    }
  }

  const refRows = [...refBadgeExtra.values()].reduce(
    (max, v) => Math.max(max, v),
    0,
  );
  const width = Math.max(span * (NODE_W + GAP_X) + NODE_W, 320);
  const height =
    (maxGen - minGen + 1) * (NODE_H + GAP_Y) + GAP_Y + refRows;

  return { nodes, unions: layoutUnions, edges, width, height };
}

export { NODE_W, NODE_H };
