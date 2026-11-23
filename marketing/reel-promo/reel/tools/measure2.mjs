// Cajas exactas (px de la app) de los elementos que se elevan en el reel, medidas en el DOM congelado.
// Para cada consulta imprime el elemento que contiene el texto y su cadena de contenedores (caja, fondo, borde),
// para elegir el contenedor real en vez de una caja a ojo. Escribe tools/boxes2.json.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAP = path.resolve(HERE, "../../capturas");
const Q = {
  "04-resultado/mobile/03-definir-resultado": ["primera fuerza", "Victoria por Default"],
  "04-resultado/mobile/05-gol-local": ["primera fuerza"],
  "04-resultado/mobile/06-goles-visita": ["primera fuerza"],
  "04-resultado/mobile/01-tabla-antes": ["EQUIPO", "Real Cuauhtémoc", "Atlético San Isidro", "Unión Santa Fe"],
  "04-resultado/mobile/09-tabla-despues": ["EQUIPO", "Real Cuauhtémoc", "Leones de Tlalpan", "Unión Santa Fe"],
  "07-exportar/mobile/01-tabla-clasica": ["Clásica", "Una combinación", "Colores de la liga", "Cancelar"],
  "07-exportar/mobile/07-tabla-colores-liga": ["Clásica", "Diseño adaptado"],
  "09-delegado/mobile/05-analisis-proximo-rival": ["Jornada 8", "Leones de Tlalpan", "Tu equipo parte con ventaja", "45 %", "Goles", "El rival, en contexto"],
  "06-liguilla/mobile/07-torneo-con-campeon": ["campeón", "subcampeón", "Real Cuauhtémoc FC", "Exportar resumen"],
  "04-resultado/mobile/02-jornada": ["Jornada 8", "Por Asignar", "Sábado 21/11/26", "Real Cuauhtémoc"],
  "06-liguilla/mobile/06-cuadro-completo": ["Cuartos de final", "Semifinales", "Final"],
};
const browser = await chromium.launch();
const out = {};
for (const [st, texts] of Object.entries(Q)) {
  const meta = JSON.parse(fs.readFileSync(path.join(CAP, `${st}.json`), "utf8"));
  const ctx = await browser.newContext({ viewport: meta.viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(CAP, `${st}.html`)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  out[st] = await page.evaluate((texts) => {
    const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
    const all = [...document.querySelectorAll(".bk-frame *")];
    const res = {};
    for (const t of texts) {
      const low = t.toLowerCase();
      const hits = all.filter((e) => (e.textContent || "").toLowerCase().includes(low) && ![...e.children].some((c) => (c.textContent || "").toLowerCase().includes(low)) && e.getBoundingClientRect().width > 0);
      res[t] = hits.slice(0, 2).map((e) => {
        const chain = [];
        let p = e;
        for (let k = 0; p && k < 9; k++, p = p.parentElement) {
          const cs = getComputedStyle(p);
          const deco = (cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? "bg " : "") + (parseFloat(cs.borderTopWidth) > 0 ? "border " : "") + (cs.borderRadius !== "0px" ? "r" + cs.borderRadius.split(" ")[0] : "");
          chain.push({ tag: p.tagName.toLowerCase(), cls: (p.className && p.className.baseVal === undefined ? String(p.className) : "").split(" ")[0].slice(0, 28), box: box(p), deco: deco.trim() });
        }
        return chain;
      });
    }
    const cur = document.querySelector('[data-current="true"]');
    if (cur) res._slideActual = box(cur);
    return res;
  }, texts);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(HERE, "boxes2.json"), JSON.stringify(out, null, 1));
for (const [st, r] of Object.entries(out)) {
  console.log("\n## " + st);
  for (const [t, hits] of Object.entries(r)) {
    if (t.startsWith("_")) { console.log("  " + t, JSON.stringify(hits)); continue; }
    hits.forEach((chain, i) => console.log(`  «${t}»#${i}: ` + chain.map((c) => `${c.tag}.${c.cls}[${c.box.join(",")}]${c.deco ? "{" + c.deco + "}" : ""}`).join(" < ")));
  }
}
