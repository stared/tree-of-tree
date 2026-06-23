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
  /** layout-units per label character — the de-collision budget for label width.
   *  The poster shows ALL labels at once (drawn ~1:1), so it raises this above
   *  the live story's 7 to keep 94 labels from colliding. */
  cpu?: number;
  /** width/stack multiplier for the few `important` labels the poster enlarges. */
  importantScale?: number;
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
  const importantScale = opts.importantScale ?? 1;

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
  // shallow limbs stretch: a 2-generation limb would otherwise die low while
  // the deep chains tower — scale each root limb's hops so every limb's tips
  // approach the same canopy band (a real crown fills its sky).
  const limbM = new Map<string, number>();
  for (const c of positioned.children ?? [])
    limbM.set(c.data.id, Math.min(1.6, Math.pow(positioned.height / (c.height + 1), 0.35)));
  const yRaw = new Map<string, number>();
  (function place(node: HierarchyPointNode<EtymNode>, y: number, m: number) {
    yRaw.set(node.data.id, y);
    const ch = node.children;
    if (!ch || !ch.length) return;
    const childM = (c: HierarchyPointNode<EtymNode>) => (node.depth === 0 ? (limbM.get(c.data.id) ?? 1) : m);
    if (ch.length === 1) {
      const mc = childM(ch[0]);
      place(ch[0], y - (dy * 0.46 + jit()) * mc, mc); // compressed chain
      return;
    }
    const px = node.x;
    // floor: even a child right above its parent gets clear of the fan base
    // (its label must not lie among the limbs). A WIDE fan needs a higher
    // floor — with many limbs the bundle only spreads apart further up.
    const BASE = 0.72 + 0.05 * Math.max(0, ch.length - 3);
    const GAIN = 0.62; // how fast reach buys height
    // Labels are PARALLEL −32° strips, so two siblings only fight when their
    // perpendicular distance (0.53·Δx + 0.85·Δy) is under a strip's thickness.
    // The dome alone raises right-side siblings ~20 units per step — exactly
    // along the text direction, quasi-stacking their labels. Enforce the
    // perpendicular gap HERE, at placement, against EVERY already-placed
    // sibling (non-adjacent pairs align just as happily): each child takes
    // the nearest height outside all forbidden bands, biased to keep the
    // dome's rising sweep. Fans stagger by construction.
    const PSEP = 58; // ≥ one strip thickness + breathing room
    const placed: { x: number; y: number }[] = [];
    for (const c of ch) {
      const f = Math.min(2.0, BASE + GAIN * Math.pow(Math.abs(c.x - px) / dy, 0.7));
      const mc = childM(c);
      const cy0 = y - (dy * f + jit()) * mc;
      const floor = y - dy * 0.6 * mc; // never sink into the fan base
      let cy = Math.min(cy0, floor);
      const prev = placed[placed.length - 1]; // adjacent neighbour only — an
      // all-pairs sweep breaks the dome's height order and tangles the fan
      if (prev) {
        const q = 0.53 * (c.x - prev.x);
        if (Math.abs(q + 0.85 * (cy - prev.y)) < PSEP) {
          const below = prev.y + (PSEP - q) / 0.85; // just under that band
          const above = prev.y - (PSEP + q) / 0.85; // clear over it
          cy =
            below <= floor && Math.abs(below - cy0) + dy * 0.45 * mc <= Math.abs(above - cy0)
              ? below
              : above;
        }
      }
      cy = Math.max(cy, y - dy * 2.1 * mc); // no masts above the canopy
      placed.push({ x: c.x, y: cy });
      place(c, cy, mc);
    }
  })(positioned, 0, 1);
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
  const CPU = opts.cpu ?? 7.0; // layout units per character. Labels keep constant SCREEN
  //                 size, so their layout-unit footprint depends on the step
  //                 camera's zoom — calibrate to the WIDEST (lowest-k) step,
  //                 the faith fan, where labels loom largest over the layout.
  const MARG = 12; // breathing margin around each label box — generous on
  //                 purpose: "barely not overlapping" reads as cramped
  const CAP = 90; // most a node may stray from its slot (prevents seaweed AND
  //                 keeps it out of its cousins' band, where links would cross)
  // the REAL label: text reads up-right at −32°, up to ~4 stacked lines deep.
  // (D,N) = along-the-text and down-the-stack unit vectors; used to keep
  // labels off LINKS, where the loose unrotated box would cry wolf.
  const RAD = (-32 * Math.PI) / 180;
  const DLX = Math.cos(RAD);
  const DLY = Math.sin(RAD);
  const NLX = -Math.sin(RAD);
  const NLY = Math.cos(RAD);
  const linkIds = positioned.links().map((l) => [l.source.data.id, l.target.data.id] as [string, string]);
  const impF = (d: EtymNode) => (d.important ? importantScale : 1);
  // Which nodes show a meaning (gloss): the headline words, and every attested/
  // modern NON-English word (the foreign cognates a reader can't decode). Plain
  // English outcome words stay forms-only so the tree stays compact. Reconstructed
  // scaffolding never shows a gloss. (A headline word's gloss is drawn small, so
  // its label width is set by the big FORM, not the gloss — hence glossW=0 there.)
  // ONLY modern standard English is "English" here — Old English (and archaic/
  // dialectal) are different languages a reader can't decode, so they keep their
  // gloss. (The old /English/ regex wrongly swallowed "Old English".)
  // every real (attested/modern) word shows its meaning; only the reconstructed
  // proto-form scaffolding stays bare.
  const showsGloss = (d: EtymNode) => d.kind === "attested" || d.kind === "modern";
  const glossBudget = (d: EtymNode) => (showsGloss(d) ? (d.gloss?.length ?? 0) * 0.78 : 0);
  const labelW = (id: string) => {
    const d = dat.get(id)!;
    return Math.max(d.form.length, glossBudget(d), d.translit?.length ?? 0) * CPU * impF(d);
  };
  // scratch buffers for the link-vs-label pass (hot loop — no allocations)
  const NS = 12; // curve samples per link
  const ptx = new Float64Array(NS);
  const pty = new Float64Array(NS);
  const stripX = new Float64Array(ids.length);
  const stripY = new Float64Array(ids.length);
  const stripW = new Float64Array(ids.length);
  const stripL = new Float64Array(ids.length);
  const stripR = new Float64Array(ids.length);
  const stripT = new Float64Array(ids.length);
  const stripB = new Float64Array(ids.length);
  const lbox = (id: string) => {
    const d = dat.get(id)!;
    const o = off.get(id)!;
    const x = baseX.get(id)! + o.dx;
    const y = baseY.get(id)! + o.dy;
    const w = Math.max(d.form.length, glossBudget(d), d.translit?.length ?? 0) * CPU * impF(d);
    const lines = 1 + (d.translit ? 1 : 0) + (showsGloss(d) ? 1 : 0);
    const stack = lines * 14 * impF(d);
    return { l: x - 6 - MARG, r: x + 8 + w * 0.87 + MARG, t: y - (w * 0.5 + stack) - MARG, b: y + 8 + MARG };
  };
  for (let it = 0; it < 1000; it++) {
    const f = new Map(ids.map((id) => [id, { dx: 0, dy: 0 }]));
    const boxes = ids.map(lbox); // each box is fixed within one iteration
    for (let i = 0; i < ids.length; i++) {
      const A = boxes[i];
      for (let j = i + 1; j < ids.length; j++) {
        const B = boxes[j];
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
        let vy = (A.t + A.b) / 2 - (B.t + B.b) / 2;
        if (vx === 0 && vy === 0) vx = 1;
        // same-height neighbours deadlock: a purely horizontal push just leans
        // on the sibling-order wall and dies. Break the tie VERTICALLY —
        // deterministically lift the left one, sink the right one.
        if (Math.abs(vy) < 6) vy = vx > 0 ? 6 : -6;
        const m = Math.hypot(vx, vy) || 1;
        const pen = Math.min(ox, oy) * 0.5;
        fa.dx += (vx / m) * pen;
        fa.dy += (vy / m) * pen;
        fb.dx -= (vx / m) * pen;
        fb.dy -= (vy / m) * pen;
      }
    }
    // ─── labels must not lie on LINKS ───
    // every few iterations, sample each curve at the nodes' current positions;
    // where a FOREIGN curve runs through a label's strip, push the label's
    // node off the line and the curve's child the other way. (Junction zones
    // near a link's own endpoints are forgiven — fans legitimately converge.)
    if (it % 5 === 0) {
      for (let s = 0; s < ids.length; s++) {
        const id = ids[s];
        const o = off.get(id)!;
        const x = baseX.get(id)! + o.dx;
        const y = baseY.get(id)! + o.dy;
        const w = 8 + labelW(id);
        stripX[s] = x;
        stripY[s] = y;
        stripW[s] = w;
        // AABB of the rotated strip (corners at u∈{4,w}, v∈{−12,40})
        stripL[s] = Math.min(x + 4 * DLX - 12 * NLX, x + 4 * DLX + 40 * NLX);
        stripR[s] = Math.max(x + w * DLX - 12 * NLX, x + w * DLX + 40 * NLX);
        stripT[s] = Math.min(y + w * DLY - 12 * NLY, y + w * DLY + 40 * NLY);
        stripB[s] = Math.max(y + 4 * DLY - 12 * NLY, y + 4 * DLY + 40 * NLY);
      }
      for (const [sid, tid] of linkIds) {
        const so = off.get(sid)!;
        const to = off.get(tid)!;
        const sx = baseX.get(sid)! + so.dx;
        const sy = baseY.get(sid)! + so.dy;
        const tx = baseX.get(tid)! + to.dx;
        const ty = baseY.get(tid)! + to.dy;
        const my = (sy + ty) / 2; // the soft S the renderer draws
        for (let i = 0; i < NS; i++) {
          const u = (i + 1) / (NS + 1);
          const v = 1 - u;
          const c1 = v * v * v + 3 * v * v * u;
          const c2 = 3 * v * u * u + u * u * u;
          ptx[i] = c1 * sx + c2 * tx;
          pty[i] = v * v * v * sy + (3 * v * v * u + 3 * v * u * u) * my + u * u * u * ty;
        }
        const bl = Math.min(sx, tx);
        const br = Math.max(sx, tx);
        const bt = Math.min(sy, ty);
        const bb = Math.max(sy, ty);
        for (let s = 0; s < ids.length; s++) {
          const id = ids[s];
          if (id === sid || id === tid) continue;
          if (stripR[s] < bl || br < stripL[s] || stripB[s] < bt || bb < stripT[s]) continue;
          // deepest sample inside this label's strip
          let pen = 0;
          let k = -1;
          for (let i = 0; i < NS; i++) {
            const px = ptx[i];
            const py = pty[i];
            if ((px - sx) * (px - sx) + (py - sy) * (py - sy) < 400) continue;
            if ((px - tx) * (px - tx) + (py - ty) * (py - ty) < 400) continue;
            const rx = px - stripX[s];
            const ry = py - stripY[s];
            const u2 = rx * DLX + ry * DLY;
            const v2 = rx * NLX + ry * NLY;
            // +10: a curve PASSING WITHIN 10 units of the text already counts —
            // clearance, not mere non-overlap, is the target
            const p = Math.min(u2 - 4, stripW[s] - u2, v2 + 12, 40 - v2) + 10;
            if (p > pen) {
              pen = p;
              k = i;
            }
          }
          if (k < 0) continue;
          // local link normal; sign so the labelled node backs AWAY from the line
          const k0 = Math.max(0, k - 1);
          const k1 = Math.min(NS - 1, k + 1);
          let nx = -(pty[k1] - pty[k0]);
          let ny = ptx[k1] - ptx[k0];
          const nm = Math.hypot(nx, ny) || 1;
          nx /= nm;
          ny /= nm;
          if ((stripX[s] - ptx[k]) * nx + (stripY[s] - pty[k]) * ny < 0) {
            nx = -nx;
            ny = -ny;
          }
          const K = Math.min(14, 3 + pen * 0.35);
          const fn = f.get(id)!;
          fn.dx += nx * K;
          fn.dy += ny * K;
          const ft = f.get(tid)!;
          ft.dx -= nx * K * 0.7;
          ft.dy -= ny * K * 0.7;
        }
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
    // a single-child CHAIN is one piece of trunk: pull the only child's
    // drift toward its parent's — BOTH axes — so labels may push a whole
    // chain aside but never fold it into a zigzag (dx) or stretch/squash
    // its hops into an uneven ladder (dy).
    for (const [pid, arr] of sibs)
      if (arr.length === 1) {
        const co = off.get(arr[0])!;
        const po = off.get(pid)!;
        co.dx += (po.dx - co.dx) * 0.8;
        co.dy += (po.dy - co.dy) * 0.8;
      }
    // hold each sibling group in its original left→right order AND keep a
    // real gap (d3 promised ≥ dx — the drift must not eat it, or siblings
    // collapse into one column and their links fuse into a double line)
    for (const [, arr] of sibs)
      for (let k = 1; k < arr.length; k++) {
        const prev = baseX.get(arr[k - 1])! + off.get(arr[k - 1])!.dx;
        const cur = baseX.get(arr[k])! + off.get(arr[k])!.dx;
        if (cur < prev + dx * 1.35) off.get(arr[k])!.dx += prev + dx * 1.35 - cur;
      }
    // and never let a fan child drift ACROSS its parent's vertical lane —
    // the parent's own stem arrives there, and a crossed lane tangles the
    // fan into crossings the repair pass can only chase, not fix
    for (const [pid, arr] of sibs)
      for (const id of arr) {
        const side = baseX.get(id)! - baseX.get(pid)!;
        if (Math.abs(side) < 1) continue; // plumb chain children stay plumb
        const px2 = baseX.get(pid)! + off.get(pid)!.dx;
        const cur = baseX.get(id)! + off.get(id)!.dx;
        if (side > 0 && cur < px2 + 12) off.get(id)!.dx += px2 + 12 - cur;
        else if (side < 0 && cur > px2 - 12) off.get(id)!.dx -= cur - (px2 - 12);
      }
    // nor SINK into the parent's fan base — the dome floor must survive the
    // drift, or low labels end up lying among the limbs again
    for (const [pid, arr] of sibs) {
      const lim = dy * (arr.length === 1 ? 0.4 : 0.55);
      const pj = baseY.get(pid)! + off.get(pid)!.dy;
      for (const id of arr) {
        const cj = baseY.get(id)! + off.get(id)!.dy;
        if (cj > pj - lim) off.get(id)!.dy -= cj - (pj - lim);
      }
    }
  }

  // hand-placed grace notes: a couple of glosses the forces leave kissing a
  // curve (each balanced against its own constraints). Moved by eye, verified
  // by screenshot; the crossing-repair pass below still runs after these.
  const NUDGE: Record<string, [number, number]> = {
    // Trost/troost (leaves of *traustą) get lifted into the canopy by the dome,
    // so their links shoot straight up through the truth branch sitting above
    // *traustą. Pull them back down to short twigs beside their parent. These are
    // PINNED below so the crossing-repair leaves them exactly here.
    "de-trost": [-30, -80],
    "nl-troost": [-150, 85],
    // trim's gloss reached up-right into the big "trough" label — slide it left.
    "trim": [-95, 15],
    // Derry sits naturally right on top of deodar; lift it UP (above its parent
    // doire, smooth vertical link) so its long gloss clears the big deodar label.
    "derry": [-48, -35],
  };
  // hand-placed nodes the crossing-repair must NOT shove around (else it cascades).
  const pinned = new Set(Object.keys(NUDGE));
  for (const [id, [ndx, ndy]] of Object.entries(NUDGE)) {
    const o = off.get(id);
    if (o) {
      o.dx += ndx;
      o.dy += ndy;
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
    for (let i = 0; i <= 96; i++) {
      const u = i / 96;
      const v = 1 - u;
      pts.push([
        v * v * v * s.x + 3 * v * v * u * s.x + 3 * v * u * u * t.x + u * u * u * t.x,
        v * v * v * s.y + 3 * v * v * u * my + 3 * v * u * u * my + u * u * u * t.y,
      ]);
    }
    return pts;
  };
  // moving a node that sits in a single-child CHAIN must carry the chain
  // above it — a lone sideways slide would fold the plumb column into a jog
  const childrenOf = new Map<string, LaidNode[]>();
  for (const l of links) (childrenOf.get(l.source.id) ?? childrenOf.set(l.source.id, []).get(l.source.id)!).push(l.target);
  const moveWithChain = (n: LaidNode, mx: number, my2: number) => {
    let cur: LaidNode | undefined = n;
    while (cur) {
      cur.x += mx;
      cur.y += my2;
      const kids = childrenOf.get(cur.id);
      cur = kids && kids.length === 1 ? kids[0] : undefined;
    }
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
  // curves are tested chunk-by-chunk: 8 sub-bboxes per curve let crossing-free
  // pairs bail out after a few rectangle tests instead of 96×96 segment tests
  const CH = 8;
  const SEG = 96 / CH;
  for (let pass = 0; pass < 26; pass++) {
    const flat = links.map((l) => sample(l));
    const chunks = flat.map((pts) => {
      const cs: number[][] = [];
      for (let c = 0; c < CH; c++) {
        const b = [Infinity, Infinity, -Infinity, -Infinity];
        for (let k = c * SEG; k <= (c + 1) * SEG; k++) {
          const p = pts[k];
          if (p[0] < b[0]) b[0] = p[0];
          if (p[1] < b[1]) b[1] = p[1];
          if (p[0] > b[2]) b[2] = p[0];
          if (p[1] > b[3]) b[3] = p[1];
        }
        cs.push(b);
      }
      return cs;
    });
    const box = chunks.map((cs) => [
      Math.min(...cs.map((b) => b[0])),
      Math.min(...cs.map((b) => b[1])),
      Math.max(...cs.map((b) => b[2])),
      Math.max(...cs.map((b) => b[3])),
    ]);
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
        for (let ca = 0; ca < CH && !hit; ca++)
          for (let cb = 0; cb < CH && !hit; cb++) {
            const ba = chunks[i][ca];
            const bb2 = chunks[j][cb];
            if (ba[2] < bb2[0] || bb2[2] < ba[0] || ba[3] < bb2[1] || bb2[3] < ba[1]) continue;
            for (let a = ca * SEG; a < (ca + 1) * SEG && !hit; a++)
              for (let b = cb * SEG; b < (cb + 1) * SEG && !hit; b++) {
                const h = cross(flat[i][a], flat[i][a + 1], flat[j][b], flat[j][b + 1]);
                if (h && !joints.some((njt) => Math.hypot(h[0] - njt.x, h[1] - njt.y) < 15)) hit = h;
              }
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
          if (!pinned.has(n.id)) moveWithChain(n, px2 * 14, py2 * 14);
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
          if (!pinned.has(light.id))
            moveWithChain(light, ((light.x - bx) / dn) * 13, ((light.y - by) / dn) * 13);
        }
        moved = true;
      }
    }
    if (!moved) break;
  }

  return { nodes, links, byId, width: maxX - minX, height: spanY + dy };
}

/** Ground-truth crossing detector for the poster: samples every drawn curve and
 *  reports any pair of links that actually intersect away from a shared node.
 *  Used to verify the render programmatically instead of eyeballing crops. */
export function findCrossings(links: LaidLink[]): Array<[string, string, number, number]> {
  const sample = (l: LaidLink): [number, number][] => {
    const { source: s, target: t } = l;
    const my = (s.y + t.y) / 2;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 96; i++) {
      const u = i / 96;
      const v = 1 - u;
      pts.push([
        v * v * v * s.x + 3 * v * v * u * s.x + 3 * v * u * u * t.x + u * u * u * t.x,
        v * v * v * s.y + 3 * v * v * u * my + 3 * v * u * u * my + u * u * u * t.y,
      ]);
    }
    return pts;
  };
  const seg = (
    a: [number, number],
    b: [number, number],
    c: [number, number],
    d: [number, number],
  ): [number, number] | null => {
    const r = [b[0] - a[0], b[1] - a[1]];
    const s2 = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * s2[1] - r[1] * s2[0];
    if (Math.abs(den) < 1e-12) return null;
    const t = ((c[0] - a[0]) * s2[1] - (c[1] - a[1]) * s2[0]) / den;
    const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null;
  };
  const flat = links.map(sample);
  const out: Array<[string, string, number, number]> = [];
  for (let i = 0; i < links.length; i++) {
    for (let j = i + 1; j < links.length; j++) {
      const A = links[i];
      const B = links[j];
      const joints = [A.source, A.target].filter((n) => n === B.source || n === B.target);
      let hit: [number, number] | null = null;
      for (let a = 0; a < 96 && !hit; a++)
        for (let b = 0; b < 96 && !hit; b++) {
          const h = seg(flat[i][a], flat[i][a + 1], flat[j][b], flat[j][b + 1]);
          if (h && !joints.some((n) => Math.hypot(h[0] - n.x, h[1] - n.y) < 16)) hit = h;
        }
      if (hit) out.push([A.id, B.id, Math.round(hit[0]), Math.round(hit[1])]);
    }
  }
  return out;
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
