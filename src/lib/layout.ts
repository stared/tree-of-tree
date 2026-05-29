// Turns the nested EtymNode tree into flat, positioned nodes + links.
// All D3 hierarchy math lives here so the React components stay declarative.
//
// The view is BOTTOM-UP: the PIE root sits at the base (largest screen-y),
// modern words form the canopy at the top (smallest screen-y).
// Node colour comes from the word's MEANING (sense), not its language.

import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";
import { senseColor, type EtymNode } from "../data/etymology";

export interface LaidNode {
  id: string;
  data: EtymNode;
  x: number; // screen x (breadth)
  y: number; // screen y (root at bottom)
  depth: number;
  color: string; // by sense
  /** ids from this node up to (and including) the root */
  lineage: string[];
  hasChildren: boolean;
  /** number of nodes in this node's subtree (incl. itself) — drives branch thickness */
  subtreeSize: number;
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

  const pointNodes: HierarchyPointNode<EtymNode>[] = positioned.descendants();

  const xs = pointNodes.map((n) => n.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  // Vertical stagger: d3.tree() puts every node of a given depth on ONE line,
  // which wastes vertical space and makes same-depth labels collide. We push
  // each node UP by a fraction of dy, cycling through a pattern across the
  // breadth-sorted nodes of its depth. Neighbours end at different heights, so
  // their (rotated) labels no longer overlap — and branches get varied lengths,
  // which reads as a more organic tree. Pushing only UP keeps every child above
  // its parent (offset < dy always).
  const STAGGER = [0, 0.66, 0.33, 0.5, 0.16];
  const offsetById = new Map<string, number>();
  const byDepth = new Map<number, HierarchyPointNode<EtymNode>[]>();
  for (const n of pointNodes) {
    const arr = byDepth.get(n.depth) ?? [];
    arr.push(n);
    byDepth.set(n.depth, arr);
  }
  for (const arr of byDepth.values()) {
    arr.sort((a, b) => a.x - b.x);
    arr.forEach((n, i) => offsetById.set(n.data.id, STAGGER[i % STAGGER.length] * dy));
  }

  const byId = new Map<string, LaidNode>();
  const nodes: LaidNode[] = pointNodes.map((n) => {
    const laid: LaidNode = {
      id: n.data.id,
      data: n.data,
      x: n.x - minX,
      y: (maxDepth - n.depth) * dy - (offsetById.get(n.data.id) ?? 0),
      depth: n.depth,
      color: senseColor(n.data),
      lineage: n.ancestors().map((a) => a.data.id),
      hasChildren: !!n.children && n.children.length > 0,
      subtreeSize: n.descendants().length,
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

  return { nodes, links, byId, width: maxX - minX, height: maxDepth * dy + dy };
}

/** Smooth vertical S-curve between a parent (bottom) and child (top). */
export function linkPath(link: LaidLink): string {
  const { source: s, target: t } = link;
  const my = (s.y + t.y) / 2;
  return `M${s.x},${s.y}C${s.x},${my} ${t.x},${my} ${t.x},${t.y}`;
}
