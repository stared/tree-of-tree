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
  /** label offset (layout units) from the dot — a baked repulsion that keeps
   *  labels from overlapping; the label still sits near its node (no seaweed). */
  labelDx: number;
  labelDy: number;
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
    .separation((a, b) => (a.parent === b.parent ? 1.5 : 2));
  const positioned = layout(h);

  const pointNodes: HierarchyPointNode<EtymNode>[] = positioned.descendants();

  // ─── vertical placement ───
  // Walk top-down: each child sits a "branch length" above its parent. Within a
  // parent the lengths form a STEEP RAKE — the sibling nearest the parent (in x)
  // is much taller, the farthest much shorter, spread over a wide range. That
  // makes adjacent siblings land at clearly DIFFERENT heights, so their labels
  // (kept full and all in one direction) are vertically offset and don't pile
  // up — the cure for the dense fans (*treuwaz, *dóru). Because length is a
  // monotonic function of distance-from-parent, same-side branches still nest,
  // so NO links cross. The rake widens with the fan (more children ⇒ taller),
  // single-child links stay compressed (chains don't spike), and *dréw-'s
  // children get extra length so its wide branch to δρῦς stays a smooth diagonal.
  const rnd = mulberry32(0x7eed);
  const jit = () => (rnd() - 0.5) * 0.08 * dy; // tiny organic wobble (< half a rake step, so order holds)
  const yRaw = new Map<string, number>();
  (function place(node: HierarchyPointNode<EtymNode>, y: number) {
    yRaw.set(node.data.id, y);
    const ch = node.children;
    if (!ch || !ch.length) return;
    const boost = node.data.id === "stem-drew" ? 1.7 : 1;
    if (ch.length === 1) {
      place(ch[0], y - (dy * 0.6 * boost + jit())); // compressed chain
      return;
    }
    const px = node.x;
    const byDist = [...ch].sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px));
    const n = ch.length;
    const SHORT = 0.55; // farthest sibling (shortest)
    const STEP = Math.min(0.24, 1.55 / (n - 1)); // height gap per distance-rank
    byDist.forEach((c, i) => {
      const f = SHORT + STEP * (n - 1 - i); // i=0 nearest (tallest) … i=n-1 farthest (shortest)
      place(c, y - (dy * boost * f + jit()));
    });
  })(positioned, 0);
  // ─── de-collision: a one-time, seeded repulsion ───
  // Overlapping labels push their NODES apart — the dot and its label always
  // move together, never separated. A short relaxation repels along the
  // centre-to-centre direction (so a wedged node can pop out sideways OR upward)
  // while a weak spring holds each node near its starting spot. Baked once,
  // identical on desktop and mobile; sibling order is held so links don't cross.
  const baseX = new Map(pointNodes.map((n) => [n.data.id, n.x]));
  const baseY = new Map(pointNodes.map((n) => [n.data.id, yRaw.get(n.data.id) ?? 0]));
  const dat = new Map(pointNodes.map((n) => [n.data.id, n.data]));
  const ids = pointNodes.map((n) => n.data.id);
  const off = new Map(ids.map((id) => [id, { dx: 0, dy: 0 }]));
  // sibling groups (left→right) — used to hold order so links never cross
  const sibs = new Map<string, string[]>();
  for (const n of pointNodes)
    if (n.parent) (sibs.get(n.parent.data.id) ?? sibs.set(n.parent.data.id, []).get(n.parent.data.id)!).push(n.data.id);
  for (const [, arr] of sibs) arr.sort((a, b) => baseX.get(a)! - baseX.get(b)!);
  const CPU = 6.4; // layout units per character (≈ the gloss line's native width)
  const MARG = 6; // breathing margin around each label box
  const CAP = 132; // most a label may stray from its dot (prevents seaweed)
  const lbox = (id: string) => {
    const d = dat.get(id)!;
    const o = off.get(id)!;
    const x = baseX.get(id)! + o.dx;
    const y = baseY.get(id)! + o.dy;
    const w = Math.max(d.form.length, (d.gloss?.length ?? 0) * 0.78) * CPU;
    const stack = (d.translit ? 3 : 2) * 14;
    return { l: x - 6 - MARG, r: x + 8 + w * 0.87 + MARG, t: y - (w * 0.5 + stack) - MARG, b: y + 8 + MARG };
  };
  for (let it = 0; it < 1000; it++) {
    const f = new Map(ids.map((id) => [id, { dx: 0, dy: 0 }]));
    for (let i = 0; i < ids.length; i++) {
      const A = lbox(ids[i]);
      for (let j = i + 1; j < ids.length; j++) {
        const B = lbox(ids[j]);
        const ox = Math.min(A.r, B.r) - Math.max(A.l, B.l);
        if (ox <= 0) continue;
        const oy = Math.min(A.b, B.b) - Math.max(A.t, B.t);
        if (oy <= 0) continue;
        const fa = f.get(ids[i])!;
        const fb = f.get(ids[j])!;
        // push apart along the centre-to-centre direction (2D), so a label
        // wedged between two others can pop out sideways OR upward — biased a
        // little toward the smaller-overlap axis for a clean, quick resolve.
        let vx = (A.l + A.r) / 2 - (B.l + B.r) / 2;
        const vy = (A.t + A.b) / 2 - (B.t + B.b) / 2;
        if (vx === 0 && vy === 0) vx = 1;
        const m = Math.hypot(vx, vy) || 1;
        const pen = Math.min(ox, oy) * 0.5;
        fa.dx += (vx / m) * pen;
        fa.dy += (vy / m) * pen;
        fb.dx -= (vx / m) * pen;
        fb.dy -= (vy / m) * pen;
      }
    }
    // move nodes in 2D (dot + label together). Strong repulsion, weak spring
    // back, capped so no node drifts far.
    for (const id of ids) {
      const o = off.get(id)!;
      const ff = f.get(id)!;
      o.dx = Math.max(-CAP, Math.min(CAP, (o.dx + 0.4 * ff.dx) * 0.985));
      o.dy = Math.max(-CAP, Math.min(CAP, (o.dy + 0.4 * ff.dy) * 0.985));
    }
    // hold each sibling group in its original left→right order (with a small
    // minimum gap) so subtrees never swap sides ⇒ no crossings
    for (const [, arr] of sibs)
      for (let k = 1; k < arr.length; k++) {
        const prev = baseX.get(arr[k - 1])! + off.get(arr[k - 1])!.dx;
        const cur = baseX.get(arr[k])! + off.get(arr[k])!.dx;
        if (cur < prev + dx * 0.5) off.get(arr[k])!.dx += prev + dx * 0.5 - cur;
      }
  }

  // final positions (nodes carry their labels); recompute the extents
  const finalX = (id: string) => baseX.get(id)! + off.get(id)!.dx;
  const finalY = (id: string) => baseY.get(id)! + off.get(id)!.dy;
  const fxs = ids.map(finalX);
  const fys = ids.map(finalY);
  const minX = Math.min(...fxs);
  const maxX = Math.max(...fxs);
  const minY = Math.min(...fys);
  const spanY = Math.max(...fys) - minY;

  const byId = new Map<string, LaidNode>();
  const nodes: LaidNode[] = pointNodes.map((n) => {
    const laid: LaidNode = {
      id: n.data.id,
      data: n.data,
      x: finalX(n.data.id) - minX, // node carries its label (offset baked in)
      y: finalY(n.data.id) - minY,
      depth: n.depth,
      color: senseColor(n.data),
      lineage: n.ancestors().map((a) => a.data.id),
      hasChildren: !!n.children && n.children.length > 0,
      subtreeSize: n.descendants().length,
      labelDx: 0, // label sits at its dot — node + label moved together
      labelDy: 0,
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
