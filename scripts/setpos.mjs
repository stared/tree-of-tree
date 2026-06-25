// manual position edits: node scripts/setpos.mjs FILE id1 x1 y1 id2 x2 y2 ...
import { readFileSync, writeFileSync } from "fs";
const f = process.argv[2];
const p = JSON.parse(readFileSync(f, "utf8"));
const a = process.argv.slice(3);
for (let i = 0; i < a.length; i += 3) p[a[i]] = [+a[i + 1], +a[i + 2]];
writeFileSync(f, JSON.stringify(p));
console.log("set", a.length / 3, "positions");
