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
  // Walk top-down: each child sits a "branch length" above its parent, and the
  // length GROWS with the branch's horizontal reach — a branch that goes far
  // sideways also climbs high, so every fan opens into a DOME (the crown of a
  // real tree) instead of a flat skirt of tentacles. Because length is a
  // monotonic function of distance-from-parent, same-side branches still nest,
  // so NO links cross; sublinear growth (sqrt-ish) keeps the very wide root
  // fan from spiking. Single-child links stay compressed (chains don't spike).
  const rnd = mulberry32(0x7eed);
  const jit = () => (rnd() - 0.5) * 0.08 * dy; // tiny organic wobble (≪ the reach steps, so order holds)
  const yRaw = new Map<string, number>();
  (function place(node: HierarchyPointNode<EtymNode>, y: number) {
    yRaw.set(node.data.id, y);
    const ch = node.children;
    if (!ch || !ch.length) return;
    if (ch.length === 1) {
      place(ch[0], y - (dy * 0.6 + jit())); // compressed chain
      return;
    }
    const px = node.x;
    const BASE = 0.55; // a child right above its parent
    const GAIN = 0.62; // how fast reach buys height
    for (const c of ch) {
      const f = Math.min(2.0, BASE + GAIN * Math.pow(Math.abs(c.x - px) / dy, 0.7));
      place(c, y - (dy * f + jit()));
    }
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
  const MARG = 8; // breathing margin around each label box
  const CAP = 90; // most a node may stray from its slot (prevents seaweed AND
  //                 keeps it out of its cousins' band, where links would cross)
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

  // ─── crossing repair: the last few units of honesty ───
  // The placement rules above eliminate crossings almost everywhere, but two
  // local accidents survive them: near-colinear siblings (two links leaving one
  // node at nearly the same angle, so the arrival bend of the short one clips
  // the long one) and a link grazing a COUSIN's node. Both are proximity
  // problems, so resolve them directly: sample every drawn curve, find real
  // intersections, and nudge the lighter link's child node away from the other
  // curve until no two links cross. Deterministic, a few passes, tiny moves.
  const sample = (l: LaidLink): [number, number][] => {
    const { source: s, target: t } = l;
    const my = (s.y + t.y) / 2; // the same soft S that linkPath draws
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const v = 1 - u;
      pts.push([
        v * v * v * s.x + 3 * v * v * u * s.x + 3 * v * u * u * t.x + u * u * u * t.x,
        v * v * v * s.y + 3 * v * v * u * my + 3 * v * u * u * my + u * u * u * t.y,
      ]);
    }
    return pts;
  };
  const cross = (a: [number, number], b: [number, number], c: [number, number], d: [number, number]) => {
    const r = [b[0] - a[0], b[1] - a[1]];
    const s2 = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * s2[1] - r[1] * s2[0];
    if (Math.abs(den) < 1e-12) return null;
    const t = ((c[0] - a[0]) * s2[1] - (c[1] - a[1]) * s2[0]) / den;
    const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? ([a[0] + t * r[0], a[1] + t * r[1]] as [number, number]) : null;
  };
  for (let pass = 0; pass < 8; pass++) {
    const flat = links.map((l) => sample(l));
    // bounding boxes let us skip the vast majority of pairs untested
    const box = flat.map((pts) => {
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      for (const p of pts) {
        if (p[0] < b[0]) b[0] = p[0];
        if (p[1] < b[1]) b[1] = p[1];
        if (p[0] > b[2]) b[2] = p[0];
        if (p[1] > b[3]) b[3] = p[1];
      }
      return b;
    });
    let moved = false;
    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        if (box[i][2] < box[j][0] || box[j][2] < box[i][0] || box[i][3] < box[j][1] || box[j][3] < box[i][1])
          continue;
        const A = links[i];
        const B = links[j];
        // links MEET at shared nodes (sibling fans, parent→child chains) by
        // design — forgive hits near those junctions, never elsewhere
        const joints: LaidNode[] = [A.source, A.target].filter(
          (n) => n === B.source || n === B.target,
        );
        let hit: [number, number] | null = null;
        for (let a = 0; a < flat[i].length - 1 && !hit; a++)
          for (let b = 0; b < flat[j].length - 1 && !hit; b++) {
            const h = cross(flat[i][a], flat[i][a + 1], flat[j][b], flat[j][b + 1]);
            if (h && !joints.some((njt) => Math.hypot(h[0] - njt.x, h[1] - njt.y) < 15)) hit = h;
          }
        if (!hit) continue;
        const [light, heavyPts] =
          A.target.subtreeSize <= B.target.subtreeSize ? [A.target, flat[j]] : [B.target, flat[i]];
        if (A.source === B.source) {
          // siblings crossing = near-colinear chords. The effective move is
          // PERPENDICULAR: take the child nearest the hit and slide it away
          // from its sibling's curve, sideways to that curve's direction.
          const da = Math.hypot(A.target.x - hit[0], A.target.y - hit[1]);
          const db = Math.hypot(B.target.x - hit[0], B.target.y - hit[1]);
          const [n, oth] = da <= db ? [A.target, B.target] : [B.target, A.target];
          const o = A.source;
          const dirx = oth.x - o.x;
          const diry = oth.y - o.y;
          const dl = Math.hypot(dirx, diry) || 1;
          let px2 = -diry / dl;
          let py2 = dirx / dl;
          // point the perpendicular toward the node's side of the sibling chord
          if ((n.x - hit[0]) * px2 + (n.y - hit[1]) * py2 < 0) {
            px2 = -px2;
            py2 = -py2;
          }
          n.x += px2 * 14;
          n.y += py2 * 14;
        } else {
          // cousins: translate the lighter child away from the heavier curve
          let best = Infinity;
          let bx = 0;
          let by = 0;
          for (const p of heavyPts) {
            const d2 = (light.x - p[0]) ** 2 + (light.y - p[1]) ** 2;
            if (d2 < best) {
              best = d2;
              bx = p[0];
              by = p[1];
            }
          }
          const dn = Math.hypot(light.x - bx, light.y - by) || 1;
          light.x += ((light.x - bx) / dn) * 13;
          light.y += ((light.y - by) / dn) * 13;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }

  return { nodes, links, byId, width: maxX - minX, height: spanY + dy };
}

/** Smooth branch curve from a parent (bottom) to a child (top): leaves the
 * parent VERTICALLY, shoulders over at mid-height, arrives VERTICALLY at the
 * child — the soft, flowing S that reads as living wood. Where two of these
 * curves would cross, the fix is moving the NODES (the repair pass above),
 * never straightening the wood. */
export function linkPath(link: LaidLink): string {
  const { source: s, target: t } = link;
  const my = (s.y + t.y) / 2;
  return `M${s.x},${s.y}C${s.x},${my} ${t.x},${my} ${t.x},${t.y}`;
}
