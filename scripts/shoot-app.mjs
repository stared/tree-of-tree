// Diagnostic screenshots of the live app — desktop story steps at several
// viewport sizes, and every mobile chapter. Writes PNGs into /tmp/shots.
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const URL = process.env.URL ?? "http://localhost:5180/";
const OUT = process.env.OUT ?? "/tmp/shots";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--force-color-profile=srgb", "--hide-scrollbars"],
});

const mode = process.argv[2] ?? "desktop";

if (mode === "desktop") {
  const sizes = (process.env.SIZES ?? "1440x900,1280x720,1024x768,1680x1050").split(",");
  for (const sz of sizes) {
    const [w, h] = sz.split("x").map(Number);
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    const n = await page.$$eval(".step", (els) => els.length);
    for (let i = 0; i < n; i++) {
      await page.evaluate((idx) => {
        const el = document.querySelectorAll(".step")[idx];
        el.scrollIntoView({ behavior: "instant", block: "center" });
      }, i);
      await new Promise((r) => setTimeout(r, 1100)); // let fitTo settle
      await page.screenshot({ path: `${OUT}/d_${w}x${h}_step${String(i + 1).padStart(2, "0")}.png` });
    }
    await page.close();
    console.log(`desktop ${sz}: ${n} steps`);
  }
}

if (mode === "mobile") {
  const sz = process.env.MSIZE ?? "390x844"; // iPhone 12-ish
  const [w, h] = sz.split("x").map(Number);
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true });
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  // capture each chapter section by its bounding box
  const chapters = await page.$$(".m-chapter");
  for (let i = 0; i < chapters.length; i++) {
    const el = chapters[i];
    await el.evaluate((e) => e.scrollIntoView({ behavior: "instant", block: "start" }));
    await new Promise((r) => setTimeout(r, 250));
    const box = await el.boundingBox();
    if (!box) continue;
    await el.screenshot({ path: `${OUT}/m_${w}x${h}_ch${String(i).padStart(2, "0")}.png` });
    console.log(`mobile ch${i}: ${Math.round(box.width)}x${Math.round(box.height)}`);
  }
  await page.close();
}

await browser.close();
