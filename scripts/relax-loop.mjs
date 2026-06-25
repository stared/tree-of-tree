import { execSync } from "child_process";
import { readFileSync, writeFileSync, copyFileSync } from "fs";
const FILE = "public/positions.json";
const TOPO = "/tmp/abstract.json";
const BASE = process.env.BASE ?? "/tmp/tidy_positions.json";
const URL = "http://localhost:5174/poster.html?json=/positions.json";
copyFileSync(BASE, FILE);
function evalPoster() {
  const out = execSync(`PAIRS=1 POSTER_URL='${URL}' node scripts/eval-poster.mjs 2>&1`, { encoding: "utf8" });
  const pairs = [...out.matchAll(/OVERLAP (\S+) . (\S+)/g)].map((m) => `${m[1]}:${m[2]}`);
  const ov = +(/overlap=(\d+)/.exec(out)?.[1] ?? -1);
  const cr = +(/cross=(\d+)/.exec(out)?.[1] ?? -1);
  const font = /FONT=([\d.]+)/.exec(out)?.[1];
  return { pairs, ov, cr, font };
}
let step = Number(process.env.STEP0 ?? 18);
let prev = evalPoster();
console.log(`start: overlap=${prev.ov} cross=${prev.cr} font=${prev.font}`);
for (let i = 1; i <= 40; i++) {
  if (prev.ov === 0 && prev.cr === 0) { console.log("CONVERGED"); break; }
  copyFileSync(FILE, "/tmp/_bak.json");
  execSync(`STEP=${step} DRIFT=170 node scripts/relax-step.mjs ${FILE} ${TOPO} ${BASE} ${prev.pairs.join(" ")}`);
  const cur = evalPoster();
  // crossing guard: if a step CREATES crossings, revert and shrink the step
  if (cur.cr > prev.cr) {
    copyFileSync("/tmp/_bak.json", FILE);
    step = Math.max(5, step * 0.6);
    console.log(`  iter ${i}: +crossings(${cur.cr}) -> revert, step->${step.toFixed(0)}`);
    continue;
  }
  console.log(`  iter ${i}: overlap=${cur.ov} cross=${cur.cr} font=${cur.font} (step ${step.toFixed(0)})`);
  // if stuck (no progress), bump step a touch
  if (cur.ov >= prev.ov) step = Math.min(26, step * 1.15);
  prev = cur;
}
console.log(`FINAL: overlap=${prev.ov} cross=${prev.cr} font=${prev.font}`);
