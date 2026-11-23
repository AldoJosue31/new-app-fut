// Lista controles visibles tras abrir una ruta y aplicar clics opcionales.
// Uso: node inspect.mjs <who> <device> <ruta> ["click:texto" | "sel:css" | "shot:nombre" ...]
import { launch, openContext, settle, setScenario, APP } from "./browser.mjs";
import { MANAGER, DELEGATE } from "./seed.mjs";

const [, , who, device, route, ...steps] = process.argv;
if (process.env.SCENARIO) await setScenario(process.env.SCENARIO);
const browser = await launch();
const ctx = await openContext(browser, { user: who === "delegate" ? DELEGATE : who === "anon" ? null : MANAGER, device });
const page = await ctx.newPage();
await page.goto(APP + route, { waitUntil: "domcontentloaded", timeout: 120000 });
await settle(page, 2000);
for (const s of steps) {
  const [kind, ...rest] = s.split(":"); const arg = rest.join(":");
  try {
    if (kind === "click") await page.getByText(arg, { exact: false }).first().click({ timeout: 5000 });
    if (kind === "role") { const [r, n] = arg.split("="); await page.getByRole(r, { name: n, exact: true }).first().click({ timeout: 5000 }); }
    if (kind === "sel") await page.locator(arg).first().click({ timeout: 5000 });
    if (kind === "shot") await page.screenshot({ path: `marketing/reel-promo/capture/out/inspect-${arg}.png` });
    if (kind === "wait") await page.waitForTimeout(Number(arg));
  } catch (e) { console.log("step failed", s, String(e.message).split("\n")[0]); }
  await settle(page, 900);
}
const info = await page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight * 2.5; };
  const label = (el) => (el.getAttribute("aria-label") || el.getAttribute("title") || el.innerText || el.value || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const out = [];
  document.querySelectorAll("button,[role=tab],[role=button],a,select,input,textarea,[role=dialog] h2,[role=dialog] h3,h1,h2,h3").forEach((el) => {
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    out.push(`${el.tagName.toLowerCase()}${el.getAttribute("role") ? "[" + el.getAttribute("role") + "]" : ""}${el.type ? "(" + el.type + ")" : ""} @${Math.round(r.x)},${Math.round(r.y)} "${label(el)}"`);
  });
  return out;
});
console.log(page.url());
console.log([...new Set(info)].join("\n"));
await page.screenshot({ path: "marketing/reel-promo/capture/out/inspect-last.png" });
await browser.close();
