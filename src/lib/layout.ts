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

/** small seeded PRNG (mulberry32) — irregular but deterministic branch lengths */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildLayout(root: EtymNode, opts: LayoutOptions = {}): Layout {
  const dx = opts.dx ?? 26;
  const dy = opts.dy ?? 150;

  const h = hierarchy<EtymNode>(root);

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

  // ─── vertical placement ───
  // Walk top-down: each child sits a "branch length" above its parent. Lengths
  // are IRREGULAR (seeded random, so the tree reads organic, not mechanically
  // stepped), but within each parent they're assigned LONGEST→nearest child,
  // SHORTEST→farthest — that monotonic order is what stops sibling branches from
  // weaving, so NO links cross. Single-child links are compressed (chains don't
  // spike), and *dréw-'s children get extra length so its wide branch to δρῦς
  // lands on a smooth diagonal rather than a flat elbow.
  const rnd = mulberry32(0x7eed);
  const yRaw = new Map<string, number>();
  (function place(node: HierarchyPointNode<EtymNode>, y: number) {
    yRaw.set(node.data.id, y);
    const ch = node.children;
    if (!ch || !ch.length) return;
    const px = node.x;
    const base = dy * (ch.length === 1 ? 0.55 : 1) * (node.data.id === "stem-drew" ? 1.7 : 1);
    const byDist = [...ch].sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px));
    const lens = byDist.map(() => base * (0.6 + 0.55 * rnd()));
    lens.sort((a, b) => b - a); // longest → nearest sibling (monotonic ⇒ no weave)
    byDist.forEach((c, i) => place(c, y - lens[i]));
  })(positioned, 0);
  const minY = Math.min(...yRaw.values());
  const spanY = Math.max(...yRaw.values()) - minY;

  const byId = new Map<string, LaidNode>();
  const nodes: LaidNode[] = pointNodes.map((n) => {
    const laid: LaidNode = {
      id: n.data.id,
      data: n.data,
      x: n.x - minX,
      y: (yRaw.get(n.data.id) ?? 0) - minY,
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

  return { nodes, links, byId, width: maxX - minX, height: spanY + dy };
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
