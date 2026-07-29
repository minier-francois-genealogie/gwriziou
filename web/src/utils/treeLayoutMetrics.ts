export type TreeViewMode = "detail" | "overview";

export interface TreeLayoutMetrics {
  nodeW: number;
  nodeH: number;
  gapX: number;
  gapY: number;
  unionDescStem: number;
  refBadgeRowGap: number;
  parentsRefStub: number;
  distantFiliationFactor: number;
  unionR: number;
}

const DETAIL: TreeLayoutMetrics = {
  nodeW: 192,
  nodeH: 140,
  gapX: 24,
  gapY: 56,
  unionDescStem: 56,
  refBadgeRowGap: 26,
  parentsRefStub: 22,
  distantFiliationFactor: 1.5,
  unionR: 18,
};

const OVERVIEW_NODE_H = 110;
const OVERVIEW_UNION_R = 9;
const OVERVIEW_GAP_Y = 18;

const OVERVIEW: TreeLayoutMetrics = {
  nodeW: 44,
  nodeH: OVERVIEW_NODE_H,
  gapX: 10,
  gapY: OVERVIEW_GAP_Y,
  unionR: OVERVIEW_UNION_R,
  // unionR + unionDescStem > nodeH/2 : barre horizontale sous les cellules parents
  unionDescStem: OVERVIEW_NODE_H / 2 - OVERVIEW_UNION_R + 6,
  refBadgeRowGap: 0,
  parentsRefStub: 10,
  distantFiliationFactor: 1.5,
};

export function getTreeLayoutMetrics(mode: TreeViewMode): TreeLayoutMetrics {
  return mode === "overview" ? OVERVIEW : DETAIL;
}
