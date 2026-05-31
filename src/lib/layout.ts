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
    // Wider sibling gaps so that when a step frames one small branch, its
    // forced labels (which read up-right) have room to clear each other.
    .separation((a, b) => (a.parent === b.parent ? 1.5 : 2));
  const positioned = layout(h);

  const pointNodes: HierarchyPointNode<EtymNode>[] = positioned.descendants();

  const xs = pointNodes.map((n) => n.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  // Vertical stagger: d3.tree() puts every node of a depth on ONE line, so a
  // parent's children sit at the same height and their (rotated) labels collide.
  // We push children UP by a fraction of dy, in a "tent" per parent: children
  // NEAR the parent's x rise highest, those FARTHER OUT sit lower. This (a)
  // gives adjacent siblings different heights so their labels don't stack, and
  // (b) guarantees no link crossings — a farther sibling, sitting lower, sweeps
  // UNDER a nearer one rather than over it, so same-side branches never weave.
  // Pushing only up (< dy) keeps every child above its parent.
  const offsetById = new Map<string, number>();
  const kids = new Map<string, { nodes: HierarchyPointNode<EtymNode>[]; px: number }>();
  for (const n of pointNodes) {
    if (!n.parent) continue;
    const g = kids.get(n.parent.data.id) ?? { nodes: [], px: n.parent.x };
    g.nodes.push(n);
    kids.set(n.parent.data.id, g);
  }
  for (const { nodes: arr, px } of kids.values()) {
    arr.sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px)); // nearest the parent first
    arr.forEach((n, i) => {
      const frac = arr.length === 1 ? 0.5 : 1 - i / (arr.length - 1); // near → high, far → low
      offsetById.set(n.data.id, frac * 0.72 * dy);
    });
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

/** Smooth branch curve from a parent (bottom) to a child (top). ONE consistent
 * shape for every link — only its two endpoints differ. It FANS from the parent
 * (the first control point points along the parent→child chord, so each child
 * leaves the node at its own angle, like real branches) and arrives VERTICAL at
 * the child (second control point straight below it). Because siblings fan out
 * along distinct directions instead of sharing a vertical trunk + flat shoulder,
 * they neither weave across nor overlap one another. */
export function linkPath(link: LaidLink): string {
  const { source: s, target: t } = link;
  const my = (s.y + t.y) / 2;
  return `M${s.x},${s.y}C${s.x},${my} ${t.x},${my} ${t.x},${t.y}`;
}
