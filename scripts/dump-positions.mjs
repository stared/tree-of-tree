// Dump every node's (x,y) from a rendered poster URL to a flat id→[x,y] JSON.
import puppeteer from "puppeteer-core";
import { writeFileSync } from "fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.env.POSTER_URL ?? "http://localhost:5174/poster.html";
const OUT = process.env.OUT ?? "/tmp/positions.json";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const p = await b.newPage();
await p.goto(URL, { waitUntil: "networkidle0" });
await p.evaluateHandle("document.fonts.ready");
const nodes = await p.evaluate(() => globalThis.__nodes ?? []);
await b.close();
const out = {};
for (const n of nodes) out[n.id] = [n.x, n.y];
writeFileSync(OUT, JSON.stringify(out, null, 0));
console.log("wrote", nodes.length, "->", OUT);
