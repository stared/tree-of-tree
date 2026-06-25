// One relaxation step. Args: FILE TOPO BASE "a:b" "c:d" ...  (overlap pairs)
// Pushes the LEAF of each pair away from the other node (with up-right label bias).
// If both are internal, moves the smaller subtree. Caps each node's total drift
// from BASE (tidy) so the shape stays tidy. Leaves/roots never exceed driftMax.
import { readFileSync, writeFileSync } from "fs";
const [file, topo, base] = process.argv.slice(2, 5);
const pairs = process.argv.slice(5).map((s) => s.split(":"));
const p = JSON.parse(readFileSync(file, "utf8"));
const b0 = JSON.parse(readFileSync(base, "utf8"));
const A = JSON.parse(readFileSync(topo, "utf8"));
const kids = {}; const parent = {};
A.forEach((n) => { parent[n.id] = n.parent; if (n.parent) (kids[n.parent] ??= []).push(n.id); });
const subtree = (id, acc = []) => { acc.push(id); (kids[id] || []).forEach((c) => subtree(c, acc)); return acc; };
const isLeaf = (id) => !(kids[id] && kids[id].length);
const subSize = (id) => subtree(id).length;
const STEP = Number(process.env.STEP ?? 16);
const DRIFT = Number(process.env.DRIFT ?? 150);
// label points up-right (−32°): bias pushes have an up-right component so labels clear
const UR = [Math.cos(-32 * Math.PI / 180), Math.sin(-32 * Math.PI / 180)]; // (.85,-.53)
function shove(id, dx, dy) {
  // cap drift from base for the node itself
  const targets = isLeaf(id) ? [id] : subtree(id);
  for (const t of targets) { if (p[t]) { p[t][0] += dx; p[t][1] += dy; } }
}
for (const [a, b] of pairs) {
  if (!p[a] || !p[b]) continue;
  // direction from b-node to a-node
  let vx = p[a][0] - p[b][0], vy = p[a][1] - p[b][1];
  const m = Math.hypot(vx, vy) || 1; vx /= m; vy /= m;
  // pick mover: prefer the leaf; if both leaves, move both apart; if both internal, smaller subtree
  const aLeaf = isLeaf(a), bLeaf = isLeaf(b);
  if (aLeaf && bLeaf) {
    shove(a, vx * STEP * 0.6 + UR[0] * STEP * 0.4, vy * STEP * 0.6 + UR[1] * STEP * 0.4);
    shove(b, -vx * STEP * 0.6, -vy * STEP * 0.6);
  } else if (aLeaf) {
    shove(a, vx * STEP, vy * STEP);
  } else if (bLeaf) {
    shove(b, -vx * STEP, -vy * STEP);
  } else {
    const mover = subSize(a) <= subSize(b) ? a : b;
    const s = mover === a ? 1 : -1;
    shove(mover, s * vx * STEP, s * vy * STEP);
  }
}
// enforce drift cap (pull back toward base if a node wandered too far)
for (const id of Object.keys(p)) {
  if (!b0[id]) continue;
  const dx = p[id][0] - b0[id][0], dy = p[id][1] - b0[id][1];
  const d = Math.hypot(dx, dy);
  if (d > DRIFT) { p[id][0] = b0[id][0] + dx / d * DRIFT; p[id][1] = b0[id][1] + dy / d * DRIFT; }
}
writeFileSync(file, JSON.stringify(p));
console.log(`relaxed ${pairs.length} pairs (step ${STEP})`);
