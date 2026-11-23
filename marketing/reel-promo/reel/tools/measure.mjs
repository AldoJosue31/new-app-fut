// Mide en cada captura la caja (px de la app) de los elementos que la cámara del reel sigue.
// Uso: node marketing/reel-promo/reel/tools/measure.mjs  → escribe tools/boxes.json
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAP = path.resolve(HERE, "../../capturas");

// [estado, clave, texto, modo]  modo: "el" = elemento más profundo con el texto; "row" = sube hasta un bloque ancho (≥ 75 % del viewport)
const Q = [
  ["08-publico/mobile/03-publico-tabla", "rcf", "Real Cuauhtémoc", "row"],
  ["08-publico/mobile/03-publico-tabla", "asi", "Atlético San Isidro", "row"],
  ["04-resultado/mobile/03-definir-resultado", "marcador", "PRIMERA FUERZA", "card"],
  ["04-resultado/mobile/06-goles-visita", "luis", "Luis Flores Estrada", "el"],
  ["04-resultado/mobile/07-confirmar", "guardar", "Sí, guardar", "el"],
  ["04-resultado/mobile/07-confirmar", "confirmar", "¿Confirmar Marcador?", "card"],
  ["04-resultado/mobile/01-tabla-antes", "rcf", "Real Cuauhtémoc", "row"],
  ["04-resultado/mobile/01-tabla-antes", "ldt", "Leones de Tlalpan", "row"],
  ["04-resultado/mobile/01-tabla-antes", "asi", "Atlético San Isidro", "row"],
  ["04-resultado/mobile/09-tabla-despues", "asi", "Atlético San Isidro", "row"],
  ["04-resultado/mobile/10-goleadores-despues", "luis", "Luis Flores", "row"],
  ["01-reglas/mobile/02-puntuacion", "victoria", "Puntos por Victoria", "el"],
  ["01-reglas/mobile/02-puntuacion", "penales", "Penales/Shootouts", "el"],
  ["01-reglas/mobile/06-torneo-puntuacion", "victoria", "Victoria", "el"],
  ["01-reglas/mobile/07-torneo-formato", "ascensos", "Habilitar Ascensos", "el"],
  ["01-reglas/mobile/07-torneo-formato", "fase", "Fase Final", "el"],
  ["01-reglas/mobile/08-torneo-reglas", "minutos", "Minutos por Tiempo", "el"],
  ["07-exportar/mobile/01-tabla-clasica", "descargar", "Descargar", "el"],
  ["07-exportar/mobile/01-tabla-clasica", "nombre", "Clásica", "el"],
  ["07-exportar/mobile/07-tabla-colores-liga", "colores", "Colores de la liga", "el"],
  ["07-exportar/mobile/07-tabla-colores-liga", "descargar", "Descargar", "el"],
  ["09-delegado/mobile/04-mi-equipo", "equipo", "Leones de Tlalpan", "el"],
  ["09-delegado/mobile/05-analisis-proximo-rival", "titulo", "Análisis y", "el"],
  ["09-delegado/mobile/05-analisis-proximo-rival", "ventaja", "Tu equipo parte con ventaja", "el"],
  ["09-delegado/mobile/05-analisis-proximo-rival", "ganar", "45 %", "el"],
  ["09-delegado/mobile/05-analisis-proximo-rival", "empatar", "21 %", "el"],
  ["09-delegado/mobile/05-analisis-proximo-rival", "perder", "34 %", "el"],
  ["09-delegado/mobile/05-analisis-proximo-rival", "vs", "Deportivo Colonia Norte", "el"],
  ["06-liguilla/mobile/01-tabla-final", "tabla", "EQUIPO", "card"],
  ["06-liguilla/mobile/07-torneo-con-campeon", "campeon", "CAMPEÓN", "el"],
  ["06-liguilla/mobile/07-torneo-con-campeon", "rcf", "Real Cuauhtémoc FC", "el"],
];
// Además: las 3 barras de probabilidad (los div con fondo verde/amarillo/rojo de alto < 20 px) y las filas 1–8 de la tabla final.

const browser = await chromium.launch();
const out = {};
const byState = Q.reduce((a, q) => ((a[q[0]] ||= []).push(q), a), {});
for (const [state, qs] of Object.entries(byState)) {
  const meta = JSON.parse(fs.readFileSync(path.join(CAP, `${state}.json`), "utf8"));
  const ctx = await browser.newContext({ viewport: meta.viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(CAP, `${state}.html`)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const res = await page.evaluate(({ qs, vw }) => {
    const box = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    const all = [...document.querySelectorAll(".bk-frame *")];
    const o = {};
    for (const [, key, text, mode] of qs) {
      const hits = all.filter((e) => e.textContent.includes(text) && ![...e.children].some((c) => c.textContent.includes(text)) && e.getBoundingClientRect().width > 0);
      let e = hits[0];
      if (!e) { o[key] = null; continue; }
      if (mode === "row") while (e.parentElement && e.getBoundingClientRect().width < vw * 0.75) e = e.parentElement;
      if (mode === "card") { let p = e; while (p.parentElement && (p.getBoundingClientRect().width < vw * 0.6 || getComputedStyle(p).backgroundColor === "rgba(0, 0, 0, 0)")) p = p.parentElement; e = p; }
      o[key] = { ...box(e), text: e.textContent.trim().slice(0, 60) };
    }
    // barras de probabilidad
    const bars = all.filter((e) => { const r = e.getBoundingClientRect(); const bg = getComputedStyle(e).backgroundColor; return r.height > 3 && r.height < 16 && r.width > 20 && bg !== "rgba(0, 0, 0, 0)"; }).map((e) => ({ ...box(e), bg: getComputedStyle(e).backgroundColor }));
    o._bars = bars;
    // filas de tabla: bloques anchos con un número de posición al inicio
    o._rows = all.filter((e) => { const r = e.getBoundingClientRect(); return r.width > vw * 0.75 && r.height > 22 && r.height < 70 && /^\s*\d{1,2}\s/.test(e.innerText || ""); }).map((e) => ({ ...box(e), t: (e.innerText || "").replace(/\s+/g, " ").slice(0, 40) }));
    return o;
  }, { qs, vw: meta.viewport.width });
  out[state] = { viewport: meta.viewport, ...res };
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(HERE, "boxes.json"), JSON.stringify(out, null, 1));
for (const [s, o] of Object.entries(out)) {
  console.log(s);
  for (const [k, v] of Object.entries(o)) if (!k.startsWith("_") && k !== "viewport") console.log("  ", k, v && `${v.x},${v.y} ${v.w}x${v.h} «${v.text}»`);
  if (o._bars?.length) console.log("   bars", o._bars.map((b) => `${b.x},${b.y} ${b.w}x${b.h} ${b.bg}`).join(" | "));
  if (o._rows?.length) console.log("   rows", o._rows.length, o._rows.slice(0, 12).map((r) => `${r.y}:${r.h}:${r.t.slice(0, 18)}`).join(" | "));
}
