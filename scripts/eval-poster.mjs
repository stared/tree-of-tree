// Quantitative poster evaluator. Loads the poster and reads each label's TRUE
// rotated rectangle (getBBox in local coords × getScreenCTM → 4 screen corners),
// so overlap/coverage reflect the actual −32° glyph boxes, not inflated AABBs.
//   crossings   link intersections (want 0)
//   overlap     label pairs whose rotated rects overlap NOW (want 0)
//   maxScale    largest uniform font scale before the first collision — this IS
//               the "biggest font, no overlap" objective. MAXIMISE.
//   fill        fraction of the frame grid covered by a label — voids → low.
//               This is the uniform-distribution proxy the eye uses. MAXIMISE.
//   cv          coeff. of variation of nearest-neighbour spacing. minimise.
import puppeteer from "puppeteer-core";

const URL = process.env.POSTER_URL ?? "http://localhost:5174/poster.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 2000, height: 1400, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");

const data = await page.evaluate(() => {
  const polys = [];
  for (const t of document.querySelectorAll(".node .label")) {
    const bb = t.getBBox();
    if (bb.width < 1 || bb.height < 1) continue;
    const m = t.getScreenCTM();
    const map = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
    const id = t.closest("[data-id]")?.getAttribute("data-id") ?? "?";
    polys.push({
      id,
      c: [
        map(bb.x, bb.y),
        map(bb.x + bb.width, bb.y),
        map(bb.x + bb.width, bb.y + bb.height),
        map(bb.x, bb.y + bb.height),
      ],
    });
  }
  const svgEl = document.querySelector(".poster-svg");
  const svg = svgEl.getBoundingClientRect();
  const vb = svgEl.getAttribute("viewBox").split(/\s+/).map(Number);
  // regular (non-headline) word size in USER UNITS (getBBox = viewport-independent)
  const forms = [...document.querySelectorAll(".node:not(.imp) .form")]
    .map((f) => f.getBBox().height)
    .filter((h) => h > 1)
    .sort((a, b) => a - b);
  return { polys, svg: { w: svg.width, h: svg.height }, vb, forms, crossings: globalThis.__crossings ?? [] };
});
await browser.close();

const P = data.polys;
const cen = P.map((p) => [
  (p.c[0][0] + p.c[1][0] + p.c[2][0] + p.c[3][0]) / 4,
  (p.c[0][1] + p.c[1][1] + p.c[2][1] + p.c[3][1]) / 4,
]);
// quad scaled about its centroid by s
const scaled = (i, s) => P[i].c.map((p) => [cen[i][0] + (p[0] - cen[i][0]) * s, cen[i][1] + (p[1] - cen[i][1]) * s]);
// SAT overlap test for two convex polygons
const sat = (A, B) => {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      const nx = -(poly[j][1] - poly[i][1]);
      const ny = poly[j][0] - poly[i][0];
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (const p of A) { const d = p[0] * nx + p[1] * ny; if (d < aMin) aMin = d; if (d > aMax) aMax = d; }
      for (const p of B) { const d = p[0] * nx + p[1] * ny; if (d < bMin) bMin = d; if (d > bMax) bMax = d; }
      if (aMax < bMin || bMax < aMin) return false; // separating axis
    }
  }
  return true;
};
// AABB prefilter so we don't SAT every pair
const aabb = (poly) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of poly) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; }
  return [x0, y0, x1, y1];
};
const overlapAt = (s) => {
  const polys = P.map((_, i) => scaled(i, s));
  const bx = polys.map(aabb);
  let n = 0;
  for (let i = 0; i < polys.length; i++)
    for (let j = i + 1; j < polys.length; j++) {
      if (bx[i][2] < bx[j][0] || bx[j][2] < bx[i][0] || bx[i][3] < bx[j][1] || bx[j][3] < bx[i][1]) continue;
      if (sat(polys[i], polys[j])) n++;
    }
  return n;
};
const overlapsNow = overlapAt(1);
// list the overlapping pairs (for hand-fixing)
if (process.env.PAIRS) {
  const polys = P.map((_, i) => scaled(i, 1));
  const bx = polys.map(aabb);
  for (let i = 0; i < polys.length; i++)
    for (let j = i + 1; j < polys.length; j++) {
      if (bx[i][2] < bx[j][0] || bx[j][2] < bx[i][0] || bx[i][3] < bx[j][1] || bx[j][3] < bx[i][1]) continue;
      if (sat(polys[i], polys[j])) console.error(`  OVERLAP ${P[i].id} × ${P[j].id}`);
    }
}
let lo = 0.2, hi = 4;
if (overlapsNow > 0) hi = 1; else lo = 1;
for (let k = 0; k < 24; k++) {
  const mid = (lo + hi) / 2;
  if (overlapAt(mid) === 0) lo = mid;
  else hi = mid;
}
const maxScale = lo;

// nearest-neighbour spacing of centroids → local evenness
const nn = cen.map((a, i) => {
  let best = Infinity;
  for (let j = 0; j < cen.length; j++) if (i !== j) { const d = Math.hypot(a[0] - cen[j][0], a[1] - cen[j][1]); if (d < best) best = d; }
  return best;
});
const mean = nn.reduce((a, b) => a + b, 0) / nn.length;
const cv = Math.sqrt(nn.reduce((a, b) => a + (b - mean) ** 2, 0) / nn.length) / mean;

// frame coverage: grid the label bbox, count cells whose centre is inside a quad
const ax = P.flatMap((p) => p.c);
const minX = Math.min(...ax.map((p) => p[0])), maxX = Math.max(...ax.map((p) => p[0]));
const minY = Math.min(...ax.map((p) => p[1])), maxY = Math.max(...ax.map((p) => p[1]));
const inQuad = (px, py, q) => {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const cr = (q[j][0] - q[i][0]) * (py - q[i][1]) - (q[j][1] - q[i][1]) * (px - q[i][0]);
    if (cr !== 0) { const s = Math.sign(cr); if (sign === 0) sign = s; else if (s !== sign) return false; }
  }
  return true;
};
const GX = 48, GY = 36;
let covered = 0;
const cw = (maxX - minX) / GX, chh = (maxY - minY) / GY;
const bx = P.map((p) => aabb(p.c));
for (let gi = 0; gi < GX; gi++)
  for (let gj = 0; gj < GY; gj++) {
    const px = minX + (gi + 0.5) * cw, py = minY + (gj + 0.5) * chh;
    for (let k = 0; k < P.length; k++) {
      if (px < bx[k][0] || px > bx[k][2] || py < bx[k][1] || py > bx[k][3]) continue;
      if (inQuad(px, py, P[k].c)) { covered++; break; }
    }
  }
const fill = covered / (GX * GY);

// ACTUAL readable font size = the regular word's font (18 user units) magnified
// by how the WHOLE poster fits a screen-shaped window. A tall (portrait) layout
// scales down to fit height → smaller text. Window = 4:3 landscape (a screen).
const [, , vbW, vbH] = data.vb;
const WIN_W = 1600, WIN_H = 1200;
const screenFit = Math.min(WIN_W / vbW, WIN_H / vbH);
const regFontUU = data.forms.length ? data.forms[Math.floor(data.forms.length / 2)] : 18;
const fontOnScreen = regFontUU * screenFit; // px a regular word renders at, fit-to-screen
const bound = WIN_W / vbW < WIN_H / vbH ? "W" : "H"; // which dimension limits it

const tag = process.env.TAG ?? "";
console.log(
  `${tag.padEnd(15)} n=${P.length} cross=${data.crossings.length} overlap=${overlapsNow} ` +
    `FONT=${fontOnScreen.toFixed(1)}(${bound}) fill=${fill.toFixed(3)} cv=${cv.toFixed(3)} ` +
    `vb=${Math.round(vbW)}x${Math.round(vbH)} aspect=${(vbW / vbH).toFixed(2)}`,
);
