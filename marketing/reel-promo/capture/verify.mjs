// Abre cada <estado>.html sin la app ni el servidor, lo fotografía y lo compara con <estado>.png.
// Deja <estado>.check.png (render del HTML) para revisar y un informe en out/verify.json.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { OUT } from "./snapshot.mjs";

const filter = process.argv[2] || "";
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory() && e.name !== "_assets" && e.name !== "piezas") walk(p);
  else if (e.name.endsWith(".html") && p.includes(filter)) files.push(p);
});
walk(OUT);

const browser = await chromium.launch();
const report = [];
for (const f of files) {
  const meta = JSON.parse(fs.readFileSync(f.replace(/\.html$/, ".json"), "utf8"));
  const mobile = meta.viewport.width < 600;
  const ctx = await browser.newContext({ viewport: meta.viewport, deviceScaleFactor: mobile ? 3 : 2, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const external = [];
  page.on("request", (r) => { if (!r.url().startsWith("file:") && !r.url().startsWith("data:")) external.push(r.url()); });
  await page.goto(pathToFileURL(f).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const out = f.replace(/\.html$/, ".check.png");
  await page.screenshot({ path: out });
  report.push({ file: path.relative(OUT, f), check: path.relative(OUT, out), external: external.slice(0, 5) });
  await ctx.close();
}
await browser.close();
fs.writeFileSync("marketing/reel-promo/capture/out/verify.json", JSON.stringify(report, null, 2));
console.log(`verificados ${report.length}`);
