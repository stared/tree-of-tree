// Relative branch shift: node scripts/shift.mjs FILE TOPO id dx dy [sub] ...
// moves node id by (dx,dy). If "sub", moves its whole subtree (keeps branch rigid).
import { readFileSync, writeFileSync } from "fs";
const f = process.argv[2], topo = process.argv[3];
const p = JSON.parse(readFileSync(f, "utf8"));
const a = JSON.parse(readFileSync(topo, "utf8"));
const kids = {}; a.forEach((n) => { if (n.parent) (kids[n.parent] ??= []).push(n.id); });
const sub = (id, acc = []) => { acc.push(id); (kids[id] || []).forEach((c) => sub(c, acc)); return acc; };
const args = process.argv.slice(4);
let i = 0;
while (i < args.length) {
  const id = args[i], dx = +args[i + 1], dy = +args[i + 2];
  const isSub = args[i + 3] === "sub"; i += isSub ? 4 : 3;
  const targets = isSub ? sub(id) : [id];
  for (const t of targets) { if (p[t]) { p[t][0] += dx; p[t][1] += dy; } }
  console.log(`shift ${id} by (${dx},${dy})${isSub ? " +subtree(" + targets.length + ")" : ""}`);
}
writeFileSync(f, JSON.stringify(p));
