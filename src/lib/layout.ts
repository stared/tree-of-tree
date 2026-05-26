// Turns the nested EtymNode tree into flat, positioned nodes + links.
// All D3 hierarchy math lives here so the React components stay declarative.
//
// The view is BOTTOM-UP: the PIE root sits at the base (largest screen-y),
// modern words form the canopy at the top (smallest screen-y).

import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";
import { BRANCHES, type BranchId, type EtymNode } from "../data/etymology";

export interface LaidNode {
  id: string;
  data: EtymNode;
  x: number; // screen x (breadth)
  y: number; // screen y (root at bottom)
  depth: number;
  branch: BranchId | null;
  color: string;
  /** ids from this node up to (and including) the root */
  lineage: string[];
  hasChildren: boolean;
}

export interface LaidLink {
  id: string;
  source: LaidNode; // parent (nearer the root, lower on screen)
  target: LaidNode; // child (higher on screen)
  disputed: boolean;
}

export interface Layout {
  nodes: LaidNode[];
  links: LaidLink[];
  byId: Map<string, LaidNode>;
  width: number;
  height: number;
}

const ROOT_COLOR = "#4a3b2a";
const BRANCHLESS = "#6b5d4f";

/** Nearest ancestor (or self) carrying a `branch` field. */
function resolveBranch(node: HierarchyPointNode<EtymNode>): BranchId | null {
  let cur: HierarchyPointNode<EtymNode> | null = node;
  while (cur) {
    if (cur.data.branch) return cur.data.branch;
    cur = cur.parent;
  }
  return null;
}

export interface LayoutOptions {
  dx?: number; // breadth spacing between adjacent leaves
  dy?: number; // vertical gap between generations
}

export function buildLayout(root: EtymNode, opts: LayoutOptions = {}): Layout {
  const dx = opts.dx ?? 26;
  const dy = opts.dy ?? 150;

  const h = hierarchy<EtymNode>(root);
  const maxDepth = h.height;

  const layout = tree<EtymNode>()
    .nodeSize([dx, dy])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.6));
  const positioned = layout(h);

  const pointNodes = positioned.descendants();

  // Normalise x so the leftmost node sits at a small margin.
  const xs = pointNodes.map((n) => n.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const byId = new Map<string, LaidNode>();
  const nodes: LaidNode[] = pointNodes.map((n) => {
    const branch = resolveBranch(n);
    const color =
      n.data.kind === "root"
        ? ROOT_COLOR
        : branch
          ? BRANCHES[branch].color
          : BRANCHLESS;
    const lineage = n.ancestors().map((a) => a.data.id);
    const laid: LaidNode = {
      id: n.data.id,
      data: n.data,
      x: n.x - minX,
      y: (maxDepth - n.depth) * dy,
      depth: n.depth,
      branch,
      color,
      lineage,
      hasChildren: !!n.children && n.children.length > 0,
    };
    byId.set(laid.id, laid);
    return laid;
  });

  const links: LaidLink[] = positioned.links().map((l) => {
    const source = byId.get(l.source.data.id)!;
    const target = byId.get(l.target.data.id)!;
    return {
      id: `${source.id}->${target.id}`,
      source,
      target,
      disputed: !!l.target.data.disputed,
    };
  });

  return {
    nodes,
    links,
    byId,
    width: maxX - minX,
    height: maxDepth * dy,
  };
}

/** Smooth vertical S-curve between a parent (bottom) and child (top). */
export function linkPath(link: LaidLink): string {
  const { source: s, target: t } = link;
  const my = (s.y + t.y) / 2;
  return `M${s.x},${s.y}C${s.x},${my} ${t.x},${my} ${t.x},${t.y}`;
}
