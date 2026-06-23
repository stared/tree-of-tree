// Screenshot the static poster page to a high-res PNG by capturing the .poster
// element exactly (no guessing page height). Uses the Chrome already on the Mac.
import puppeteer from "puppeteer-core";

const URL = process.env.POSTER_URL ?? "http://localhost:5174/poster.html";
const OUT = process.env.OUT ?? "/tmp/poster.png";
const SCALE = Number(process.env.SCALE ?? 2);
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--force-color-profile=srgb", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 2000, height: 1400, deviceScaleFactor: SCALE });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
const el = await page.$(".poster");
const box = await el.boundingBox();
await el.screenshot({ path: OUT });
await browser.close();
console.log(`${OUT}  ${Math.round(box.width)}x${Math.round(box.height)} css px  @${SCALE}x`);
