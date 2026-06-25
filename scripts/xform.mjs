// transform a positions JSON: scale x,y about centre. node scripts/xform.mjs IN OUT kx ky
import { readFileSync, writeFileSync } from "fs";
const [IN, OUT, kx, ky] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5]];
const p = JSON.parse(readFileSync(IN, "utf8"));
const xs = Object.values(p).map((a) => a[0]), ys = Object.values(p).map((a) => a[1]);
const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
for (const k in p) { p[k] = [Math.round(cx + (p[k][0] - cx) * kx), Math.round(cy + (p[k][1] - cy) * ky)]; }
writeFileSync(OUT, JSON.stringify(p));
