// Genera el reel de Bracket App (GUION.md) como proyecto de HyperFrames a partir de las capturas reales.
// Uso (desde la raíz del repo): node marketing/reel-promo/reel/tools/build.mjs
//   → compositions/*.html, index.html (sin voz) y voz.html (con voz de ElevenLabs y subtítulos).
// Las capturas son el DOM real congelado (capturas/<bloque>/<dispositivo>/<estado>.html): aquí se meten en
// escenas con su CSS, se les reasignan los ids por escena y se anima una "cámara" sobre ellas.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, "..");
const PROJ_VOZ = path.resolve(PROJ, "../reel-voz");
const CAP = path.resolve(PROJ, "../capturas");
const W = 1080, H = 1920, DUR = 36;
const M = W / 390; // escala base de una captura móvil a lo ancho del lienzo (2.769)

// ───────────────────────── capturas ─────────────────────────
const used = new Set();
const relocate = (s) => s.replace(/(?:\.\.\/)+_assets\/([\w.-]+)/g, (m, f) => {
  used.add(f);
  return /\.(woff2?|ttf|otf)$/i.test(f) ? `assets/fonts/${f}` : `assets/capturas/${f}`;
});
const cache = new Map();
function state(p) {
  if (cache.has(p)) return cache.get(p);
  const html = fs.readFileSync(path.join(CAP, `${p}.html`), "utf8");
  const meta = JSON.parse(fs.readFileSync(path.join(CAP, `${p}.json`), "utf8"));
  const css = html.match(/<style data-captura="app">([\s\S]*?)<\/style>/)[1];
  const frame = html.match(/(<div class="bk-frame[\s\S]*<\/div>)\s*<script data-captura="scroll">/)[1];
  const s = { meta, css, frame };
  cache.set(p, s);
  return s;
}
const cleanCss = (css) => relocate(css)
  .replace(/\[data-layer=/g, "[data-app-layer=")
  .replace(/(?<=[;{]|^)\s*(?:-webkit-)?(?:transition|animation)(?:-[\w-]+)?\s*:[^;}]*;?/g, "")
  .replace(/,\s*(?:"Apple Color Emoji"|"Segoe UI Emoji"|"Segoe UI Symbol"|"Noto Color Emoji"|SFMono-Regular)/g, "");
// Una captura dentro de un contenedor de cámara (#uid, origen 0 0). Los ids internos llevan el prefijo de la escena.
function cap(p, uid) {
  const s = state(p);
  const { width: vw, height: vh } = s.meta.viewport;
  const f = relocate(s.frame).split(s.meta.prefijoIds).join(`${uid}-`)
    .replace('<div class="bk-frame', '<div data-layout-allow-overflow data-layout-ignore class="bk-frame')
    .replace(/\sdata-layer=/g, " data-app-layer=")
    .replace(/style="[^"]*"/g, (st) => st.replace(/(?:-webkit-)?(?:transition|animation)(?:-[\w-]+)?\s*:[^;"]*;?\s*/g, ""));
  return `<div id="${uid}" class="cam" style="width:${vw}px;height:${vh}px" data-layout-allow-overflow data-layout-ignore>${f}</div>`;
}
function sceneCss(states) {
  // CSS completo de cada estado (deduplicar por líneas rompía bloques de varias líneas)
  return [...new Set(states)].map((p) => `/* ${p} */\n${cleanCss(state(p).css)}`).join("\n");
}

// ───────────────────────── piezas comunes ─────────────────────────
const BASE_CSS = `
#root { position: absolute; inset: 0; overflow: hidden; font-family: Poppins, sans-serif; }
#root .fondo { background: #131F24; }
#root .layer { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
#root .cam { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
#root .titulo { position: absolute; left: 80px; right: 80px; top: 304px; display: flex; justify-content: center; z-index: 40; opacity: var(--vis, 1); }
#root .titulo > span { display: block; max-width: 920px; background: rgba(13, 21, 25, 0.94); color: #fff; font: 700 70px/1.12 Poppins, sans-serif; letter-spacing: -0.01em; text-align: center; white-space: pre-line; padding: 26px 42px 30px; border-radius: 34px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45); border: 2px solid rgba(255, 255, 255, 0.07); opacity: 0; }
#root .toque { position: absolute; left: 0; top: 0; width: 96px; height: 96px; margin: -48px 0 0 -48px; border-radius: 50%; background: rgba(255, 255, 255, 0.28); border: 5px solid rgba(255, 255, 255, 0.92); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45); z-index: 60; opacity: 0; }
#root .tapa { position: absolute; background: #10191D; }
#root .flash { position: absolute; inset: 0; background: #fff; opacity: 0; z-index: 70; pointer-events: none; }
`;
// Título: tarjeta oscura tipo toast de la app. Texto y visibilidad vienen de variables (en voz.html cambian).
const titulo = (id, v) => `<div class="titulo" id="${id}" style="--vis: var(--${v}-vis, 1)"><span data-var-text="${v}">${VARS_TEXT[v]}</span></div>`;
// Textos de títulos: [sin voz, con voz]. Con voz, "" oculta el título (GUION.md / VOZ.md).
const TITULOS = {
  t_chat1: ["Organizar una liga\nes contestar esto", ""],
  t_chat2: ["…y tú, uno por uno", ""],
  t_link: ["Un solo enlace", ""],
  t_res1: ["Capturas el resultado", ""],
  t_res2: ["La tabla se\nacomoda sola", ""],
  t_reg: ["Con tus reglas", ""],
  t_exp: ["Lista para compartir", ""],
  t_del1: ["Cada delegado, su cuenta", ""],
  t_del2: ["Y su próximo rival,\nanalizado", ""],
  t_lig: ["De la jornada 1 a la final", ""],
  t_fin: ["Tu liga entera.\nUn enlace.", ""],
};
const VARS_TEXT = Object.fromEntries(Object.entries(TITULOS).map(([k, v]) => [k, v[0]]));
const varsDecl = (keys) => JSON.stringify(keys.flatMap((k) => [
  { id: k, type: "string", label: `Título ${k}`, default: TITULOS[k][0] },
  { id: `${k}-vis`, type: "number", label: `Mostrar ${k}`, default: 1, min: 0, max: 1, step: 1 },
])).replace(/'/g, "&#39;");
const varsValues = (keys, voz) => JSON.stringify(Object.fromEntries(keys.flatMap((k) => voz
  ? [[k, TITULOS[k][1] || TITULOS[k][0]], [`${k}-vis`, TITULOS[k][1] ? 1 : 0]]
  : [[k, TITULOS[k][0]], [`${k}-vis`, 1]]))).replace(/'/g, "&#39;");

// Ayudas que corren dentro de cada escena (deterministas: solo leen el DOM una vez, al iniciar).
const HELP = `
var W = ${W}, H = ${H}, M = ${M};
document.querySelectorAll('#root [data-bk-scroll]').forEach(function (e) { var v = e.getAttribute('data-bk-scroll').split(','); e.scrollTop = +v[0]; e.scrollLeft = +v[1]; });
function cam(vw, vh, b, s, fy, fx) {
  var cx = b.x + b.w / 2, cy = b.y + b.h / 2; fx = fx == null ? W / 2 : fx; fy = fy == null ? H / 2 : fy;
  var x = vw * s <= W ? (W - vw * s) / 2 : Math.min(0, Math.max(W - vw * s, fx - cx * s));
  var y = vh * s <= H ? (H - vh * s) / 2 : Math.min(0, Math.max(H - vh * s, fy - cy * s));
  return { x: x, y: y, scale: s };
}
function row(rootSel, text, minW) {
  var all = document.querySelectorAll(rootSel + ' *');
  for (var i = 0; i < all.length; i++) {
    var e = all[i];
    if (e.textContent.indexOf(text) < 0) continue;
    var deeper = false; for (var k = 0; k < e.children.length; k++) if (e.children[k].textContent.indexOf(text) >= 0) { deeper = true; break; }
    if (deeper) continue;
    while (e.parentElement && e.offsetWidth < (minW || 300)) e = e.parentElement;
    return e;
  }
  return null;
}
function enter(tl, sel, t, kind) {
  var span = sel + ' > span';
  if (kind === 'clip') tl.fromTo(span, { opacity: 1, clipPath: 'inset(0 100% 0 0 round 34px)' }, { clipPath: 'inset(0 0% 0 0 round 34px)', duration: 0.38, ease: 'expo.out' }, t);
  else if (kind === 'pop') tl.fromTo(span, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(1.7)' }, t);
  else tl.fromTo(span, { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.2, ease: 'power4.out' }, t);
}
function leave(tl, sel, t) { tl.to(sel + ' > span', { opacity: 0, filter: 'blur(8px)', duration: 0.18, ease: 'power2.in' }, t); }
function tap(tl, sel, x, y, t) {
  tl.fromTo(sel, { x: x + 160, y: y + 520, opacity: 0, scale: 1 }, { x: x, y: y, opacity: 1, duration: 0.32, ease: 'power3.out' }, t - 0.34);
  tl.to(sel, { scale: 0.72, duration: 0.08, ease: 'power2.in' }, t);
  tl.to(sel, { scale: 1, opacity: 0, duration: 0.22, ease: 'power2.out' }, t + 0.08);
}
`;

function scene(id, { states = [], vars = [], css = "", body, script }) {
  const html = `<!-- Escena "${id}" del reel de Bracket App. Generada por tools/build.mjs: edita ese archivo, no este. -->
<template>
  <style>
${BASE_CSS}
${css}
${sceneCss(states)}
  </style>
  <div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}" data-composition-variables='${varsDecl(vars)}'>
    <div class="layer fondo"></div>
${body}
  </div>
  <script>
    (function () {
${HELP}
      var tl = gsap.timeline({ paused: true });
${script}
      window.__timelines["${id}"] = tl;
    })();
  </script>
</template>
`;
  fs.writeFileSync(path.join(PROJ, "compositions", `${id}.html`), html);
  return { id, vars, kb: Math.round(html.length / 1024) };
}

// ───────────────────────── escena 1 · chat (0–7.5 s) ─────────────────────────
// Gancho H1 + tensión + revelación: el chat de delegados se llena, llega el enlace y se abre la tabla pública.
const PREGUNTAS = [
  ["Javier · ASI", "#EF5350", "¿Cómo va la tabla?"],
  ["Ernesto · RCF", "#BA68C8", "Profe, ¿cómo va la tabla?"],
  ["Hugo · USF", "#66BB6A", "¿Ya actualizaste la tabla?"],
  ["Sergio · DT", "#F06292", "¿Cómo quedamos en la tabla?"],
  ["Raúl · OU", "#BCAAA4", "¿Cómo va la tabla??"],
  ["Martín · DCN", "#64B5F6", "¿La tabla porfa?"],
  ["Ricardo · LDT", "#FFCA28", "¿Cómo va la tabla?"],
  ["Óscar · RC", "#4DD0E1", "¿Ya hay tabla?"],
  ["Iván · SLP", "#FFA726", "¿Cómo va la tablaaa?"],
  ["Fernando · IX", "#7986CB", "¿Y la tabla?"],
  ["Javier · ASI", "#EF5350", "¿Cómo va la tabla?"],
  ["Ernesto · RCF", "#BA68C8", "¿Quién va de goleador?"],
  ["Hugo · USF", "#66BB6A", "¿Contra quién nos toca?"],
  ["Ricardo · LDT", "#FFCA28", "¿Ya salió el rol?"],
  ["Sergio · DT", "#F06292", "¿Pasamos a liguilla?"],
  ["Martín · DCN", "#64B5F6", "¿A qué hora jugamos?"],
  ["Raúl · OU", "#BCAAA4", "¿Y la tabla de goleo?"],
  ["Óscar · RC", "#4DD0E1", "¿Quién nos toca en liguilla?"],
  ["Iván · SLP", "#FFA726", "¿Ya salió el rol??"],
  ["Fernando · IX", "#7986CB", "¿Cómo va la tabla?"],
];
const STEP = 156, LOW = 1290, PRE = 5; // separación, tope de la burbuja más baja, burbujas ya visibles en el cuadro 0
// Llegadas (s): el gancho acelera y la tensión se desborda.
const LLEGA = [0.35, 0.8, 1.2, 1.6, 1.95, 2.3, 3.0, 3.18, 3.36, 3.54, 3.7, 3.86, 4.02, 4.16, 4.3];
const linkY = LOW + STEP * 0; // la burbuja del enlace ocupa la posición más baja
function chatScene() {
  const pub = "08-publico/mobile/03-publico-tabla";
  const pubCam = { x: 0, y: 0, scale: M };
  const bubbles = PREGUNTAS.map(([who, col, txt], i) => `
      <div class="burbuja" id="b${i}" style="top:${LOW + STEP * (i - (PRE - 1))}px"><b style="color:${col}">${who}</b><span>${txt}</span></div>`).join("");
  const body = `
    <div class="layer" id="chat">
      <div id="chat-fondo"></div>
      <div id="chat-lista" data-layout-ignore>${bubbles}
      </div>
      <div class="burbuja mia" id="enlace"><div class="prev"><img src="assets/img/logo_app.png" alt="Bracket App"><div><b>Liga Valle Dorado</b><span>Tabla · Cuadro · Goleadores</span></div></div><span class="url">Bracket App · enlace público</span><span class="hora">20:14 ✓✓</span></div>
      <div id="chat-cab" data-layout-ignore><div class="av" data-layout-ignore>VD</div><div class="nom"><b>Liga Valle Dorado</b><span>Delegados · 11 participantes</span></div><div id="noleidos">12</div></div>
      <div id="chat-caja" data-layout-ignore><span>Mensaje</span></div>
      <div id="chat-oscuro"></div>
    </div>
    <div class="layer" id="pub-capa">${cap(pub, "c1-pub")}</div>
    ${titulo("c1-t1", "t_chat1")}
    ${titulo("c1-t2", "t_chat2")}
    ${titulo("c1-t3", "t_link")}
    <div class="toque" id="c1-toque"></div>`;
  const css = `
#chat-fondo { position: absolute; inset: 0; background: #0B1418; }
#chat-cab { position: absolute; left: 0; top: 0; width: ${W}px; height: 270px; background: #131F24; border-bottom: 2px solid #1E2A30; display: flex; align-items: flex-end; gap: 26px; padding: 0 40px 34px; z-index: 5; }
#chat-cab .av { width: 104px; height: 104px; border-radius: 50%; background: #F2B705; color: #0E2A47; font: 700 40px/104px Poppins; text-align: center; }
#chat-cab .nom { display: flex; flex-direction: column; color: #fff; }
#chat-cab .nom b { font: 700 42px/1.2 Poppins; }
#chat-cab .nom span { font: 500 30px/1.3 Poppins; color: #8FA0A8; }
#noleidos { margin-left: auto; margin-bottom: 20px; min-width: 76px; height: 64px; padding: 0 18px; border-radius: 32px; background: #0A7FB8; color: #fff; font: 700 34px/64px Poppins; text-align: center; }
#chat-lista { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
#chat .burbuja { position: absolute; left: 44px; max-width: 800px; background: #1E2A30; border-radius: 12px 36px 36px 36px; padding: 18px 34px 22px; display: flex; flex-direction: column; transform-origin: 0 100%; opacity: 0; }
#chat .burbuja b { font: 600 28px/1.3 Poppins; }
#chat .burbuja span { font: 500 44px/1.3 Poppins; color: #E9EEF0; }
#chat .burbuja.mia { left: auto; right: 160px; width: 720px; background: #1cb0f6; border-radius: 36px 12px 36px 36px; top: 1146px; transform-origin: 100% 100%; z-index: 3; padding: 18px 18px 18px; gap: 10px; }
#enlace .prev { display: flex; gap: 24px; align-items: center; background: #0E8BC6; border-radius: 26px; padding: 20px; }
#enlace .prev img { width: 132px; height: 132px; }
#enlace .prev div { display: flex; flex-direction: column; }
#enlace .prev b { font: 700 44px/1.2 Poppins; color: #fff; }
#enlace .prev span { font: 500 32px/1.3 Poppins; color: #E3F5FE; }
#enlace .url { font: 600 34px/1.3 Poppins; color: #fff; padding: 0 12px; text-decoration: underline; }
#enlace .hora { font: 500 26px/1 Poppins; color: #D5F0FD; align-self: flex-end; padding: 0 12px 4px; }
#chat-caja { position: absolute; left: 0; top: 1640px; width: ${W}px; height: 280px; background: #131F24; border-top: 2px solid #1E2A30; padding: 34px 40px; z-index: 5; }
#chat-caja span { display: block; height: 96px; border-radius: 48px; background: #1E2A30; color: #6F8089; font: 500 36px/96px Poppins; padding: 0 40px; }
#chat-oscuro { position: absolute; inset: 0; background: #000; opacity: 0; z-index: 6; pointer-events: none; }
#pub-capa { clip-path: circle(0px at 560px 1300px); z-index: 20; }
`;
  // Animación
  const n = PREGUNTAS.length;
  let s = `
      gsap.set('#c1-pub', ${JSON.stringify({ ...pubCam, scale: M * 1.05 })});
      tl.set('#chat-lista', { y: 0 }, 0);
      for (var i = 0; i < ${PRE}; i++) tl.set('#b' + i, { opacity: 1 }, 0);
      var LLEGA = ${JSON.stringify(LLEGA)};
      LLEGA.forEach(function (t, k) {
        var i = ${PRE} + k;
        tl.to('#chat-lista', { y: -${STEP} * (k + 1), duration: 0.22, ease: 'power3.out' }, t);
        tl.fromTo('#b' + i, { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.26, ease: 'back.out(1.8)' }, t);
      });
      // contador de no leídos
      var cnt = { v: 12 };
      tl.to(cnt, { v: 99, duration: 4.1, ease: 'power2.in', onUpdate: function () { var v = Math.round(cnt.v); document.getElementById('noleidos').textContent = v >= 99 ? '99+' : String(v); } }, 0.2);
      // vibración del teléfono (handheld, baja)
      [2.2, 2.24, 2.28, 2.32, 2.36, 2.4].forEach(function (t, k) { tl.to('#chat', { x: [7, -6, 5, -4, 2, 0][k], y: [-3, 4, -3, 2, -1, 0][k], duration: 0.04, ease: 'none' }, t); });
      // la tensión aplasta el chat
      tl.to('#chat', { scale: 0.96, duration: 2.0, ease: 'power1.in', transformOrigin: '50% 60%' }, 3.0);
      tl.to('#chat-oscuro', { opacity: 0.22, duration: 2.0, ease: 'power1.in' }, 3.0);
      tl.set('#c1-t1 > span', { opacity: 1 }, 0);
      leave(tl, '#c1-t1', 2.85);
      enter(tl, '#c1-t2', 3.1, 'blur');
      leave(tl, '#c1-t2', 5.15);
      // silencio de golpe: llega el enlace
      tl.to('#chat', { scale: 1, duration: 0.3, ease: 'expo.out' }, 5.3);
      tl.to('#chat-oscuro', { opacity: 0, duration: 0.2 }, 5.3);
      tl.to('#chat-lista', { y: -${STEP} * ${n - PRE} - 300, duration: 0.42, ease: 'expo.out' }, 5.4);
      tl.to('#chat-lista', { opacity: 0.35, filter: 'blur(10px)', duration: 0.3, ease: 'power2.out' }, 5.4);
      tl.fromTo('#enlace', { opacity: 0, x: 120, scale: 0.9 }, { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: 'back.out(1.3)' }, 5.45);
      enter(tl, '#c1-t3', 5.6, 'clip');
      leave(tl, '#c1-t3', 6.55);
      tap(tl, '#c1-toque', 560, 1300, 6.7);
      // iris desde el toque: se abre la tabla pública
      tl.fromTo('#pub-capa', { clipPath: 'circle(0px at 560px 1300px)' }, { clipPath: 'circle(2300px at 560px 1300px)', duration: 0.3, ease: 'power3.in' }, 6.76);
      tl.to('#c1-pub', { scale: ${M}, duration: 0.5, ease: 'expo.out' }, 6.9);
      tl.to({}, { duration: 7.5 - tl.duration() });`;
  return scene("chat", { states: [pub], vars: ["t_chat1", "t_chat2", "t_link"], css, body, script: s });
}

// La burbuja del enlace queda en LOW (tope) tras subir la lista: su centro ~ y 1500 → punto del toque.

// ───────────────────────── escena 2 · resultado (7.5–13 s) ─────────────────────────
function resultadoScene() {
  const P = "08-publico/mobile/03-publico-tabla";
  const R = (s) => `04-resultado/mobile/${s}`;
  const states = [P, R("03-definir-resultado"), R("04-titulares-local"), R("05-gol-local"), R("06-goles-visita"), R("07-confirmar"), R("01-tabla-antes"), R("09-tabla-despues"), R("10-goleadores-despues")];
  const body = `
    <div class="layer" id="r-pubc">${cap(P, "r-pub")}</div>
    <div class="layer" id="r-zt"></div>
    <div class="layer" id="r-modal">
      ${cap(R("03-definir-resultado"), "r-m3")}
      ${cap(R("04-titulares-local"), "r-m4")}
      ${cap(R("05-gol-local"), "r-m5")}
      ${cap(R("06-goles-visita"), "r-m6")}
      ${cap(R("07-confirmar"), "r-m7")}
    </div>
    <div class="layer" id="r-tabla">
      ${cap(R("01-tabla-antes"), "r-t1")}
      ${cap(R("09-tabla-despues"), "r-t2")}
    </div>
    <div class="layer" id="r-gol">${cap(R("10-goleadores-despues"), "r-g")}</div>
    <div id="r-pill"><i style="background:#6A1B9A">RCF</i><b>1 – 2</b><i style="background:#C62828">ASI</i></div>
    <div id="r-mas3">+3</div>
    ${titulo("r-t-1", "t_res1")}
    ${titulo("r-t-2", "t_res2")}
    <div class="toque" id="r-toque"></div>`;
  const css = `
#r-zt { background: rgb(22, 35, 41); clip-path: inset(880px 0px 880px 0px round 24px); opacity: 0; z-index: 5; }
#r-modal, #r-tabla, #r-gol { opacity: 0; }
#r-modal { z-index: 6; } #r-tabla { z-index: 7; } #r-gol { z-index: 8; }
#r-modal .cam { opacity: 0; } #r-tabla .cam { opacity: 0; }
#r-pill { position: absolute; left: 270px; top: 640px; width: 540px; height: 150px; border-radius: 75px; background: #1cb0f6; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; z-index: 30; opacity: 0; box-shadow: 0 20px 50px rgba(0,0,0,.5); }
#r-pill i { font: 700 34px/108px Poppins; font-style: normal; color: #fff; width: 108px; height: 108px; border-radius: 50%; text-align: center; }
#r-pill b { font: 700 72px/1 Poppins; color: #fff; }
#r-mas3 { position: absolute; left: 800px; top: 800px; padding: 6px 26px; border-radius: 30px; background: #22C55E; color: #06210F; font: 700 56px/1.2 Poppins; z-index: 30; opacity: 0; }
`;
  const sc = { x: -315, y: -493, scale: 4.2 }; // fila de Real Cuauhtémoc en la tabla pública
  const s = `
      var B = { pub: { x: 0, y: 0, scale: M } };
      gsap.set('#r-pub', B.pub);
      tl.set('#r-pub', B.pub, 0);
      // 1 · la cámara busca la fila del líder y la atraviesa
      tl.to('#r-pub', ${JSON.stringify({ ...sc, duration: 0.75, ease: "power2.inOut" })}, 0.05);
      tl.set('#r-zt', { opacity: 1 }, 0.72);
      tl.fromTo('#r-zt', { clipPath: 'inset(880px 0px 880px 0px round 24px)' }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.34, ease: 'power3.in' }, 0.72);
      // 2 · el modal de resultado, que llega un poco grande y se asienta
      tl.set('#r-modal', { opacity: 1 }, 1.04);
      tl.set('#r-m3', { opacity: 1 }, 1.04);
      tl.to('#r-zt', { opacity: 0, duration: 0.2 }, 1.06);
      ['#r-m3', '#r-m4', '#r-m5', '#r-m6', '#r-m7'].forEach(function (s) { gsap.set(s, { x: -40, y: -60, scale: M * 1.06 }); tl.set(s, { x: -40, y: -60, scale: M * 1.06 }, 0); });
      var base = { x: 0, y: 0, scale: M };
      var marcador = cam(390, 844, { x: 23, y: 170, w: 343, h: 90 }, 3.6, 760);
      tl.to(['#r-m3', '#r-m4', '#r-m5', '#r-m6'], Object.assign({ duration: 0.4, ease: 'expo.out' }, base), 1.04);
      tl.to(['#r-m3', '#r-m4', '#r-m5', '#r-m6'], Object.assign({ duration: 0.45, ease: 'power2.inOut' }, marcador), 1.45);
      // estados reales del modal: titulares, 1–0, 1–2 (cambio por desenfoque rápido)
      [['#r-m3', '#r-m4', 1.75], ['#r-m4', '#r-m5', 2.15], ['#r-m5', '#r-m6', 2.55]].forEach(function (p) {
        tl.fromTo(p[1], { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.14, ease: 'power2.out' }, p[2]);
        tl.set(p[0], { opacity: 0 }, p[2] + 0.14);
      });
      enter(tl, '#r-t-1', 1.3, 'blur');
      leave(tl, '#r-t-1', 2.85);
      // 3 · confirmar
      var conf = cam(390, 844, { x: 27, y: 177, w: 337, h: 489 }, 3.0, 900);
      tl.set('#r-m7', conf, 2.9);
      tl.fromTo('#r-m7', { opacity: 0 }, { opacity: 1, duration: 0.14 }, 2.9);
      tl.set('#r-m6', { opacity: 0 }, 3.05);
      tap(tl, '#r-toque', 200 * 3 + conf.x, 607 * 3 + conf.y, 3.3);
      // 4 · el marcador se condensa en una píldora y viaja a la fila de Atlético San Isidro
      tl.fromTo('#r-pill', { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'power3.out' }, 3.42);
      tl.to('#r-m7', { opacity: 0, filter: 'blur(10px)', duration: 0.25, ease: 'power2.in' }, 3.45);
      var T = cam(390, 844, { x: 15, y: 234, w: 360, h: 153 }, 3.0, 860);
      tl.set(['#r-t1', '#r-t2'], T, 0);
      tl.set('#r-tabla', { opacity: 1 }, 3.5);
      tl.fromTo('#r-t1', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 3.5);
      var asiY = (311 + 19) * T.scale + T.y;
      tl.to('#r-pill', { x: 0, y: asiY - 715, scale: 0.32, opacity: 0, duration: 0.42, ease: 'power3.in' }, 3.72);
      // 5 · las filas se reacomodan de verdad: ASI sube al 2.º y Leones baja al 3.º
      var asi = row('#r-t1', 'Atlético San Isidro'), ldt = row('#r-t1', 'Leones de Tlalpan');
      if (asi) { asi.style.position = 'relative'; asi.style.zIndex = '3'; tl.to(asi, { y: -38, backgroundColor: 'rgba(28,176,246,0.22)', duration: 0.45, ease: 'power3.inOut' }, 4.08); }
      if (ldt) tl.to(ldt, { y: 38, duration: 0.45, ease: 'power3.inOut' }, 4.08);
      tl.fromTo('#r-t2', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 4.55);
      tl.set('#r-t1', { opacity: 0 }, 4.66);
      tl.fromTo('#r-mas3', { opacity: 0, scale: 0.5, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(2)' }, 4.58);
      tl.to('#r-mas3', { opacity: 0, duration: 0.15 }, 5.0);
      enter(tl, '#r-t-2', 3.5, 'pop');
      leave(tl, '#r-t-2', 5.02);
      // 6 · corte en tiempo a goleadores: Luis Flores Estrada arriba con 11
      var G = cam(390, 844, { x: 25, y: 197, w: 341, h: 52 }, 3.0, 820);
      tl.set('#r-gol', { opacity: 1 }, 5.0);
      tl.fromTo('#r-g', Object.assign({}, G, { scale: 3.35, x: G.x - 40, y: G.y - 30 }), Object.assign({ duration: 0.45, ease: 'expo.out' }, G), 5.0);
      tl.to({}, { duration: 5.5 - tl.duration() });`;
  return scene("resultado", { states, vars: ["t_res1", "t_res2"], css, body, script: s });
}

// ───────────────────────── escena 3 · reglas (13–16 s) ─────────────────────────
function reglasScene() {
  const C = [
    ["01-reglas/mobile/02-puntuacion", { x: 0, y: 36, w: 200, h: 64 }, 4.2, "Tus puntos"],
    ["01-reglas/mobile/06-torneo-puntuacion", { x: 40, y: 300, w: 230, h: 150 }, 3.6, "Tus empates"],
    ["01-reglas/mobile/02-puntuacion", { x: 0, y: 252, w: 320, h: 48 }, 3.3, "Tus desempates"],
    ["01-reglas/mobile/07-torneo-formato", { x: 40, y: 300, w: 250, h: 150 }, 3.6, "Tus ascensos"],
    ["01-reglas/mobile/07-torneo-formato", { x: 40, y: 545, w: 250, h: 110 }, 3.6, "Tu liguilla"],
    ["01-reglas/mobile/08-torneo-reglas", { x: 40, y: 600, w: 320, h: 70 }, 3.6, "Tus horarios"],
  ];
  const states = [...new Set(C.map((c) => c[0]))];
  const body = `
    ${C.map((c, i) => `<div class="layer corte" id="g-c${i}">${cap(c[0], `g-k${i}`)}</div>`).join("\n    ")}
    <div class="titulo" id="g-slot"><span><em id="g-rueda">${C.map((c) => `<i>${c[3]}</i>`).join("")}</em></span></div>
    ${titulo("g-t", "t_reg")}
    <div class="flash" id="g-flash"></div>`;
  const css = `
#root .corte { opacity: 0; }
#g-slot { top: 1060px; }
#g-slot > span { opacity: 1; height: 136px; overflow: hidden; padding: 0 46px; background: #1cb0f6; }
#g-rueda { display: flex; flex-direction: column; font-style: normal; }
#g-rueda i { display: block; height: 136px; font: 700 74px/136px Poppins; font-style: normal; color: #fff; white-space: nowrap; }

#g-slot { opacity: 0; }
`;
  const s = `
      var C = ${JSON.stringify(C.map((c) => ({ b: c[1], s: c[2] })))};
      C.forEach(function (c, i) {
        var t = i * 0.5, k = '#g-k' + i, z = cam(390, 844, c.b, c.s, 830);
        var big = cam(390, 844, c.b, c.s * 1.14, 830);
        gsap.set(k, big); tl.set(k, big, 0);
        tl.set('#g-c' + i, { opacity: 1 }, t);
        if (i > 0) tl.set('#g-c' + (i - 1), { opacity: 0 }, t);
        tl.to(k, Object.assign({ duration: 0.42, ease: 'expo.out' }, z), t);
        tl.to('#g-rueda', { y: -136 * i, duration: 0.14, ease: 'power3.out' }, t);
      });
      tl.fromTo('#g-slot', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.6)' }, 0);
      enter(tl, '#g-t', 0.15, 'blur');
      // congelado de 2 cuadros y destello: corte de choque
      tl.to('#g-flash', { opacity: 0.9, duration: 0.05, ease: 'none' }, 2.88);
      tl.to('#g-flash', { opacity: 0, duration: 0.07, ease: 'none' }, 2.93);
      tl.to({}, { duration: 3.0 - tl.duration() });`;
  return scene("reglas", { states, vars: ["t_reg"], css, body, script: s });
}

// ───────────────────────── escena 4 · exportar (16–20.5 s) ─────────────────────────
function exportarScene() {
  const E = ["01-tabla-clasica", "02-tabla-combinacion-2", "03-tabla-combinacion-3", "04-tabla-combinacion-4", "05-tabla-combinacion-5", "06-tabla-combinacion-6", "07-tabla-colores-liga"].map((s) => `07-exportar/mobile/${s}`);
  const body = `
    ${E.map((e, i) => `<div class="layer disenio" id="x-w${i}">${cap(e, `x-k${i}`)}</div>`).join("\n    ")}
    <div class="layer" id="x-dim"></div>
    <img id="x-poster" src="assets/img/tabla-general.png" alt="Tabla general exportada por Bracket App">
    <div class="layer" id="x-fill"></div>
    ${titulo("x-t", "t_exp")}
    <div class="toque" id="x-toque"></div>
    <div class="flash" id="x-flash"></div>`;
  const css = `
#root .disenio { opacity: 0; }
#x-dim { background: #0B1418; opacity: 0; z-index: 20; }
#x-poster { position: absolute; left: 0; top: 0; width: 2160px; height: 2700px; transform-origin: 0 0; z-index: 25; opacity: 0; border-radius: 18px; box-shadow: 0 40px 90px rgba(0, 0, 0, 0.6); }
#x-fill { background: #F9A825; opacity: 0; z-index: 30; }
`;
  const s = `
      var Z = cam(390, 844, { x: 40, y: 390, w: 310, h: 300 }, 3.3, 860);
      for (var i = 0; i < 7; i++) { gsap.set('#x-k' + i, Z); tl.set('#x-k' + i, Z, 0); }
      tl.set('#x-w0', { opacity: 1 }, 0);
      tl.fromTo('#x-flash', { opacity: 0.85 }, { opacity: 0, duration: 0.16, ease: 'power2.out' }, 0);
      tl.fromTo('#x-k0', Object.assign({}, Z, { scale: Z.scale * 1.08 }), Object.assign({ duration: 0.4, ease: 'expo.out' }, Z), 0);
      // barridos por las 6 combinaciones y los colores de la liga
      [0.5, 0.82, 1.14, 1.46, 1.78, 2.12].forEach(function (t, k) {
        var o = '#x-w' + k, n = '#x-w' + (k + 1);
        tl.to(o, { x: -520, opacity: 0, filter: 'blur(14px)', duration: 0.14, ease: 'power3.in' }, t);
        tl.fromTo(n, { x: 520, opacity: 0, filter: 'blur(14px)' }, { x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.2, ease: 'power3.out' }, t + 0.06);
      });
      enter(tl, '#x-t', 2.3, 'clip');
      leave(tl, '#x-t', 3.3);
      tap(tl, '#x-toque', 296 * Z.scale + Z.x, Math.min(1700, 795 * Z.scale + Z.y), 2.75);
      // la imagen real descargada cae como póster
      var P0 = { x: 540 - 2160 * 0.1 / 2, y: 930 - 2700 * 0.1 / 2, scale: 0.1 }, P1 = { x: (1080 - 2160 * 0.44) / 2, y: (1920 - 2700 * 0.44) / 2, scale: 0.44 };
      gsap.set('#x-poster', P0); tl.set('#x-poster', P0, 0);
      tl.to('#x-dim', { opacity: 0.82, duration: 0.3 }, 2.88);
      tl.fromTo('#x-poster', Object.assign({ opacity: 0 }, P0), Object.assign({ opacity: 1, duration: 0.6, ease: 'back.out(1.25)' }, P1), 2.9);
      // recorrido: del encabezado a la fila de Leones de Tlalpan
      tl.to('#x-poster', { x: 0, y: 180, scale: 1.0, duration: 0.4, ease: 'power2.inOut' }, 3.5);
      tl.to('#x-poster', { y: 960 - 1049, duration: 0.3, ease: 'power2.inOut' }, 3.9);
      // zoom a través del escudo LDT: su naranja se vuelve el siguiente mundo
      tl.to('#x-poster', { x: 540 - 332 * 26, y: 960 - 1049 * 26, scale: 26, duration: 0.3, ease: 'power3.in' }, 4.2);
      tl.to('#x-fill', { opacity: 1, duration: 0.14, ease: 'none' }, 4.36);
      tl.to({}, { duration: 4.5 - tl.duration() });`;
  return scene("exportar", { states: E, vars: ["t_exp"], css, body, script: s });
}

// ───────────────────────── escena 5 · delegado (20.5–25.5 s) ─────────────────────────
function delegadoScene() {
  const D1 = "09-delegado/mobile/04-mi-equipo", D2 = "09-delegado/mobile/05-analisis-proximo-rival";
  const body = `
    <div class="layer" id="d-w1">${cap(D1, "d-k1")}</div>
    <div class="layer" id="d-w2">${cap(D2, "d-k2").replace(/<\/div>$/, '<div id="d-tapas"></div></div>')}</div>
    <div class="layer" id="d-fill"></div>
    ${titulo("d-t1", "t_del1")}
    ${titulo("d-t2", "t_del2")}`;
  // Cámara del análisis: s 3.2 centrada en y 560 (se recorta a -781)
  const S2 = 3.0, X2 = Math.min(0, Math.max(W - 390 * S2, 540 - 195 * S2)), Y2 = Math.min(0, Math.max(H - 844 * S2, 900 - 560 * S2));
  const sx = (x) => x, sy = (y) => y, K = 1;
  const num = [["ganar", 55, 45, "left"], ["empatar", 152, 21, "center"], ["perder", 250, 34, "right"]];
  const bars = [[55, 123, "#3FBF8A"], [181, 58, "#FBBF24"], [242, 93, "#F87171"]];
  const tapas = `
        <div class="tapa" id="d-tv" style="left:${sx(52)}px;top:${sy(527)}px;width:${286}px;height:${28}px"></div>
        ${num.map(([k, x]) => `<div class="tapa" style="left:${sx(x - 2)}px;top:${sy(594)}px;width:${89}px;height:${33}px"></div><div class="numero ${num.find((n) => n[0] === k)[3]}" id="d-n-${k}" style="left:${sx(x)}px;top:${sy(594)}px;width:${85}px;height:${33}px">0 %</div>`).join("")}
        ${bars.map(([x, w], i) => `<div class="tapa barra" id="d-b${i}" style="left:${sx(x) - 2}px;top:${sy(635)}px;width:${Math.round(w * S2) + 4}px;height:${12}px"></div>`).join("")}`;
  const css = `
#d-w2 { opacity: 0; }
#d-tapas { position: absolute; left: 0; top: 0; width: 390px; height: 844px; }
#d-fill { background: #F9A825; z-index: 30; clip-path: circle(1500px at 166px 305px); }
#root .numero { position: absolute; color: #fff; font: 700 ${24}px/${33}px Poppins; letter-spacing: -0.01em; }
#root .numero.left { text-align: left; } #root .numero.center { text-align: center; } #root .numero.right { text-align: right; }
#root .barra { transform-origin: 100% 50%; }
#d-tv { transform-origin: 100% 50%; }
`;
  const s = `
      var B1 = { x: 0, y: 0, scale: M };
      gsap.set('#d-k1', Object.assign({}, B1, { scale: M * 1.06 })); tl.set('#d-k1', Object.assign({}, B1, { scale: M * 1.06 }), 0);
      tl.to('#d-k1', Object.assign({ duration: 0.6, ease: 'expo.out' }, B1), 0.05);
      // del naranja del escudo sale la cuenta del delegado
      tl.fromTo('#d-fill', { clipPath: 'circle(1500px at 166px 305px)' }, { clipPath: 'circle(0px at 166px 305px)', duration: 0.5, ease: 'power3.inOut' }, 0);
      enter(tl, '#d-t1', 0.4, 'blur');
      leave(tl, '#d-t1', 1.62);
      // "scroll" al análisis
      var C2 = { x: ${X2}, y: ${Y2}, scale: ${S2} };
      gsap.set('#d-k2', C2); tl.set('#d-k2', C2, 0);
      tl.to('#d-w1', { y: -900, filter: 'blur(6px)', opacity: 0, duration: 0.55, ease: 'power2.inOut' }, 1.7);
      tl.set('#d-w2', { opacity: 1 }, 1.7);
      tl.fromTo('#d-w2', { y: 900 }, { y: 0, duration: 0.55, ease: 'power2.inOut' }, 1.7);
      // la frase de la app se escribe y las probabilidades se llenan en cadena
      tl.fromTo('#d-tv', { scaleX: 1 }, { scaleX: 0, duration: 0.6, ease: 'none' }, 2.4);
      [['ganar', 45], ['empatar', 21], ['perder', 34]].forEach(function (p, i) {
        var o = { v: 0 }, el = document.getElementById('d-n-' + p[0]);
        tl.to(o, { v: p[1], duration: 0.7, ease: 'expo.out', onUpdate: function () { el.textContent = Math.round(o.v) + ' %'; } }, 2.75 + i * 0.12);
        tl.fromTo('#d-b' + i, { scaleX: 1 }, { scaleX: 0, duration: 0.6, ease: 'expo.out' }, 2.75 + i * 0.12);
      });
      tl.to('#d-k2', { x: ${X2} - 30, y: ${Y2} - 40, scale: ${S2} * 1.04, duration: 1.6, ease: 'power1.inOut' }, 2.4);
      enter(tl, '#d-t2', 2.5, 'pop');
      leave(tl, '#d-t2', 4.45);
      // salida: se aleja y se desenfoca para dar paso a la tabla final
      tl.to('#d-w2', { scale: 0.9, opacity: 0, filter: 'blur(12px)', duration: 0.34, ease: 'power3.in', transformOrigin: '50% 50%' }, 4.62);
      tl.to({}, { duration: 5.0 - tl.duration() });`;
  return scene("delegado", { states: [D1, D2], vars: ["t_del1", "t_del2"], css, body: body.replace('<div id="d-tapas"></div>', `<div id="d-tapas">${tapas}</div>`), script: s });
}

// ───────────────────────── escena 6 · liguilla (25.5–30 s) ─────────────────────────
function liguillaScene() {
  const LT = "06-liguilla/mobile/01-tabla-final", BR = "06-liguilla/desktop/06-cuadro-completo", CH = "06-liguilla/mobile/07-torneo-con-campeon";
  const body = `
    <div class="layer" id="l-w1">${cap(LT, "l-k1")}</div>
    <div class="layer" id="l-w2">${cap(BR, "l-k2")}</div>
    <div class="layer" id="l-w3">${cap(CH, "l-k3")}</div>
    ${titulo("l-t", "t_lig")}
    <div class="flash" id="l-flash"></div>`;
  const css = `
#l-w2, #l-w3 { opacity: 0; }
#l-k2 { clip-path: inset(0px 840px 0px 0px); }
`;
  const S = 2.4, Y = -120, X = (cx) => Math.round(540 - cx * S);
  const s = `
      var T = { x: 0, y: -120, scale: M };
      gsap.set('#l-k1', T); tl.set('#l-k1', T, 0);
      tl.fromTo('#l-w1', { opacity: 0, filter: 'blur(12px)', scale: 1.05 }, { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 0.4, ease: 'expo.out', transformOrigin: '50% 50%' }, 0);
      enter(tl, '#l-t', 0.3, 'clip');
      leave(tl, '#l-t', 2.6);
      // las 8 de arriba salen hacia su llave; las 2 de abajo se apagan
      var equipos = ['Leones de Tlalpan', 'Real Cuauht', 'Unión Santa Fe', 'Atlético San Isidro', 'Dinamo Tepeyac', 'Deportivo Colonia', 'Obreros Unidos', 'Racing Coyoac'];
      equipos.forEach(function (n, i) { var r = row('#l-k1', n); if (r) tl.to(r, { x: 300, opacity: 0, filter: 'blur(6px)', duration: 0.34, ease: 'power3.in' }, 0.75 + i * 0.05); });
      ['Sporting Las', 'Inter Xochim'].forEach(function (n) { var r = row('#l-k1', n); if (r) tl.to(r, { opacity: 0.15, duration: 0.3 }, 0.75); });
      tl.to('#l-w1', { opacity: 0, duration: 0.25 }, 1.25);
      // el cuadro de escritorio: la cámara viaja cuartos → semis → final y el cuadro se dibuja por delante
      var B0 = { x: ${X(452)}, y: ${Y}, scale: ${S} };
      gsap.set('#l-k2', B0); tl.set('#l-k2', B0, 0);
      tl.fromTo('#l-w2', { opacity: 0, x: 140 }, { opacity: 1, x: 0, duration: 0.4, ease: 'expo.out' }, 1.15);
      tl.to('#l-k2', { x: ${X(764)}, duration: 0.42, ease: 'power2.inOut' }, 1.62);
      tl.to('#l-k2', { clipPath: 'inset(0px 540px 0px 0px)', duration: 0.42, ease: 'power2.inOut' }, 1.55);
      tl.to('#l-k2', { x: ${X(1076)}, duration: 0.42, ease: 'power2.inOut' }, 2.3);
      tl.to('#l-k2', { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.42, ease: 'power2.inOut' }, 2.23);
      // pausa antes del pago, y golpe: CAMPEÓN
      var C = cam(390, 844, { x: 229, y: 357, w: 80, h: 80 }, 3.4, 900);
      gsap.set('#l-k3', C); tl.set('#l-k3', C, 0);
      tl.set('#l-w3', { opacity: 1 }, 3.3);
      tl.set('#l-w2', { opacity: 0 }, 3.3);
      tl.fromTo('#l-k3', Object.assign({}, C, { scale: 4.3, x: C.x - 230, y: C.y - 330 }), Object.assign({ duration: 0.5, ease: 'back.out(1.5)' }, C), 3.3);
      tl.fromTo('#l-flash', { opacity: 0.9 }, { opacity: 0, duration: 0.14, ease: 'power2.out', immediateRender: false }, 3.3);
      [3.34, 3.38, 3.42, 3.46, 3.5].forEach(function (t, k) { tl.to('#l-w3', { x: [10, -8, 6, -3, 0][k], y: [-6, 7, -4, 2, 0][k], duration: 0.04, ease: 'none' }, t); });
      tl.to({}, { duration: 4.5 - tl.duration() });`;
  return scene("liguilla", { states: [LT, BR, CH], vars: ["t_lig"], css, body, script: s });
}

// ───────────────────────── escena 7 · final y cierre (30–36 s) ─────────────────────────
function finalScene() {
  const CH = "06-liguilla/mobile/07-torneo-con-campeon";
  const body = `
    <div class="layer" id="f-chat">
      <div id="f-fondo"></div>
      <div id="f-cab" data-layout-ignore><div class="av" data-layout-ignore>VD</div><div class="nom"><b>Liga Valle Dorado</b><span>Delegados · 11 participantes</span></div></div>
      <div class="burbuja" id="f-q" style="top:466px"><b style="color:#EF5350">Javier · ASI</b><span>¿Cómo va la tabla?</span></div>
      <div id="f-marco"></div>
      <div class="burbuja" id="f-r1" style="top:1292px"><b style="color:#BA68C8">Ernesto · RCF</b><span>¡Campeones!</span></div>
      <div class="burbuja" id="f-r2" style="top:1446px"><b style="color:#EF5350">Javier · ASI</b><span>Ya la vi en el link</span></div>
      <div id="f-caja" data-layout-ignore><span>Mensaje</span></div>
    </div>
    <div class="layer" id="f-shot">${cap(CH, "f-k")}</div>
    <div id="f-reac"><b>❤</b><span>9</span></div>
    ${titulo("f-t", "t_fin")}
    <div class="layer" id="f-end">
      <div id="f-morph"></div>
      <img id="f-logo" src="assets/img/logo_app.png" alt="Bracket App">
      <div id="f-marca">Bracket App</div>
      <div id="f-boton">Empieza gratis</div>
      <div id="f-bio">Link en la bio</div>
    </div>`;
  const css = `
#f-fondo { position: absolute; inset: 0; background: #0B1418; }
#f-cab { position: absolute; left: 0; top: 0; width: ${W}px; height: 270px; background: #131F24; border-bottom: 2px solid #1E2A30; display: flex; align-items: flex-end; gap: 26px; padding: 0 40px 34px; }
#f-cab .av { width: 104px; height: 104px; border-radius: 50%; background: #F2B705; color: #0E2A47; font: 700 40px/104px Poppins; text-align: center; }
#f-cab .nom { display: flex; flex-direction: column; color: #fff; }
#f-cab .nom b { font: 700 42px/1.2 Poppins; }
#f-cab .nom span { font: 500 30px/1.3 Poppins; color: #8FA0A8; }
#f-caja { position: absolute; left: 0; top: 1640px; width: ${W}px; height: 280px; background: #131F24; border-top: 2px solid #1E2A30; padding: 34px 40px; }
#f-caja span { display: block; height: 96px; border-radius: 48px; background: #1E2A30; color: #6F8089; font: 500 36px/96px Poppins; padding: 0 40px; }
#f-chat .burbuja { position: absolute; left: 44px; max-width: 800px; background: #1E2A30; border-radius: 12px 36px 36px 36px; padding: 18px 34px 22px; display: flex; flex-direction: column; transform-origin: 0 100%; }
#f-chat .burbuja b { font: 600 28px/1.3 Poppins; }
#f-chat .burbuja span { font: 500 44px/1.3 Poppins; color: #E9EEF0; }
#f-r1, #f-r2 { opacity: 0; }
#f-marco { position: absolute; left: 486px; top: 618px; width: 556px; height: 646px; border-radius: 36px 12px 36px 36px; background: #1cb0f6; opacity: 0; }
#f-shot { z-index: 10; transform-origin: 0 0; }
#f-reac { position: absolute; left: 860px; top: 1230px; height: 64px; padding: 0 20px; border-radius: 32px; background: #1E2A30; border: 3px solid #0B1418; display: flex; align-items: center; gap: 10px; z-index: 12; opacity: 0; }
#f-reac b { color: #F87171; font: 700 34px/1 Poppins; } #f-reac span { color: #fff; font: 600 32px/1 Poppins; }
#f-t { top: 300px; }
#f-end { z-index: 50; pointer-events: none; }
#f-morph { position: absolute; left: 486px; top: 618px; width: 556px; height: 646px; background: #1cb0f6; border-radius: 36px; transform-origin: 0 0; opacity: 0; }
#f-logo { position: absolute; left: 390px; top: 560px; width: 300px; height: 300px; opacity: 0; }
#f-marca { position: absolute; left: 0; width: ${W}px; top: 900px; text-align: center; color: #fff; font: 700 100px/1.1 Poppins; letter-spacing: -0.02em; clip-path: inset(0 100% 0 0); }
#f-boton { position: absolute; left: 290px; width: 500px; top: 1070px; height: 124px; border-radius: 30px; background: #0E9AE0; color: #fff; font: 700 54px/124px Poppins; text-align: center; opacity: 0; box-shadow: 0 20px 50px rgba(28, 176, 246, 0.25); }
#f-bio { position: absolute; left: 0; width: ${W}px; top: 1226px; text-align: center; color: #9AA7AE; font: 600 40px/1.2 Poppins; opacity: 0; }
`;
  // La captura del campeón con la misma cámara con que terminó la escena anterior; se encoge hasta la burbuja.
  const s = `
      var C = cam(390, 844, { x: 229, y: 357, w: 80, h: 80 }, 3.4, 900);
      gsap.set('#f-k', C); tl.set('#f-k', C, 0);
      // la captura del campeón se va al chat como imagen enviada (llevar de un mundo a otro)
      var k = 0.5, bx = 494, by = 626;
      tl.fromTo('#f-shot', { x: 0, y: 0, scale: 1, clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { x: bx, y: by - 520 * k, scale: k, clipPath: 'inset(520px 0px 140px 0px round 56px)', duration: 0.62, ease: 'power3.inOut' }, 0);
      tl.to('#f-shot', { filter: 'blur(6px)', duration: 0.31, ease: 'power2.in' }, 0);
      tl.to('#f-shot', { filter: 'blur(0px)', duration: 0.31, ease: 'power2.out' }, 0.31);
      tl.fromTo('#f-marco', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.45);
      tl.fromTo('#f-r1', { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.8)' }, 0.85);
      tl.fromTo('#f-reac', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.2)' }, 1.05);
      tl.fromTo('#f-r2', { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.8)' }, 1.15);
      enter(tl, '#f-t', 1.0, 'pop');
      leave(tl, '#f-t', 2.98);
      // morph: la imagen enviada se condensa en el logo
      tl.to(['#f-chat', '#f-reac'], { opacity: 0, filter: 'blur(14px)', duration: 0.3, ease: 'power2.in' }, 2.95);
      tl.set('#f-morph', { opacity: 1 }, 3.05);
      tl.to('#f-shot', { opacity: 0, duration: 0.12 }, 3.05);
      tl.fromTo('#f-morph', { x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: 36 }, { x: 390 - 486, y: 560 - 618, scaleX: 300 / 556, scaleY: 300 / 646, borderRadius: 150, duration: 0.36, ease: 'power3.inOut' }, 3.05);
      tl.fromTo('#f-logo', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.34, ease: 'back.out(1.6)' }, 3.32);
      tl.to('#f-morph', { opacity: 0, duration: 0.2 }, 3.4);
      tl.fromTo('#f-marca', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.45, ease: 'expo.out' }, 3.5);
      tl.fromTo('#f-boton', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' }, 3.7);
      tl.fromTo('#f-bio', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 3.85);
      tl.to({}, { duration: 6.0 - tl.duration() });`;
  return scene("final", { states: [CH], vars: ["t_fin"], css, body, script: s });
}

// ───────────────────────── subtítulos (solo voz.html) ─────────────────────────
// Frases de la voz (tiempos en el archivo de ElevenLabs) y dónde caen en el reel.
const VOZ = [
  { at: 0.15, src: [0.08, 3.28], w: [["Si", .08], ["organizas", .16], ["una", .72], ["liga,", .88], ["ya", 1.52], ["sabes", 1.76], ["qué", 2.12], ["te", 2.24], ["van", 2.4], ["a", 2.52], ["preguntar…", 2.64]] },
  { at: 3.45, src: [5.44, 7.92], w: [["Cada", 5.44], ["domingo,", 5.84], ["uno", 6.88], ["por", 7.36], ["uno.", 7.6]] },
  { at: 5.65, src: [8.693, 10.76], w: [["Ahora", 8.693], ["contestas", 9.08], ["con", 9.56], ["un", 9.76], ["solo", 9.92], ["link.", 10.16]] },
  { at: 7.7, src: [11.232, 13.04], w: [["Capturas", 11.232], ["el", 11.48], ["resultado", 11.6], ["del", 12.08], ["partido…", 12.36]] },
  { at: 9.62, src: [13.107, 16.04], w: [["y", 13.107], ["la", 13.2], ["tabla", 13.44], ["y", 13.72], ["los", 13.84], ["goleadores", 13.96], ["se", 14.64], ["actualizan", 14.88], ["solos.", 15.44]] },
  { at: 13.15, src: [16.368, 19.04], w: [["Con", 16.368], ["tus", 16.44], ["puntos,", 16.64], ["tus", 17.253], ["desempates", 17.44], ["y", 18.24], ["tu", 18.4], ["liguilla.", 18.56]] },
  { at: 16.3, src: [19.584, 21.84], w: [["La", 19.584], ["sacas", 19.68], ["en", 19.96], ["imagen,", 20.08], ["lista", 20.8], ["para", 21.2], ["el", 21.36], ["grupo.", 21.44]] },
  { at: 20.35, src: [22.304, 27.52], w: [["Y", 22.304], ["cada", 22.48], ["delegado", 22.72], ["tiene", 23.28], ["su", 23.52], ["propia", 23.68], ["cuenta:", 24.0], ["ve", 24.8], ["sus", 24.96], ["números", 25.12], ["y", 25.6], ["el", 25.76], ["análisis", 25.92], ["de", 26.36], ["su", 26.48], ["próximo", 26.64], ["rival.", 27.12]] },
  { at: 26.2, src: [28.107, 30.56], w: [["Llevas", 28.107], ["toda", 28.56], ["la", 28.88], ["liga", 29.12], ["hasta", 29.44], ["la", 29.84], ["final…", 30.0]] },
  { at: 30.9, src: [31.753, 33.88], w: [["Tu", 31.753], ["liga", 31.84], ["entera,", 32.08], ["en", 32.88], ["un", 33.04], ["link.", 33.28]] },
  { at: 32.7, src: [34.24, 37.2], w: [["Bracket", 34.24], ["App.", 34.68], ["Empieza", 35.24], ["gratis:", 35.6], ["link", 36.44], ["en", 36.6], ["la", 36.68], ["bio.", 36.8]] },
];
function subtitulosScene() {
  // Grupos de 2–3 palabras; se corta en signos de puntuación.
  const groups = [];
  for (const seg of VOZ) {
    const off = seg.at - seg.src[0];
    let cur = [];
    seg.w.forEach(([t, s], i) => {
      cur.push([t, s + off]);
      const next = seg.w[i + 1];
      if (cur.length >= 3 || /[,.:…]$/.test(t) || !next) {
        const end = next ? next[1] + off - 0.02 : seg.src[1] + off + 0.1;
        groups.push({ text: cur.map((c) => c[0]).join(" "), start: cur[0][1] - 0.04, end });
        cur = [];
      }
    });
  }
  const body = groups.map((g, i) => `<div class="sub" id="s${i}"><span>${g.text}</span></div>`).join("\n    ");
  const css = `
#root .sub { position: absolute; left: 60px; right: 60px; top: 304px; height: 160px; display: flex; align-items: flex-start; justify-content: center; opacity: 0; visibility: hidden; }
#root .sub span { display: inline-block; max-width: 920px; padding: 18px 34px 22px; border-radius: 30px; background: rgba(13, 21, 25, 0.94); color: #fff; font: 700 66px/1.15 Poppins; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45); text-align: center; letter-spacing: -0.01em; }
`;
  const s = `
      var G = ${JSON.stringify(groups.map((g) => [+g.start.toFixed(3), +g.end.toFixed(3)]))};
      G.forEach(function (g, i) {
        var id = '#s' + i;
        tl.set(id, { visibility: 'visible' }, g[0]);
        tl.fromTo(id, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power3.out' }, g[0]);
        tl.to(id, { opacity: 0, duration: 0.08, ease: 'power2.in' }, g[1] - 0.08);
        tl.set(id, { opacity: 0, visibility: 'hidden' }, g[1]);
      });
      tl.to({}, { duration: ${DUR} - tl.duration() });`;
  fs.writeFileSync(path.join(PROJ, "compositions", "subtitulos.html"), `<!-- Subtítulos de la voz (palabra a palabra de ElevenLabs Scribe). Generado por tools/build.mjs. -->
<template>
  <style>
${css}
  </style>
  <div id="root" data-composition-id="subtitulos" data-width="${W}" data-height="${H}">
    ${body}
  </div>
  <script>
    (function () {
      var tl = gsap.timeline({ paused: true });
${s}
      window.__timelines["subtitulos"] = tl;
    })();
  </script>
</template>
`);
  return groups.length;
}

// ───────────────────────── sonido ─────────────────────────
// Efectos con causa en pantalla (tiempos globales). Dos o tres tomas que se alternan.
const SFX = [];
const add = (file, t, dur, vol = 0.6) => SFX.push({ file, t: +t.toFixed(3), dur, vol });
LLEGA.forEach((t, i) => add("notificacion.mp3", t, 0.15, i % 2 ? 0.32 : 0.4));
add("clic.mp3", 6.7, 0.12, 0.9);              // toque al enlace
add("whoosh-1.mp3", 6.76, 0.6, 0.5);          // iris
add("whoosh-2.mp3", 7.5 + 0.7, 0.55, 0.45);   // zoom a través de la fila
add("clic-2.mp3", 7.5 + 3.3, 0.3, 0.8);       // «Sí, guardar»
add("whoosh-1.mp3", 7.5 + 3.72, 0.5, 0.45);   // la píldora viaja
add("clic.mp3", 7.5 + 4.6, 0.12, 0.7);        // la fila aterriza
add("whoosh-2.mp3", 7.5 + 4.98, 0.5, 0.35);   // corte a goleadores
add("obturador.mp3", 13 + 2.88, 0.8, 0.5);    // destello del congelado
[0.5, 0.82, 1.14, 1.46, 1.78, 2.12].forEach((t, i) => add(i % 2 ? "whoosh-2.mp3" : "whoosh-1.mp3", 16 + t, 0.4, 0.3));
add("clic.mp3", 16 + 2.75, 0.12, 0.8);        // Descargar
add("impacto.mp3", 16 + 3.2, 1.2, 0.45);      // el póster aterriza
add("whoosh-1.mp3", 16 + 4.16, 0.5, 0.5);     // a través del escudo
add("whoosh-2.mp3", 20.5 + 1.7, 0.5, 0.35);   // scroll al análisis
add("whoosh-1.mp3", 25.5 + 1.15, 0.5, 0.35);  // entra el cuadro
add("impacto.mp3", 25.5 + 3.3, 2.0, 0.95);    // CAMPEÓN
add("whoosh-2.mp3", 30 + 0.05, 0.6, 0.4);     // la captura se va al chat
add("notificacion.mp3", 30 + 0.85, 0.35, 0.4);
add("notificacion.mp3", 30 + 1.15, 0.35, 0.32);
add("whoosh-1.mp3", 30 + 3.05, 0.5, 0.4);     // morph al logo
add("impacto.mp3", 30 + 3.32, 1.4, 0.4);      // el logo encaja

// ───────────────────────── raíz ─────────────────────────
const SCENES = [
  ["chat", 0, 7.5], ["resultado", 7.5, 5.5], ["reglas", 13, 3], ["exportar", 16, 4.5],
  ["delegado", 20.5, 5], ["liguilla", 25.5, 4.5], ["final", 30, 6],
];
function root(file, voz) {
  const DIR = voz ? PROJ_VOZ : PROJ;
  const built = Object.fromEntries(ALL.map((s) => [s.id, s]));
  const hosts = SCENES.map(([id, t, d]) => `      <div id="${id}" data-composition-id="${id}" class="clip" data-composition-src="compositions/${id}.html" data-start="${t}" data-duration="${d}" data-track-index="0" data-track-kind="graphics" data-variable-values='${varsValues(built[id].vars, voz)}'></div>`).join("\n");
  const subs = voz ? `\n      <div id="subtitulos" data-composition-id="subtitulos" class="clip" data-composition-src="compositions/subtitulos.html" data-start="0" data-duration="${DUR}" data-track-index="1" data-track-kind="captions" style="z-index: 90"></div>` : "";
  const lanes = [];
  const lane = (x) => { let k = lanes.findIndex((end) => end <= x.t + 1e-6); if (k < 0) { k = lanes.length; lanes.push(0); } lanes[k] = x.t + x.dur; return 3 + k; };
  const fx = SFX.map((x, i) => `      <audio id="fx-${i}" class="clip" src="assets/sfx/${x.file}" data-start="${x.t}" data-duration="${x.dur}" data-track-index="${lane(x)}" data-volume="${voz ? +(x.vol * 0.7).toFixed(2) : x.vol}" data-fade-out="0.08"></audio>`).join("\n");
  const voice = voz ? "\n" + VOZ.map((v, i) => `      <audio id="voz-${i}" class="clip" src="assets/audio/voz-isaac.mp3" data-start="${+(v.at - 0.04).toFixed(3)}" data-media-start="${+(v.src[0] - 0.04).toFixed(3)}" data-duration="${+Math.min(v.src[1] - v.src[0] + 0.14, 37.2 - (v.src[0] - 0.04)).toFixed(3)}" data-track-index="${i % 2 ? 9 : 2}" data-volume="1" data-fade-out="0.05"></audio>`).join("\n") : "";
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <!-- Reel de Bracket App${voz ? " · versión con voz (ElevenLabs, voz «Isaac») y subtítulos" : " · versión sin voz (títulos en pantalla)"}. Generado por tools/build.mjs desde GUION.md${voz ? " y VOZ.md" : ""}. -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #131F24; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}">
${hosts}${subs}
${fx}${voice}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.to({}, { duration: ${DUR} });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(DIR, file), html);
}

fs.mkdirSync(path.join(PROJ, "compositions"), { recursive: true });
const ALL = [chatScene(), resultadoScene(), reglasScene(), exportarScene(), delegadoScene(), liguillaScene(), finalScene()];
const nSubs = subtitulosScene();
fs.mkdirSync(PROJ_VOZ, { recursive: true });
root("index.html", false);
root("index.html", true);
for (const f of used) {
  const dest = path.join(PROJ, /\.(woff2?|ttf|otf)$/i.test(f) ? "assets/fonts" : "assets/capturas", f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(CAP, "_assets", f), dest);
}
// reel-voz: mismas escenas y recursos, otra raíz
fs.mkdirSync(PROJ_VOZ, { recursive: true });
for (const d of ["compositions", "assets"]) fs.cpSync(path.join(PROJ, d), path.join(PROJ_VOZ, d), { recursive: true });
for (const f of ["hyperframes.json", "package.json", "CLAUDE.md", "AGENTS.md"]) if (fs.existsSync(path.join(PROJ, f))) fs.copyFileSync(path.join(PROJ, f), path.join(PROJ_VOZ, f));
fs.writeFileSync(path.join(PROJ_VOZ, "meta.json"), JSON.stringify({ id: "bracket-reel-voz", name: "Bracket App · reel con voz" }, null, 2));
fs.writeFileSync(path.join(PROJ, "meta.json"), JSON.stringify({ id: "bracket-reel", name: "Bracket App · reel" }, null, 2));
console.log(ALL.map((s) => `${s.id} ${s.kb} KB`).join(" · "));
console.log(`subtítulos: ${nSubs} grupos · efectos: ${SFX.length} · recursos de captura: ${used.size}`);
