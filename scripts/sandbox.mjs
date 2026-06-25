// ABSTRACT LAYOUT SANDBOX — no rendering, runs in ms, prints the label-density
// field as ASCII so I can SEE uniformity/voids and iterate the algorithm fast.
//
// Each label is a sized box (from its text) + an isotropic Gaussian (its "mass").
// The new idea vs old force: instead of pairwise repulsion (clumps + voids), a
// DENSITY-FIELD force pushes each label down the gradient of the summed Gaussian
// field — i.e. from crowded toward empty — which targets UNIFORM FILL directly.
//
// Constraints: tree springs (short edges), monotonic bottom-up (child above
// parent), oriented-box overlap removal, a 4:3 aspect shaping force.
//
// Usage: node scripts/sandbox.mjs [key=val ...]   e.g. node scripts/sandbox.mjs kdens=1.2 kaspect=0.02
import { readFileSync, writeFileSync } from "fs";
const NODES = JSON.parse(readFileSync("/tmp/abstract.json", "utf8"));

// ---- params (override from CLI) ----
const P = {
  iters: 600,
  kdens: 1.0, // uniformity: push down the density gradient (fill voids)
  ksprite: 0.04, // spring parent->child toward rest length
  rest: 90, // edge rest length
  kover: 0.6, // overlap removal strength
  boxW: 1300, // 4:3 containment box width (height = 0.75·boxW); walls push inward
  kwall: 0.08, // wall stiffness
  ydamp: 1.0, // <1 damps vertical density spread → content spreads WIDE (→ 4:3)
  kbar: 8000, // EDGE-CROSSING BARRIER: repel non-adjacent edges, →∞ as they meet
  barR: 130, // barrier range (edges closer than this start repelling)
  kturn: 0.0, // TURN PENALTY: pull each child toward the straight continuation of
  //              its parent's incoming edge → smooth branches, no sharp turns
  mingap: 40, // child must clear parent by this (bottom-up)
  sigma: 70, // Gaussian radius for the density field
  temp: 40,
  cool: 0.997,
  seed: 1, // 1 = start from tidy positions, 0 = start from a vertical line
};
for (const a of process.argv.slice(2)) {
  const [k, v] = a.split("=");
  if (k in P) P[k] = Number(v);
}

// ---- size each label (oriented −32° box → AABB, + gaussian sigma) ----
const RAD = (-32 * Math.PI) / 180, C = Math.cos(RAD), S = Math.sin(RAD);
const showsGloss = (n) => n.kind === "attested" || n.kind === "modern";
const L = NODES.map((n) => {
  const root = n.kind === "root";
  // regular words are now 27px (was 18 → +50%); headline 36; root 40. Must match poster.css.
  const formFont = root ? 40 : n.important ? 36 : 27;
  const formW = n.form.length * formFont * 0.58;
  const glossW = showsGloss(n) || root ? n.gloss.length * 13 * 0.5 : 0;
  const trW = n.translit ? n.translit.length * 11 * 0.55 : 0;
  const w = Math.max(formW, glossW, trW, 20);
  const lines = 1 + (n.translit ? 1 : 0) + (showsGloss(n) ? 1 : 0);
  const h = formFont * 1.1 + (lines - 1) * 15;
  // AABB of the rotated box (text reads up-right, so it mostly extends +x/−y)
  const aw = Math.abs(w * C) + Math.abs(h * S);
  const ah = Math.abs(w * S) + Math.abs(h * C);
  return { ...n, w, h, aw, ah, area: aw * ah };
});
const idx = new Map(L.map((l, i) => [l.id, i]));
const par = L.map((l) => (l.parent ? idx.get(l.parent) : -1));
const kids = L.map(() => []);
par.forEach((p, i) => { if (p >= 0) kids[p].push(i); });
const rootI = L.findIndex((l) => l.kind === "root");
const order = L.map((_, i) => i).sort((a, b) => L[a].depth - L[b].depth);

// ---- state ----
const X = new Float64Array(L.length), Y = new Float64Array(L.length);
L.forEach((l, i) => {
  X[i] = P.seed ? l.x : 0;
  Y[i] = P.seed ? l.y : -l.depth * 100; // y grows downward; root deepest? we use screen y (root big y)
});
// normalise so root at bottom (max y); our seed already has root at large y, leaves small y. good.

// closest points / distance between two segments AB, CD (for the crossing barrier)
function segClosest(ax, ay, bx, by, cx, cy, dx, dy) {
  const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy, wx = ax - cx, wy = ay - cy;
  const a = ux * ux + uy * uy, b = ux * vx + uy * vy, c = vx * vx + vy * vy, d = ux * wx + uy * wy, e = vx * wx + vy * wy;
  const D = a * c - b * b;
  let sc, tc;
  if (D < 1e-9) { sc = 0; tc = c > 1e-9 ? e / c : 0; }
  else { sc = (b * e - c * d) / D; tc = (a * e - b * d) / D; }
  sc = Math.max(0, Math.min(1, sc)); tc = Math.max(0, Math.min(1, tc));
  const px = ax + sc * ux, py = ay + sc * uy, qx = cx + tc * vx, qy = cy + tc * vy;
  return { d: Math.hypot(px - qx, py - qy), px, py, qx, qy, sc, tc };
}
// edge list (non-adjacent pairs share no node)
const EDGES = [];
for (let i = 0; i < L.length; i++) if (par[i] >= 0) EDGES.push([par[i], i]);

// density field grid (covers current bbox each eval)
function bbox() {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < L.length; i++) {
    x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]);
    y0 = Math.min(y0, Y[i]); y1 = Math.max(y1, Y[i]);
  }
  return [x0, y0, x1, y1];
}

const fx = new Float64Array(L.length), fy = new Float64Array(L.length);
let temp = P.temp;
for (let it = 0; it < P.iters; it++) {
  fx.fill(0); fy.fill(0);
  const s2 = 2 * P.sigma * P.sigma;
  // anneal: uniformity force fades so overlap-removal wins the endgame (→ no overlap)
  const anneal = Math.max(0.12, 1 - it / P.iters);

  // 1. DENSITY-FIELD uniformity: each label pushed down the gradient of the
  //    summed Gaussian density of all OTHERS → moves toward emptier space.
  for (let i = 0; i < L.length; i++) {
    let gx = 0, gy = 0;
    for (let j = 0; j < L.length; j++) {
      if (i === j) continue;
      const dx = X[i] - X[j], dy = Y[i] - Y[j];
      const d2 = dx * dx + dy * dy;
      const g = (L[j].area / 4000) * Math.exp(-d2 / s2); // j's density at i
      // gradient of exp(-d2/s2) wrt position of i is (-2/s2)*(dx,dy)*exp; we want
      // to move DOWN the field (toward lower density) → +grad of (−field)= push along (dx,dy)
      gx += g * dx; gy += g * dy;
    }
    fx[i] += anneal * P.kdens * gx * (2 / s2) * P.sigma; // scaled to ~unit
    fy[i] += anneal * P.kdens * gy * (2 / s2) * P.sigma * P.ydamp; // ydamp<1 → spreads wide
  }

  // 2. tree springs (keep edges near rest length → connected, short)
  for (let i = 0; i < L.length; i++) {
    const p = par[i]; if (p < 0) continue;
    const dx = X[i] - X[p], dy = Y[i] - Y[p];
    const d = Math.hypot(dx, dy) || 1;
    const f = P.ksprite * (d - P.rest);
    fx[i] -= (dx / d) * f; fy[i] -= (dy / d) * f;
    fx[p] += (dx / d) * f; fy[p] += (dy / d) * f;
  }

  // 3. overlap removal (AABB) — guarantees readable, non-overlapping labels
  for (let i = 0; i < L.length; i++)
    for (let j = i + 1; j < L.length; j++) {
      const ox = (L[i].aw + L[j].aw) / 2 - Math.abs(X[i] - X[j]);
      if (ox <= 0) continue;
      const oy = (L[i].ah + L[j].ah) / 2 - Math.abs(Y[i] - Y[j]);
      if (oy <= 0) continue;
      // push along smaller-overlap axis
      if (ox < oy) {
        const s = (X[i] < X[j] ? -1 : 1) * P.kover * ox * 0.5;
        fx[i] += s; fx[j] -= s;
      } else {
        const s = (Y[i] < Y[j] ? -1 : 1) * P.kover * oy * 0.5;
        fy[i] += s; fy[j] -= s;
      }
    }

  // 3a. TURN PENALTY: pull each child toward where it would sit if it continued
  //     straight along its parent's incoming direction → branches flow smoothly
  //     instead of zig-zagging. (root's children prefer straight up.)
  if (P.kturn) {
    for (let i = 0; i < L.length; i++) {
      const p = par[i];
      if (p < 0) continue;
      const gp = par[p];
      let inx, iny;
      if (gp >= 0) { inx = X[p] - X[gp]; iny = Y[p] - Y[gp]; const m = Math.hypot(inx, iny) || 1; inx /= m; iny /= m; }
      else { inx = 0; iny = -1; }
      const d = Math.hypot(X[i] - X[p], Y[i] - Y[p]) || 1;
      fx[i] += (X[p] + inx * d - X[i]) * P.kturn;
      fy[i] += (Y[p] + iny * d - Y[i]) * P.kturn;
    }
  }

  // 3b. EDGE-CROSSING BARRIER: every non-adjacent edge pair repels via the
  //     closest points, with force ∝ 1/d² → diverges as they approach crossing.
  //     Seeded planar, this keeps the layout planar THROUGHOUT (no post-repair).
  for (let a = 0; a < EDGES.length; a++) {
    const [p, q] = EDGES[a];
    for (let b = a + 1; b < EDGES.length; b++) {
      const [r, s] = EDGES[b];
      if (p === r || p === s || q === r || q === s) continue; // adjacent → skip
      const cl = segClosest(X[p], Y[p], X[q], Y[q], X[r], Y[r], X[s], Y[s]);
      if (cl.d > P.barR) continue;
      const f = P.kbar / (cl.d * cl.d + 25);
      let nx = (cl.px - cl.qx) / (cl.d || 1), ny = (cl.py - cl.qy) / (cl.d || 1);
      fx[p] += nx * f * (1 - cl.sc); fy[p] += ny * f * (1 - cl.sc);
      fx[q] += nx * f * cl.sc; fy[q] += ny * f * cl.sc;
      fx[r] -= nx * f * (1 - cl.tc); fy[r] -= ny * f * (1 - cl.tc);
      fx[s] -= nx * f * cl.tc; fy[s] -= ny * f * cl.tc;
    }
  }

  // 4. 4:3 boundary box (walls push inward only → stable). Density-flatten fills
  //    it uniformly; the box shapes the aspect. Centred on the current centroid.
  const [x0, y0, x1, y1] = bbox();
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const halfW = P.boxW / 2, halfH = (P.boxW * 0.75) / 2;
  for (let i = 0; i < L.length; i++) {
    if (X[i] > cx + halfW) fx[i] -= (X[i] - cx - halfW) * P.kwall;
    else if (X[i] < cx - halfW) fx[i] += (cx - halfW - X[i]) * P.kwall;
    if (Y[i] > cy + halfH) fy[i] -= (Y[i] - cy - halfH) * P.kwall;
    else if (Y[i] < cy - halfH) fy[i] += (cy - halfH - Y[i]) * P.kwall;
  }

  // integrate (root pinned in x at its column, free-ish), cap by temp
  for (let i = 0; i < L.length; i++) {
    if (i === rootI) continue;
    let mvx = Math.max(-temp, Math.min(temp, fx[i]));
    let mvy = Math.max(-temp, Math.min(temp, fy[i]));
    X[i] += mvx; Y[i] += mvy;
  }
  // monotonic bottom-up: child sits above parent (smaller y)
  for (const i of order) {
    const p = par[i]; if (p < 0) continue;
    if (Y[i] > Y[p] - P.mingap) Y[i] = Y[p] - P.mingap;
  }
  temp = Math.max(6, temp * P.cool);
}

// ---- metrics ----
function metrics() {
  const [x0, y0, x1, y1] = bbox();
  const W = x1 - x0, H = y1 - y0;
  const GX = 48, GY = 36;
  const cw = W / GX, ch = H / GY;
  const rho = new Float64Array(GX * GY);
  const s2 = 2 * P.sigma * P.sigma;
  for (let gi = 0; gi < GX; gi++)
    for (let gj = 0; gj < GY; gj++) {
      const px = x0 + (gi + 0.5) * cw, py = y0 + (gj + 0.5) * ch;
      let r = 0;
      for (let k = 0; k < L.length; k++) {
        const dx = px - X[k], dy = py - Y[k];
        r += (L[k].area / 4000) * Math.exp(-(dx * dx + dy * dy) / s2);
      }
      rho[gj * GX + gi] = r;
    }
  const occ = [...rho].filter((v) => v > 0.05);
  const mean = occ.reduce((a, b) => a + b, 0) / occ.length;
  const cv = Math.sqrt(occ.reduce((a, b) => a + (b - mean) ** 2, 0) / occ.length) / mean;
  const fill = [...rho].filter((v) => v > 0.3 * mean).length / (GX * GY);
  // overlaps
  let ov = 0;
  for (let i = 0; i < L.length; i++)
    for (let j = i + 1; j < L.length; j++) {
      if (Math.abs(X[i] - X[j]) < (L[i].aw + L[j].aw) / 2 && Math.abs(Y[i] - Y[j]) < (L[i].ah + L[j].ah) / 2) ov++;
    }
  // edge crossings (straight-segment proxy)
  const seg = (a, b, c, d) => {
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (!den) return false;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
    const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
  };
  const E = [];
  for (let i = 0; i < L.length; i++) if (par[i] >= 0) E.push([par[i], i]);
  let cross = 0;
  for (let a = 0; a < E.length; a++)
    for (let b = a + 1; b < E.length; b++) {
      const [p, q] = E[a], [r, s] = E[b];
      if (p === r || p === s || q === r || q === s) continue;
      if (seg([X[p], Y[p]], [X[q], Y[q]], [X[r], Y[r]], [X[s], Y[s]])) cross++;
    }
  return { W, H, aspect: W / H, cv, fill, ov, cross, fontProxy: 1600 / W, rho, GX, GY, x0, y0, cw, ch };
}
const M = metrics();

// ---- ASCII density map ----
const RAMP = " .:-=+*#%@";
let maxR = 0;
for (const v of M.rho) maxR = Math.max(maxR, v);
let art = "";
for (let gj = 0; gj < M.GY; gj++) {
  let row = "";
  for (let gi = 0; gi < M.GX; gi++) {
    const v = M.rho[gj * M.GX + gi] / (maxR || 1);
    row += RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
  }
  art += row + "\n";
}
console.log(art);
console.log(
  `aspect=${M.aspect.toFixed(2)} cv=${M.cv.toFixed(3)} fill=${M.fill.toFixed(3)} ` +
    `overlap=${M.ov} cross=${M.cross} fontProxy=${M.fontProxy.toFixed(2)} (W=${Math.round(M.W)} H=${Math.round(M.H)})`,
);
console.log(`params: ${Object.entries(P).map(([k, v]) => `${k}=${v}`).join(" ")}`);

// export positions JSON (the hand-tunable source of truth): id -> [x, y]
if (process.env.EXPORT) {
  let mnx = 1e9, mny = 1e9;
  for (let i = 0; i < L.length; i++) { mnx = Math.min(mnx, X[i]); mny = Math.min(mny, Y[i]); }
  const pos = {};
  L.forEach((l, i) => { pos[l.id] = [Math.round(X[i] - mnx), Math.round(Y[i] - mny)]; });
  writeFileSync(process.env.EXPORT, JSON.stringify(pos, null, 0));
  console.log(`exported ${L.length} positions -> ${process.env.EXPORT}`);
}
