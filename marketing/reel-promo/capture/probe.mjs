// Prueba rápida: abre rutas y guarda capturas en out/probe/.
import fs from "node:fs";
import path from "node:path";
import { launch, openContext, watch, settle, APP } from "./browser.mjs";
import { MANAGER, DELEGATE } from "./seed.mjs";

const [, , who = "manager", device = "desktop", ...routes] = process.argv;
const user = who === "delegate" ? DELEGATE : who === "anon" ? null : MANAGER;
const dir = path.resolve("marketing/reel-promo/capture/out/probe");
fs.mkdirSync(dir, { recursive: true });

const browser = await launch();
const ctx = await openContext(browser, { user, device });
const page = await ctx.newPage();
const issues = watch(page, who);
for (const r of routes) {
  await page.goto(APP + r, { waitUntil: "domcontentloaded", timeout: 120000 });
  await settle(page, 2500);
  const name = `${who}-${device}-${r.replace(/[^\w]+/g, "_")}.png`;
  await page.screenshot({ path: path.join(dir, name), scale: "css" });
  console.log("OK", r, "->", page.url(), name);
}
console.log(issues.slice(0, 15).join("\n"));
await browser.close();
