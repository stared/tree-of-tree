// Order children at EVERY level so the story's camera sweep is smooth. We build
// an abstract model — leaves get an index by their left→right order (which the
// per-node child permutations determine); a chapter's camera position is the
// mean leaf-index of the subtree it frames; the whole-tree framings (intro seed
// + closing colophon) sit at the centre. We then MINIMISE the sum of SQUARED
// step-to-step travel (squared, so one big flight costs far more than several
// small hops — and the centre anchors pull the opening `tree` inward) by
// simulated annealing over all per-node permutations. Pure permutation: lossless
// inside each node block, no node added or lost. Deterministic (seeded PRNG).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const TS = "src/data/etymology.ts";
let content = readFileSync(TS, "utf8");

// ── string-aware bracket tools ──────────────────────────────────────────────
function matchClose(s, i) {
  let d = 0, q = "";
  for (; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = ""; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "[" || c === "{") d++;
    else if (c === "]" || c === "}") { if (--d === 0) return i; }
  }
  throw new Error("unbalanced");
}
function splitObjects(body) {
  const out = []; let d = 0, start = -1, q = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = ""; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{" || c === "[") { if (d === 0 && c === "{") start = i; d++; }
    else if (c === "}" || c === "]") { if (--d === 0 && c === "}") out.push(body.slice(start, i + 1)); }
  }
  return out;
}
function parse(t) {
  const id = (t.match(/id: "([^"]+)"/) || [])[1];
  const ci = t.indexOf("children: [");
  let children = [];
  if (ci >= 0) { const ob = t.indexOf("[", ci); children = splitObjects(t.slice(ob + 1, matchClose(t, ob))).map(parse); }
  return { id, children };
}

const ts = content.indexOf("{", content.indexOf("export const TREE"));
const tree = parse(content.slice(ts, matchClose(content, ts) + 1));

// ── model: nodes, leaves-per-node, decision nodes, original orders ───────────
const nodeById = new Map();
const leavesOf = new Map(); // id -> [leafId]
(function index(n) {
  nodeById.set(n.id, n);
  if (!n.children.length) { leavesOf.set(n.id, [n.id]); return; }
  n.children.forEach(index);
  leavesOf.set(n.id, n.children.flatMap((c) => leavesOf.get(c.id)));
})(tree);

const decisions = [...nodeById.values()].filter((n) => n.children.length >= 2);
const orig = new Map(decisions.map((n) => [n.id, n.children.map((c) => c.id)]));
const state = new Map([...orig].map(([k, v]) => [k, v.slice()])); // working order

const allLeaves = leavesOf.get(tree.id);
const L = allLeaves.length;

// ── chapters in narrative order (focus leaf-sets); whole-tree framings centred ─
const stepDir = "src/content/steps";
const steps = readdirSync(stepDir).filter((f) => f.endsWith(".md")).sort().map((f) => {
  const m = /focus:\s*\[([^\]]*)\]/.exec(readFileSync(`${stepDir}/${f}`, "utf8"));
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
});
// step1 (seed) already has empty focus → whole tree; append colophon (whole tree)
const chapters = [...steps, []].map((ids) => {
  const set = ids.length ? [...new Set(ids.flatMap((id) => leavesOf.get(id) || []))] : allLeaves;
  return set;
});

// ── objective: leaf index from current order, then Σ (Δpos)² + tiny tidiness ──
function leafIndex() {
  const idx = new Map(); let k = 0;
  (function walk(n) {
    if (!n.children.length) { idx.set(n.id, k++); return; }
    const order = state.has(n.id) ? state.get(n.id) : n.children.map((c) => c.id);
    for (const cid of order) walk(nodeById.get(cid));
  })(tree);
  return idx;
}
function inversions() {
  let inv = 0;
  for (const n of decisions) {
    const cur = state.get(n.id), o = orig.get(n.id), pos = new Map(o.map((id, i) => [id, i]));
    for (let i = 0; i < cur.length; i++) for (let j = i + 1; j < cur.length; j++) if (pos.get(cur[i]) > pos.get(cur[j])) inv++;
  }
  return inv;
}
const EPS = 0.01; // tidiness: prefer original order when travel is unaffected
function objective() {
  const idx = leafIndex();
  const pos = chapters.map((leaves) => leaves.reduce((a, l) => a + idx.get(l), 0) / leaves.length);
  let sum = 0;
  for (let i = 1; i < pos.length; i++) { const d = pos[i] - pos[i - 1]; sum += d * d; }
  return sum + EPS * inversions();
}

// ── simulated annealing with random restarts (seeded) ────────────────────────
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20260530);
const ri = (n) => Math.floor(rnd() * n);

function setOrder(id, arr) { state.set(id, arr); }
let best = null, bestObj = Infinity;
const baseObj = objective();

for (let restart = 0; restart < 24; restart++) {
  for (const n of decisions) setOrder(n.id, orig.get(n.id).slice()); // restart from original
  let cur = objective();
  const iters = 150000;
  const T0 = 250, T1 = 0.01, cool = Math.pow(T1 / T0, 1 / iters);
  let T = T0;
  for (let it = 0; it < iters; it++, T *= cool) {
    const n = decisions[ri(decisions.length)];
    const arr = state.get(n.id), prev = arr.slice(), m = arr.length;
    const move = ri(3);
    if (move === 0) { const i = ri(m), j = ri(m); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    else if (move === 1) { let i = ri(m), j = ri(m); if (i > j) [i, j] = [j, i]; while (i < j) [arr[i], arr[j]] = [arr[j], arr[i]], i++, j--; }
    else { const i = ri(m); const [x] = arr.splice(i, 1); arr.splice(ri(m), 0, x); }
    const o = objective();
    if (o <= cur || rnd() < Math.exp((cur - o) / T)) cur = o;
    else state.set(n.id, prev); // reject
    if (cur < bestObj) { bestObj = cur; best = new Map([...state].map(([k, v]) => [k, v.slice()])); }
  }
}
for (const [k, v] of best) state.set(k, v);

// ── report ───────────────────────────────────────────────────────────────────
const idx = leafIndex();
const labels = ["seed", "tree", "slavic", "oak", "druid", "dryad", "tar", "objects", "thicket", "faith", "latin", "dendro", "far", "colophon"];
const pos = chapters.map((leaves) => leaves.reduce((a, l) => a + idx.get(l), 0) / leaves.length);
console.log("L(eaves) =", L, " baseline Σd² =", baseObj.toFixed(1), " optimized Σd² =", bestObj.toFixed(1));
console.log("camera path (leaf-index):");
pos.forEach((p, i) => console.log("  ", labels[i].padEnd(9), p.toFixed(1)));

let changed = 0;
function apply(n) {
  n.children.forEach(apply);
  if (n.children.length < 2) return;
  const want = state.get(n.id), have = orig.get(n.id);
  if (want.join() !== have.join()) {
    const ob = content.indexOf("[", content.indexOf("children: [", content.indexOf(`id: "${n.id}"`)));
    const cb = matchClose(content, ob), body = content.slice(ob + 1, cb);
    const ind = (body.match(/\n([ ]+)\{/) || [, "  "])[1];
    const byId = new Map(splitObjects(body).map((t) => [(t.match(/id: "([^"]+)"/) || [])[1], t]));
    content = content.slice(0, ob + 1) + "\n" + want.map((id) => ind + byId.get(id)).join(",\n\n") + ",\n" + ind.slice(2) + content.slice(cb);
    changed++;
    console.log(`  reorder ${n.id}`);
  }
}
apply(tree);
writeFileSync(TS, content);
console.log(`reordered ${changed} node(s)`);
