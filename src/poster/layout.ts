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
  /** EXPERIMENTAL: after the tidy layout, run a force-directed relaxation
   *  (node + label repulsion, edge springs, angle-straightening, edge–edge
   *  repulsion) to even out the placement and fill the empty bottom. Pass an
   *  object to override individual force constants. */
  force?: boolean | Record<string, number | boolean>;
  /** MANUAL layout: explicit id → [x, y] positions for every node (the
   *  hand-tunable source of truth). When given, the solver is skipped entirely
   *  and these positions are used verbatim. */
  positions?: Record<string, [number, number]>;
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
  // EXPERIMENTAL force-directed relaxation params (null = off → hand-nudged tidy)
  const FP = opts.force
    ? {
        rest: dy * 0.5, // ideal parent→child distance (fan edges)
        chainrest: dy * 0.3, // shorter rest for single-child chains (compress trunk)
        mingap: dy * 0.34, // child must clear its parent by ≥ this (bottom-up)
        krep: 30000, // node–node repulsion
        klabel: 0.5, // label-box separation
        kspring: 0.05, // edge spring stiffness
        kangle: 0.09, // straighten toward continuation of incoming direction
        kedge: 1800, // edge–edge repulsion (midpoints)
        kgrav: 0, // compaction: pull every node toward the centroid (denser = bigger font)
        kdens: 0, // UNIFORMITY: push each label down the Gaussian density gradient
        //              (toward emptier space) → fills voids evenly. Annealed.
        densSigma: 70, // Gaussian radius of the density field
        ydamp: 1, // <1 damps the density force's vertical spread → content widens (→ landscape)
        sibgap: dx, // min x-gap enforced between ordered siblings (planarity)
        planar: 0, // 1 = enforce sibling-order + lane (opt-in planarity guard)
        repairPasses: 26, // crossing-repair iterations afterwards
        repairStep: 13, // px moved per repair pass
        nudge: 0, // 1 = apply the hand de-tangle pins (config-specific)
        xbias: 1, // >1 spreads horizontally more than vertically (→ landscape)
        iters: 800,
        temp0: 70, // initial per-step move cap (cooled each iter)
        repair: true, // run the crossing-repair pass afterwards
        ...(typeof opts.force === "object" ? opts.force : {}),
      }
    : null;

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
    // ārwa lands right beside δόρυ, so its label sits on top of δόρυ's long
    // "wood; a spear-shaft, spear" gloss. Lift it straight up off the gloss.
    "txb-arwa": [6, -52],
    // здоро́вий sits in the path of the BIG headline "zdrowy" form (which sweeps
    // up-right through it). Push it up-and-right, clear above zdrowy's reach.
    "uk-zdorovyj": [56, -46],
  };
  // hand-placed nodes the crossing-repair must NOT shove around (else it cascades).
  // (Skipped entirely under force-mode — physics re-places everything.)
  const pinned = new Set(FP ? [] : Object.keys(NUDGE));
  if (!FP)
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

  // ─── MANUAL positions override: use the hand-tuned JSON verbatim ─────────
  // Skips the whole solver. Links already reference these node objects, so
  // overriding x/y here repositions the edges too. Re-origin to (0,0).
  if (opts.positions) {
    for (const n of nodes) {
      const p = opts.positions[n.id];
      if (p) {
        n.x = p[0];
        n.y = p[1];
      }
    }
    let mnx = Infinity,
      mny = Infinity,
      mxx = -Infinity,
      mxy = -Infinity;
    for (const n of nodes) {
      mnx = Math.min(mnx, n.x);
      mny = Math.min(mny, n.y);
      mxx = Math.max(mxx, n.x);
      mxy = Math.max(mxy, n.y);
    }
    for (const n of nodes) {
      n.x -= mnx;
      n.y -= mny;
    }
    return { nodes, links, byId, width: mxx - mnx, height: mxy - mny };
  }

  // ─── EXPERIMENTAL force-directed relaxation ─────────────────────────────
  // Seed from the tidy layout, then let physics even it out:
  //   • every node repels every other (spreads the canopy, fills the frame)
  //   • each label is a BOX that repels other labels (text, not just dots)
  //   • parent→child edges are springs at one common rest length (even gaps)
  //   • a straightening force pulls each child toward the continuation of its
  //     parent's incoming direction (penalises sharp turns / big angles)
  //   • edges repel edges via their midpoints (fans splay, don't bundle)
  // A hard monotonic projection keeps every child ABOVE its parent each step,
  // so the tree stays bottom-up and readable however the forces shove it.
  if (FP) {
    const N = nodes.length;
    const ix = new Map(nodes.map((n, i) => [n.id, i]));
    const X = nodes.map((n) => n.x);
    const Y = nodes.map((n) => n.y);
    const parentIx = new Int32Array(N).fill(-1);
    const childCount = new Int32Array(N);
    const edges: [number, number][] = [];
    for (const l of links) {
      const a = ix.get(l.source.id)!;
      const b = ix.get(l.target.id)!;
      parentIx[b] = a;
      childCount[a]++;
      edges.push([a, b]);
    }
    const rootIx = nodes.findIndex((n) => n.data.kind === "root");
    const depthOrder = nodes.map((_, i) => i).sort((a, b) => nodes[a].depth - nodes[b].depth);

    // label half-footprint (force-aware: important words render ~2× in CSS)
    const lw = new Float64Array(N); // along-text width
    const lh = new Float64Array(N); // stack height below the baseline
    for (let i = 0; i < N; i++) {
      const d = nodes[i].data;
      const imp = d.important ? 2 : 1; // headline words render ~2× in CSS
      const formW = d.form.length * CPU * imp;
      const glossW = showsGloss(d) ? (d.gloss?.length ?? 0) * CPU * 0.7 : 0;
      const trW = (d.translit?.length ?? 0) * CPU * 0.7;
      lw[i] = Math.max(formW, glossW, trW);
      const lines = 1 + (d.translit ? 1 : 0) + (showsGloss(d) ? 1 : 0);
      lh[i] = lines * 14 + (d.important ? 14 : 0);
    }
    const boxL = (i: number) => X[i] - 8;
    const boxR = (i: number) => X[i] + 10 + lw[i] * 0.86;
    const boxT = (i: number) => Y[i] - (lw[i] * 0.5 + lh[i]);
    const boxB = (i: number) => Y[i] + 10;

    // planarity scaffolding: freeze the seed left→right sibling order + each
    // child's side of its parent, so compaction can't swap branches into crossings
    const seedX = X.slice();
    const kidsByParent = new Map<number, number[]>();
    for (const [a, b] of edges) (kidsByParent.get(a) ?? kidsByParent.set(a, []).get(a)!).push(b);
    for (const [, arr] of kidsByParent) arr.sort((u, v) => seedX[u] - seedX[v]);
    const sideOf = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const p = parentIx[i];
      sideOf[i] = p >= 0 ? Math.sign(seedX[i] - seedX[p]) : 0;
    }
    const SIBGAP = FP.sibgap as number;

    const fx = new Float64Array(N);
    const fy = new Float64Array(N);
    const xb = FP.xbias as number; // anisotropy: widen the spread (landscape)
    let temp = FP.temp0 as number;
    for (let it = 0; it < (FP.iters as number); it++) {
      fx.fill(0);
      fy.fill(0);
      // 0. DENSITY-FIELD uniformity (the key force): push each label down the
      //    gradient of the summed Gaussian density of all others → toward emptier
      //    space. Fills voids EVENLY (unlike pairwise repulsion, which clumps +
      //    voids). Annealed so it spreads early, then label-repulsion cleans up.
      //    ydamp<1 weakens its vertical spread so content widens toward landscape.
      const kd = FP.kdens as number;
      if (kd !== 0) {
        const anneal = Math.max(0.12, 1 - it / (FP.iters as number));
        const ds2 = 2 * (FP.densSigma as number) ** 2;
        const sc = anneal * kd * (2 / ds2) * (FP.densSigma as number);
        const yd = FP.ydamp as number;
        for (let i = 0; i < N; i++) {
          let gx = 0,
            gy = 0;
          for (let j = 0; j < N; j++) {
            if (i === j) continue;
            const dx2 = X[i] - X[j];
            const dy2 = Y[i] - Y[j];
            const g = ((lw[j] * lh[j]) / 4000) * Math.exp(-(dx2 * dx2 + dy2 * dy2) / ds2);
            gx += g * dx2;
            gy += g * dy2;
          }
          fx[i] += gx * sc;
          fy[i] += gy * sc * yd;
        }
      }
      // 1. node–node repulsion (all pairs)
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          let dx2 = X[i] - X[j];
          let dy2 = Y[i] - Y[j];
          let d2 = dx2 * dx2 + dy2 * dy2;
          if (d2 < 1) {
            d2 = 1;
            dx2 = 1;
            dy2 = 0;
          }
          const d = Math.sqrt(d2);
          const f = (FP.krep as number) / d2;
          const ux = (dx2 / d) * f * xb;
          const uy = (dy2 / d) * f;
          fx[i] += ux;
          fy[i] += uy;
          fx[j] -= ux;
          fy[j] -= uy;
        }
      }
      // 2. label-box repulsion (overlapping label rectangles push apart)
      for (let i = 0; i < N; i++) {
        const Al = boxL(i),
          Ar = boxR(i),
          At = boxT(i),
          Ab = boxB(i);
        for (let j = i + 1; j < N; j++) {
          const ox = Math.min(Ar, boxR(j)) - Math.max(Al, boxL(j));
          if (ox <= 0) continue;
          const oy = Math.min(Ab, boxB(j)) - Math.max(At, boxT(j));
          if (oy <= 0) continue;
          let vx = (Al + Ar - boxL(j) - boxR(j)) / 2;
          let vy = (At + Ab - boxT(j) - boxB(j)) / 2;
          if (Math.abs(vy) < 4) vy = vx > 0 ? 4 : -4;
          if (vx === 0 && vy === 0) vx = 1;
          const m = Math.hypot(vx, vy) || 1;
          const pen = Math.min(ox, oy) * (FP.klabel as number);
          fx[i] += (vx / m) * pen;
          fy[i] += (vy / m) * pen;
          fx[j] -= (vx / m) * pen;
          fy[j] -= (vy / m) * pen;
        }
      }
      // 3. edge springs + 4. angle straightening
      for (const [a, b] of edges) {
        let vx = X[b] - X[a];
        let vy = Y[b] - Y[a];
        const d = Math.hypot(vx, vy) || 1;
        const rest = childCount[a] === 1 ? (FP.chainrest as number) : (FP.rest as number);
        const sf = (FP.kspring as number) * (d - rest);
        const ux = vx / d;
        const uy = vy / d;
        fx[b] -= ux * sf;
        fy[b] -= uy * sf;
        fx[a] += ux * sf;
        fy[a] += uy * sf;
        // incoming direction at the parent (root: straight up)
        const gp = parentIx[a];
        let inx: number, iny: number;
        if (gp >= 0) {
          inx = X[a] - X[gp];
          iny = Y[a] - Y[gp];
          const im = Math.hypot(inx, iny) || 1;
          inx /= im;
          iny /= im;
        } else {
          inx = 0;
          iny = -1;
        }
        const tx = X[a] + inx * d; // where b sits if it continues straight
        const ty = Y[a] + iny * d;
        fx[b] += (tx - X[b]) * (FP.kangle as number);
        fy[b] += (ty - Y[b]) * (FP.kangle as number);
      }
      // 5. edge–edge repulsion (midpoints, non-adjacent only)
      for (let i = 0; i < edges.length; i++) {
        const [a1, b1] = edges[i];
        const mx1 = (X[a1] + X[b1]) / 2;
        const my1 = (Y[a1] + Y[b1]) / 2;
        for (let j = i + 1; j < edges.length; j++) {
          const [a2, b2] = edges[j];
          if (a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2) continue;
          let dx2 = mx1 - (X[a2] + X[b2]) / 2;
          let dy2 = my1 - (Y[a2] + Y[b2]) / 2;
          let d2 = dx2 * dx2 + dy2 * dy2;
          if (d2 < 1) {
            d2 = 1;
            dx2 = 1;
            dy2 = 0;
          }
          const d = Math.sqrt(d2);
          const f = (FP.kedge as number) / d2;
          const ux = (dx2 / d) * f * xb;
          const uy = (dy2 / d) * f;
          fx[a1] += ux;
          fy[a1] += uy;
          fx[b1] += ux;
          fy[b1] += uy;
          fx[a2] -= ux;
          fy[a2] -= uy;
          fx[b2] -= ux;
          fy[b2] -= uy;
        }
      }
      // 6. compaction: gravity toward the centroid keeps the layout tight, so
      //    the fit-to-frame scale (and thus the on-screen font) stays large.
      const kg = FP.kgrav as number;
      if (kg !== 0) {
        let gx = 0,
          gy = 0;
        for (let i = 0; i < N; i++) {
          gx += X[i];
          gy += Y[i];
        }
        gx /= N;
        gy /= N;
        for (let i = 0; i < N; i++) {
          fx[i] += (gx - X[i]) * kg;
          fy[i] += (gy - Y[i]) * kg;
        }
      }
      // integrate (root frozen), capped by the cooling temperature
      for (let i = 0; i < N; i++) {
        if (i === rootIx) continue;
        let mvx = fx[i] * 0.5;
        let mvy = fy[i] * 0.5;
        mvx = Math.max(-temp, Math.min(temp, mvx));
        mvy = Math.max(-temp, Math.min(temp, mvy));
        X[i] += mvx;
        Y[i] += mvy;
      }
      // hard monotonic projection: every child sits ABOVE its parent
      for (const i of depthOrder) {
        const p = parentIx[i];
        if (p < 0) continue;
        if (Y[i] > Y[p] - (FP.mingap as number)) Y[i] = Y[p] - (FP.mingap as number);
      }
      // planarity projection (opt-in): keep each child on its original side of
      // the parent's lane + hold sibling order with a gap. Centre it on the
      // parent so it doesn't ratchet the whole layout sideways.
      if (FP.planar) {
        for (const [p, arr] of kidsByParent) {
          if (p >= 0)
            for (const c of arr) {
              if (sideOf[c] > 0 && X[c] < X[p] + 12) X[c] = X[p] + 12;
              else if (sideOf[c] < 0 && X[c] > X[p] - 12) X[c] = X[p] - 12;
            }
          for (let k = 1; k < arr.length; k++)
            if (X[arr[k]] < X[arr[k - 1]] + SIBGAP) {
              const push = (X[arr[k - 1]] + SIBGAP - X[arr[k]]) / 2;
              X[arr[k]] += push;
              X[arr[k - 1]] -= push;
            }
        }
      }
      temp = Math.max(6, temp * 0.996);
    }
    // write back + re-origin
    let mnX = Infinity,
      mnY = Infinity;
    for (let i = 0; i < N; i++) {
      if (X[i] < mnX) mnX = X[i];
      if (Y[i] < mnY) mnY = Y[i];
    }
    for (let i = 0; i < N; i++) {
      nodes[i].x = X[i] - mnX;
      nodes[i].y = Y[i] - mnY;
    }
    // targeted de-tangle for the locked default config: two leaves whose edges
    // clip a neighbouring trunk branch (compaction interleaved sibling sectors).
    // Pinned so the crossing-repair leaves them exactly here. Deterministic, so
    // these are as stable as the tidy layout's hand nudges.
    const FORCE_NUDGE: Record<string, [number, number]> = FP.nudge
      ? { "got-triu": [-292, 5], "uk-zdorovyj": [-310, -108] }
      : {};
    for (const [id, [ndx, ndy]] of Object.entries(FORCE_NUDGE)) {
      const nd = byId.get(id);
      if (nd) {
        nd.x += ndx;
        nd.y += ndy;
        pinned.add(id);
      }
    }
  }

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
  // force-mode tangles are whole subtrees overlapping, so translate the ENTIRE
  // subtree as a rigid body (not just the single-child chain) — separates the
  // two tangled branches without tearing either one apart internally.
  const moveSubtree = (n: LaidNode, mx: number, my2: number) => {
    const stack = [n];
    while (stack.length) {
      const cur = stack.pop()!;
      cur.x += mx;
      cur.y += my2;
      const kids = childrenOf.get(cur.id);
      if (kids) for (const k of kids) stack.push(k);
    }
  };
  const mover = FP ? moveSubtree : moveWithChain;
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
  const REPAIR_PASSES = FP && !FP.repair ? 0 : FP ? (FP.repairPasses as number) : 26;
  const REPAIR_STEP = FP ? (FP.repairStep as number) : 13;
  for (let pass = 0; pass < REPAIR_PASSES; pass++) {
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
          if (!pinned.has(n.id)) mover(n, px2 * (REPAIR_STEP + 1), py2 * (REPAIR_STEP + 1));
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
            mover(light, ((light.x - bx) / dn) * REPAIR_STEP, ((light.y - by) / dn) * REPAIR_STEP);
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
