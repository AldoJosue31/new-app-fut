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
// Una captura dentro de un contenedor (#uid, origen 0 0). Los ids internos llevan el prefijo de la escena.
// full: deja toda la altura de la página para poder hacer scroll de verdad dentro del teléfono.
function cap(p, uid, full) {
  const s = state(p);
  const vw = s.meta.viewport.width;
  const vh = full ? s.meta.altoPagina - (s.meta.scrollY || 0) : s.meta.viewport.height;
  let f = relocate(s.frame);
  if (full) f = f.replace(/height:\d+px;overflow:hidden;contain:layout paint;/, `height:${vh}px;overflow:hidden;contain:layout paint;`);
  f = f.split(s.meta.prefijoIds).join(`${uid}-`)
    .replace('<div class="bk-frame', '<div data-layout-allow-overflow data-layout-ignore class="bk-frame')
    .replace(/\sdata-layer=/g, " data-app-layer=")
    .replace(/style="[^"]*"/g, (st) => st.replace(/(?:-webkit-)?(?:transition|animation)(?:-[\w-]+)?\s*:[^;"]*;?\s*/g, ""));
  return `<div id="${uid}" class="cam" style="width:${vw}px;height:${vh}px" data-layout-allow-overflow data-layout-ignore>${f}</div>`;
}
function sceneCss(states) {
  // CSS completo de cada estado (deduplicar por líneas rompía bloques de varias líneas)
  return [...new Set(states)].map((p) => `/* ${p} */\n${cleanCss(state(p).css)}`).join("\n");
}

// ───────────────────────── piezas comunes (v2: teléfono legible + piezas elevadas) ─────────────────────────
// Encuadre: la app se ve SIEMPRE completa dentro de un teléfono a escala 2.2 (texto de 14 px → 31 px).
// Solo la pieza que importa "salta" del teléfono a tamaño grande (≤ 2.9×) y luego regresa a su lugar.
const S = 2.2;                       // escala de la pantalla del teléfono
const TX = 97, TY = 470;             // esquina del teléfono
const PX = TX + 14, PY = TY + 14;    // esquina de la pantalla (bisel de 14 px)
const SW = Math.round(390 * S), SH = Math.round(844 * S);
const GROUND = { noche: "#0B1418", marino: "#0E2A47", oro: "#F2B705", naranja: "#F9A825" };

const BASE_CSS = `
#root { position: absolute; inset: 0; overflow: hidden; font-family: Poppins, sans-serif; }
#root .layer { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
#root .suelo { background: ${GROUND.marino}; }
#root .tel { position: absolute; left: ${TX}px; top: ${TY}px; width: ${SW + 28}px; height: ${SH + 28}px; padding: 14px; border-radius: 70px; background: #04080A; box-shadow: 0 50px 120px rgba(0, 0, 0, 0.5), inset 0 0 0 2px rgba(255, 255, 255, 0.1); z-index: 10; transform-origin: 50% 0; }
#root .pantalla { position: relative; width: ${SW}px; height: ${SH}px; border-radius: 56px; overflow: hidden; background: #131F24; }
#root .scr { position: absolute; left: 0; top: 0; width: ${SW}px; height: ${SH}px; opacity: 0; }
#root .cam { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
#root .velo { position: absolute; inset: 0; background: #000; opacity: 0; z-index: 20; pointer-events: none; }
#root .lift { position: absolute; left: 0; top: 0; transform-origin: 0 0; overflow: hidden; border-radius: 30px; background: #131F24; box-shadow: 0 40px 110px rgba(0, 0, 0, 0.6), 0 0 0 3px rgba(255, 255, 255, 0.16); opacity: 0; z-index: 30; }
#root .slot { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; }
#root .titulo { position: absolute; left: 70px; right: 70px; top: 296px; display: flex; justify-content: center; z-index: 40; opacity: var(--vis, 1); }
#root .titulo > span { display: block; max-width: 940px; color: #fff; font: 700 66px/1.1 Poppins, sans-serif; letter-spacing: -0.015em; text-align: center; white-space: pre-line; opacity: 0; }
#root .titulo.oscuro > span { color: #2A1A00; }
#root .toque { position: absolute; left: 0; top: 0; width: 100px; height: 100px; margin: -50px 0 0 -50px; border-radius: 50%; background: rgba(255, 255, 255, 0.3); border: 5px solid rgba(255, 255, 255, 0.95); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5); z-index: 60; opacity: 0; }
#root .tapa { position: absolute; background: #10191D; }
#root .flash { position: absolute; inset: 0; background: #fff; opacity: 0; z-index: 70; pointer-events: none; }
`;
const titulo = (id, v, cls = "") => `<div class="titulo ${cls}" id="${id}" style="--vis: var(--${v}-vis, 1)"><span data-var-text="${v}">${VARS_TEXT[v]}</span></div>`;
// Textos de títulos: [sin voz, con voz]. Con voz, "" oculta el título: los subtítulos ocupan esa franja.
const TITULOS = {
  t_chat1: ["Organizar una liga\nes contestar esto", ""],
  t_chat2: ["…y tú, uno por uno", ""],
  t_link: ["Un solo enlace", ""],
  t_res1: ["Capturas el resultado", ""],
  t_res2: ["La tabla se\nacomoda sola", ""],
  t_reg: ["Con tus reglas", ""],
  t_exp: ["Lista para compartir", ""],
  t_del1: ["Cada delegado,\nsu propia cuenta", ""],
  t_del2: ["Y el análisis\nde su rival", ""],
  t_lig: ["De la jornada 1\na la final", ""],
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

// Pantalla del teléfono: <div class="scr" id="ID"> con la captura (id ID-k) a escala S.
// full: la captura se deja con toda la altura de la página para poder hacer scroll de verdad.
const pantalla = (id, p, full) => `<div class="scr" id="${id}">${cap(p, `${id}-k`, full)}</div>`;
const telefono = (pre, inner) => `<div class="tel" id="${pre}-tel"><div class="pantalla" id="${pre}-pant">${inner}<div class="velo" id="${pre}-velo"></div></div></div>`;
// Pieza elevada: la región b (px de la app) de una o varias capturas, a escala SL.
const SLmax = (b, maxW = 1010, maxH = 800) => +Math.min(maxW / b.w, maxH / b.h, 3.3).toFixed(3);
function pieza(id, b, SL, states, extra = []) {
  const w = Math.round(b.w * SL), h = Math.round(b.h * SL);
  return `<div class="lift" id="${id}" style="width:${w}px;height:${h}px">${states.map((p, i) => `<div class="slot" id="${id}-s${i}">${extra[i] ? cap(p, `${id}-k${i}`).replace(/<\/div>$/, extra[i] + "</div>") : cap(p, `${id}-k${i}`)}</div>`).join("")}</div>`;
}

// Ayudas que corren dentro de cada escena (deterministas: solo leen el DOM una vez, al iniciar).
const HELP = `
var W = ${W}, H = ${H}, S = ${S}, PX = ${PX}, PY = ${PY}, SW = ${SW}, SH = ${SH};
document.querySelectorAll('#root [data-bk-scroll]').forEach(function (e) { var v = e.getAttribute('data-bk-scroll').split(','); e.scrollTop = +v[0]; e.scrollLeft = +v[1]; });
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
// pantallas del teléfono
function screen(tl, id, scroll) { var v = { x: 0, y: -scroll * S, scale: S }; gsap.set('#' + id + '-k', v); tl.set('#' + id + '-k', v, 0); }
function show(tl, id, t) { tl.set('#' + id, { opacity: 1, x: 0, y: 0 }, t); }
function push(tl, from, to, t) {
  tl.set('#' + to, { opacity: 1 }, t);
  tl.fromTo('#' + to, { x: SW }, { x: 0, duration: 0.5, ease: 'power3.inOut', immediateRender: false }, t);
  tl.to('#' + from, { x: -SW * 0.3, opacity: 0, duration: 0.5, ease: 'power3.inOut' }, t);
}
function sheetUp(tl, id, t) {
  tl.set('#' + id, { opacity: 1 }, t);
  tl.fromTo('#' + id, { y: SH * 0.7 }, { y: 0, duration: 0.45, ease: 'expo.out', immediateRender: false }, t);
}
function sheetDown(tl, id, t) { tl.to('#' + id, { y: SH * 0.8, duration: 0.38, ease: 'power3.in' }, t); tl.set('#' + id, { opacity: 0 }, t + 0.38); }
function swap(tl, from, to, t, d) {
  tl.fromTo('#' + to, { opacity: 0 }, { opacity: 1, duration: d || 0.16, ease: 'power1.out', immediateRender: false }, t);
  tl.set('#' + to, { x: 0, y: 0 }, t);
  tl.set('#' + from, { opacity: 0 }, t + (d || 0.16));
}
function scrollTo(tl, id, scroll, t, d) { tl.to('#' + id + '-k', { y: -scroll * S, duration: d || 0.6, ease: 'power2.inOut' }, t); }
// toque con el dedo sobre un punto de la app (px de la app, con el scroll de esa pantalla)
function tap(tl, sel, vx, vy, scroll, t) {
  var x = PX + vx * S, y = PY + (vy - scroll) * S;
  tl.fromTo(sel, { x: x + 140, y: y + 420, opacity: 0, scale: 1 }, { x: x, y: y, opacity: 1, duration: 0.34, ease: 'power3.out', immediateRender: false }, t - 0.36);
  tl.to(sel, { scale: 0.7, duration: 0.08, ease: 'power2.in' }, t);
  tl.to(sel, { scale: 1, opacity: 0, duration: 0.24, ease: 'power2.out' }, t + 0.08);
}
// piezas elevadas
function onPhone(b, scroll, SL) { return { x: PX + b.x * S, y: PY + (b.y - scroll) * S, scale: S / SL }; }
function rest(b, SL, cy) { var w = b.w * SL, h = b.h * SL; return { x: (W - w) / 2, y: (cy || 880) - h / 2, scale: 1 }; }
function liftSetup(id, b, SL, n) { for (var i = 0; i < n; i++) gsap.set('#' + id + '-k' + i, { x: -b.x * SL, y: -b.y * SL, scale: SL }); }
function liftUp(tl, id, b, scroll, SL, t, velo, cy) {
  tl.set('#' + id + '-s0', { opacity: 1 }, 0);
  tl.set('#' + id, { opacity: 1 }, t);
  tl.fromTo('#' + id, onPhone(b, scroll, SL), Object.assign({ duration: 0.55, ease: 'expo.out', immediateRender: false }, rest(b, SL, cy)), t);
  tl.to(velo, { opacity: 0.6, duration: 0.35, ease: 'power2.out' }, t);
  tl.to(velo.replace('-velo', '-tel'), { scale: 0.9, duration: 0.55, ease: 'expo.out' }, t);
}
function liftDown(tl, id, b, scroll, SL, t, velo) {
  tl.to('#' + id, Object.assign({ duration: 0.4, ease: 'power3.inOut' }, onPhone(b, scroll, SL)), t);
  tl.set('#' + id, { opacity: 0 }, t + 0.4);
  tl.to(velo, { opacity: 0, duration: 0.32, ease: 'power2.inOut' }, t + 0.08);
  tl.to(velo.replace('-velo', '-tel'), { scale: 1, duration: 0.4, ease: 'power3.inOut' }, t);
}
function enter(tl, sel, t, kind) {
  var span = sel + ' > span';
  if (kind === 'pop') tl.fromTo(span, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(1.7)', immediateRender: false }, t);
  else tl.fromTo(span, { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.22, ease: 'power4.out', immediateRender: false }, t);
}
function leave(tl, sel, t) { tl.to(sel + ' > span', { opacity: 0, filter: 'blur(8px)', duration: 0.18, ease: 'power2.in' }, t); }
function shake(tl, sel, t) { [0, 0.04, 0.08, 0.12, 0.16, 0.2].forEach(function (d, k) { tl.to(sel, { x: [9, -7, 6, -4, 2, 0][k], y: [-4, 5, -3, 2, -1, 0][k], duration: 0.04, ease: 'none' }, t + d); }); }
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

// Chat de delegados dibujado dentro de la pantalla (el único mundo que no es captura).
const CHAT_CSS = (pre) => `
#${pre}-chat { position: absolute; left: 0; top: 0; width: ${SW}px; height: ${SH}px; background: #0B1418; }
#${pre}-cab { position: absolute; left: 0; top: 0; width: ${SW}px; height: 176px; background: #131F24; border-bottom: 2px solid #1E2A30; display: flex; align-items: flex-end; gap: 22px; padding: 0 30px 26px; z-index: 5; }
#${pre}-cab .av { width: 84px; height: 84px; border-radius: 50%; background: #F2B705; color: #0E2A47; font: 700 32px/84px Poppins; text-align: center; }
#${pre}-cab .nom { display: flex; flex-direction: column; color: #fff; }
#${pre}-cab .nom b { font: 700 34px/1.2 Poppins; }
#${pre}-cab .nom span { font: 500 24px/1.3 Poppins; color: #8FA0A8; }
#${pre}-cab .badge { margin-left: auto; margin-bottom: 16px; min-width: 64px; height: 52px; padding: 0 14px; border-radius: 26px; background: #0A7FB8; color: #fff; font: 700 28px/52px Poppins; text-align: center; }
#${pre}-chat .burbuja { position: absolute; left: 24px; max-width: 660px; background: #1E2A30; border-radius: 10px 30px 30px 30px; padding: 12px 26px 16px; display: flex; flex-direction: column; transform-origin: 0 100%; }
#${pre}-chat .burbuja b { font: 600 22px/1.3 Poppins; }
#${pre}-chat .burbuja span { font: 500 34px/1.3 Poppins; color: #E9EEF0; }
#${pre}-caja { position: absolute; left: 0; top: 1300px; width: ${SW}px; height: 560px; background: #131F24; border-top: 2px solid #1E2A30; padding: 26px 30px; z-index: 5; }
#${pre}-caja span { display: block; height: 80px; border-radius: 40px; background: #1E2A30; color: #6F8089; font: 500 30px/80px Poppins; padding: 0 32px; }
`;
const chatCab = (pre, badge) => `<div id="${pre}-cab" data-layout-ignore><div class="av">VD</div><div class="nom"><b>Liga Valle Dorado</b><span>Delegados · 11 participantes</span></div>${badge ? `<div class="badge" id="${pre}-badge">12</div>` : ""}</div>`;

// ───────────────────────── escena 1 · chat (0–7.5 s) ─────────────────────────
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
const STEP = 118, LOW = 1060, PRE = 6;
const LLEGA = [0.35, 0.8, 1.2, 1.6, 1.95, 2.3, 3.0, 3.18, 3.36, 3.54, 3.7, 3.86, 4.02, 4.16];
const LINK = { x: SW - 24 - 640, y: 700, w: 640, h: 300 }; // burbuja del enlace (px de la pantalla)
function chatScene() {
  const pub = "08-publico/mobile/03-publico-tabla";
  const bubbles = PREGUNTAS.map(([who, col, txt], i) => `<div class="burbuja" id="b${i}" style="top:${LOW + STEP * (i - (PRE - 1))}px"><b style="color:${col}">${who}</b><span>${txt}</span></div>`).join("");
  const inner = `
      <div id="c-chat">
        <div id="c-lista" data-layout-ignore>${bubbles}</div>
        <div id="c-enlace"><div class="prev"><img src="assets/img/logo_app.png" alt="Bracket App"><div><b>Liga Valle Dorado</b><span>Tabla · Cuadro · Goleadores</span></div></div><span class="url">Bracket App · enlace público</span><span class="hora">20:14 ✓✓</span></div>
        ${chatCab("c", true)}
        <div id="c-caja" data-layout-ignore><span>Mensaje</span></div>
      </div>
      <div id="c-iris">${pantalla("c-pub", pub)}</div>`;
  const body = `
    <div class="layer suelo" id="c-suelo" style="background:${GROUND.noche}"></div>
    ${telefono("c", inner)}
    ${titulo("c-t1", "t_chat1")}
    ${titulo("c-t2", "t_chat2")}
    ${titulo("c-t3", "t_link")}
    <div class="toque" id="c-toque"></div>`;
  const css = CHAT_CSS("c") + `
#c-lista { position: absolute; left: 0; top: 0; width: ${SW}px; height: ${SH}px; }
#c-chat .burbuja { opacity: 0; }
#c-enlace { position: absolute; left: ${LINK.x}px; top: ${LINK.y}px; width: ${LINK.w}px; background: #1cb0f6; border-radius: 30px 10px 30px 30px; padding: 14px; display: flex; flex-direction: column; gap: 8px; transform-origin: 100% 100%; opacity: 0; z-index: 3; }
#c-enlace .prev { display: flex; gap: 20px; align-items: center; background: #0E8BC6; border-radius: 22px; padding: 16px; }
#c-enlace .prev img { width: 104px; height: 104px; }
#c-enlace .prev div { display: flex; flex-direction: column; }
#c-enlace .prev b { font: 700 34px/1.2 Poppins; color: #fff; }
#c-enlace .prev span { font: 500 25px/1.3 Poppins; color: #E3F5FE; }
#c-enlace .url { font: 600 27px/1.3 Poppins; color: #fff; padding: 0 10px; text-decoration: underline; }
#c-enlace .hora { font: 500 21px/1 Poppins; color: #D5F0FD; align-self: flex-end; padding: 0 10px 4px; }
#c-iris { position: absolute; inset: 0; z-index: 8; clip-path: circle(0px at ${LINK.x + LINK.w / 2}px ${LINK.y + 130}px); }
#c-iris .scr { opacity: 1; }
`;
  const cx = LINK.x + LINK.w / 2, cy = LINK.y + 130;
  const s = `
      screen(tl, 'c-pub', 0);
      for (var i = 0; i < ${PRE}; i++) tl.set('#b' + i, { opacity: 1 }, 0);
      tl.set('#c-t1 > span', { opacity: 1 }, 0);
      var LLEGA = ${JSON.stringify(LLEGA)};
      LLEGA.forEach(function (t, k) {
        tl.to('#c-lista', { y: -${STEP} * (k + 1), duration: 0.24, ease: 'power3.out' }, t);
        tl.fromTo('#b' + (${PRE} + k), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.8)', immediateRender: false }, t);
      });
      var cnt = { v: 12 };
      tl.to(cnt, { v: 99, duration: 3.9, ease: 'power2.in', onUpdate: function () { var v = Math.round(cnt.v); document.getElementById('c-badge').textContent = v >= 99 ? '99+' : String(v); } }, 0.2);
      shake(tl, '#c-tel', 2.2);
      leave(tl, '#c-t1', 2.85);
      enter(tl, '#c-t2', 3.05, 'blur');
      leave(tl, '#c-t2', 5.15);
      // silencio: llega el enlace
      tl.to('#c-lista', { y: -${STEP} * ${LLEGA.length} - 490, opacity: 0.4, filter: 'blur(8px)', duration: 0.45, ease: 'expo.out' }, 5.35);
      tl.fromTo('#c-enlace', { opacity: 0, x: 90, scale: 0.9 }, { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: 'back.out(1.3)', immediateRender: false }, 5.45);
      enter(tl, '#c-t3', 5.6, 'pop');
      leave(tl, '#c-t3', 6.6);
      tap(tl, '#c-toque', ${cx / S}, ${cy / S}, 0, 6.7);
      // iris desde el toque: se abre la tabla pública dentro del teléfono; el fondo pasa a azul marino
      tl.fromTo('#c-iris', { clipPath: 'circle(0px at ${cx}px ${cy}px)' }, { clipPath: 'circle(2200px at ${cx}px ${cy}px)', duration: 0.42, ease: 'power3.in', immediateRender: false }, 6.76);
      tl.fromTo('#c-pub-k', { scale: S * 1.06, x: -${Math.round(SW * 0.03)}, y: -40 }, { scale: S, x: 0, y: 0, duration: 0.6, ease: 'expo.out', immediateRender: false }, 6.9);
      tl.to('#c-suelo', { backgroundColor: '${GROUND.marino}', duration: 0.5, ease: 'power2.inOut' }, 6.85);
      tl.to({}, { duration: 7.5 - tl.duration() });`;
  return scene("chat", { states: [pub], vars: ["t_chat1", "t_chat2", "t_link"], css, body, script: s });
}

// ───────────────────────── escena 2 · resultado (7.5–13 s) ─────────────────────────
function resultadoScene() {
  const R = (s) => `04-resultado/mobile/${s}`;
  const P = "08-publico/mobile/03-publico-tabla";
  const st = [P, R("02-jornada"), R("03-definir-resultado"), R("05-gol-local"), R("06-goles-visita"), R("07-confirmar"), R("01-tabla-antes"), R("09-tabla-despues")];
  const MB = { x: 18, y: 166, w: 354, h: 98 }, MSL = SLmax(MB);      // marcador
  const TB = { x: 15, y: 227, w: 375, h: 125 }, TSL = SLmax(TB);     // filas 1–3 de la tabla
  const inner = `
      ${pantalla("r-pub", P)}${pantalla("r-jor", R("02-jornada"))}${pantalla("r-m3", R("03-definir-resultado"))}${pantalla("r-m5", R("05-gol-local"))}${pantalla("r-m6", R("06-goles-visita"))}${pantalla("r-t1", R("01-tabla-antes"))}${pantalla("r-t2", R("09-tabla-despues"))}${pantalla("r-m7", R("07-confirmar"))}`;
  const body = `
    <div class="layer suelo" id="r-suelo"></div>
    ${telefono("r", inner)}
    ${pieza("r-L1", MB, MSL, [R("03-definir-resultado"), R("05-gol-local"), R("06-goles-visita")])}
    ${pieza("r-L2", TB, TSL, [R("01-tabla-antes"), R("09-tabla-despues")])}
    <div id="r-mas3">+3</div>
    ${titulo("r-ta", "t_res1")}
    ${titulo("r-tb", "t_res2")}
    <div class="toque" id="r-toque"></div>`;
  const tb = { x: (W - TB.w * TSL) / 2, y: 900 - (TB.h * TSL) / 2 };
  const css = `
#r-mas3 { position: absolute; left: ${Math.round(tb.x + (318 - TB.x) * TSL) - 10}px; top: ${Math.round(tb.y + (271 - TB.y) * TSL) - 74}px; padding: 4px 22px; border-radius: 26px; background: #22C55E; color: #06210F; font: 700 52px/1.2 Poppins; z-index: 35; opacity: 0; }
#r-m7 { z-index: 6; }
`;
  const s = `
      screen(tl, 'r-pub', 0); screen(tl, 'r-jor', 150); screen(tl, 'r-m3', 0); screen(tl, 'r-m5', 0); screen(tl, 'r-m6', 0);
      screen(tl, 'r-m7', 230); screen(tl, 'r-t1', 150); screen(tl, 'r-t2', 150);
      show(tl, 'r-pub', 0);
      var MB = ${JSON.stringify(MB)}, MSL = ${MSL}, TB = ${JSON.stringify(TB)}, TSL = ${TSL};
      liftSetup('r-L1', MB, MSL, 3); liftSetup('r-L2', TB, TSL, 2);
      // 1 · del enlace público al panel del organizador: la jornada 8
      push(tl, 'r-pub', 'r-jor', 0.15);
      tap(tl, '#r-toque', 47 + 73, 528 + 17, 150, 0.85);
      // 2 · se abre "Definir resultado" y el marcador salta al frente
      sheetUp(tl, 'r-m3', 0.95);
      enter(tl, '#r-ta', 1.2, 'blur');
      liftUp(tl, '#r-L1'.slice(1), MB, 0, MSL, 1.4, '#r-velo', 820);
      tl.fromTo('#r-L1-s1', { opacity: 0 }, { opacity: 1, duration: 0.12, immediateRender: false }, 1.95);
      tl.fromTo('#r-L1', { scale: 1.05 }, { scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, 1.95);
      tl.fromTo('#r-L1-s2', { opacity: 0 }, { opacity: 1, duration: 0.12, immediateRender: false }, 2.4);
      tl.fromTo('#r-L1', { scale: 1.05 }, { scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, 2.4);
      swap(tl, 'r-m3', 'r-m5', 1.95, 0.05); swap(tl, 'r-m5', 'r-m6', 2.4, 0.05);
      leave(tl, '#r-ta', 2.82);
      liftDown(tl, 'r-L1', MB, 0, MSL, 2.8, '#r-velo');
      // 3 · confirmar y guardar
      tl.set('#r-m7', { opacity: 1 }, 3.12);
      tl.fromTo('#r-m7-k', { opacity: 0 }, { opacity: 1, duration: 0.15, immediateRender: false }, 3.12);
      tap(tl, '#r-toque', 200, 607, 230, 3.42);
      // 4 · el modal baja y la tabla se reacomoda de verdad
      show(tl, 'r-t1', 3.5);
      tl.set('#r-m6', { opacity: 0 }, 3.5);
      sheetDown(tl, 'r-m7', 3.52);
      liftUp(tl, 'r-L2', TB, 150, TSL, 3.95, '#r-velo', 900);
      enter(tl, '#r-tb', 3.9, 'pop');
      var asi = row('#r-L2-k0', 'Atlético San Isidro'), ldt = row('#r-L2-k0', 'Leones de Tlalpan');
      if (asi) { asi.style.position = 'relative'; asi.style.zIndex = '3'; tl.to(asi, { y: -38, backgroundColor: 'rgba(28,176,246,0.25)', duration: 0.5, ease: 'power3.inOut' }, 4.45); }
      if (ldt) tl.to(ldt, { y: 38, duration: 0.5, ease: 'power3.inOut' }, 4.45);
      tl.fromTo('#r-L2-s1', { opacity: 0 }, { opacity: 1, duration: 0.12, immediateRender: false }, 4.98);
      swap(tl, 'r-t1', 'r-t2', 4.98, 0.05);
      tl.fromTo('#r-mas3', { opacity: 0, scale: 0.4, y: 24 }, { opacity: 1, scale: 1, y: 0, duration: 0.42, ease: 'back.out(2.2)', immediateRender: false }, 5.0);
      tl.to({}, { duration: 5.5 - tl.duration() });`;
  return scene("resultado", { states: st, vars: ["t_res1", "t_res2"], css, body, script: s });
}

// ───────────────────────── escena 3 · reglas (13–16 s) ─────────────────────────
function reglasScene() {
  const T2 = "04-resultado/mobile/09-tabla-despues", TB = { x: 15, y: 227, w: 375, h: 125 }, TSL = SLmax(TB);
  const r6 = "01-reglas/mobile/06-torneo-puntuacion", r7 = "01-reglas/mobile/07-torneo-formato", r8 = "01-reglas/mobile/08-torneo-reglas";
  const PAL = ["Tus puntos", "Tu formato", "Tus horarios"];
  const inner = `${pantalla("g-t2", T2)}${pantalla("g-r6", r6)}${pantalla("g-r7", r7)}${pantalla("g-r8", r8)}`;
  const body = `
    <div class="layer suelo" id="g-suelo"></div>
    ${telefono("g", inner)}
    ${pieza("g-L", TB, TSL, [T2])}
    <div class="titulo" id="g-slot" style="--vis: var(--t_reg-vis, 1)"><span><em id="g-rueda">${PAL.map((p) => `<i>${p}</i>`).join("")}</em></span></div>
    <div class="toque" id="g-toque"></div>`;
  const css = `
#g-slot > span { height: 84px; overflow: hidden; }
#g-rueda { display: flex; flex-direction: column; font-style: normal; }
#g-rueda i { display: block; height: 84px; font: 700 70px/84px Poppins; font-style: normal; color: #fff; white-space: nowrap; }
#g-rueda i:nth-child(2), #g-rueda i:nth-child(3) { color: #8FD8FB; }
`;
  const s = `
      screen(tl, 'g-t2', 150); screen(tl, 'g-r6', 0); screen(tl, 'g-r7', 0); screen(tl, 'g-r8', 0);
      show(tl, 'g-t2', 0);
      // la tabla elevada del final de la escena anterior regresa al teléfono
      var TB = ${JSON.stringify(TB)}, TSL = ${TSL};
      liftSetup('g-L', TB, TSL, 1);
      tl.set('#g-L-s0', { opacity: 1 }, 0); tl.set('#g-L', Object.assign({ opacity: 1 }, rest(TB, TSL, 900)), 0);
      tl.set('#g-velo', { opacity: 0.6 }, 0); gsap.set('#g-tel', { scale: 0.9 }); tl.set('#g-tel', { scale: 0.9 }, 0);
      liftDown(tl, 'g-L', TB, 150, TSL, 0.0, '#g-velo');
      // ajustes del torneo: puntuación → formato → tiempos (pestañas reales)
      push(tl, 'g-t2', 'g-r6', 0.35);
      tl.fromTo('#g-slot > span', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'expo.out', immediateRender: false }, 0.45);
      tap(tl, '#g-toque', 233, 156, 0, 1.3);
      swap(tl, 'g-r6', 'g-r7', 1.38, 0.14);
      tl.to('#g-rueda', { y: -84, duration: 0.3, ease: 'power3.out' }, 1.38);
      tap(tl, '#g-toque', 308, 156, 0, 2.2);
      swap(tl, 'g-r7', 'g-r8', 2.28, 0.14);
      tl.to('#g-rueda', { y: -168, duration: 0.3, ease: 'power3.out' }, 2.28);
      tl.to({}, { duration: 3.0 - tl.duration() });`;
  return scene("reglas", { states: [T2, r6, r7, r8], vars: ["t_reg"], css, body, script: s });
}

// ───────────────────────── escena 4 · exportar (16–20.5 s) ─────────────────────────
function exportarScene() {
  const r8 = "01-reglas/mobile/08-torneo-reglas";
  const E = ["01-tabla-clasica", "02-tabla-combinacion-2", "03-tabla-combinacion-3", "04-tabla-combinacion-4", "05-tabla-combinacion-5", "06-tabla-combinacion-6", "07-tabla-colores-liga"].map((s) => `07-exportar/mobile/${s}`);
  const PB = { x: 36, y: 380, w: 318, h: 322 }, PSL = SLmax(PB);
  const inner = `${pantalla("x-r8", r8)}${pantalla("x-e1", E[0])}${pantalla("x-e7", E[6])}`;
  const body = `
    <div class="layer suelo" id="x-suelo"></div>
    ${telefono("x", inner)}
    ${pieza("x-L", PB, PSL, E)}
    <img id="x-poster" src="assets/img/tabla-general.png" alt="Tabla general exportada por Bracket App">
    <div class="layer" id="x-fill"></div>
    ${titulo("x-t", "t_exp")}
    <div class="toque" id="x-toque"></div>`;
  const css = `
#x-poster { position: absolute; left: 0; top: 0; width: 2160px; height: 2700px; transform-origin: 0 0; z-index: 50; opacity: 0; border-radius: 22px; box-shadow: 0 50px 120px rgba(0, 0, 0, 0.55); }
#x-fill { background: ${GROUND.naranja}; opacity: 0; z-index: 60; }
`;
  const s = `
      screen(tl, 'x-r8', 0); screen(tl, 'x-e1', 250); screen(tl, 'x-e7', 250);
      show(tl, 'x-r8', 0);
      var PB = ${JSON.stringify(PB)}, PSL = ${PSL};
      liftSetup('x-L', PB, PSL, 7);
      // 1 · abre "Exportar tabla general"
      push(tl, 'x-r8', 'x-e1', 0.0);
      // 2 · el carrusel salta al frente y pasa por los 6 diseños y los colores de la liga
      liftUp(tl, 'x-L', PB, 250, PSL, 0.5, '#x-velo', 860);
      enter(tl, '#x-t', 0.75, 'blur');
      [1.05, 1.32, 1.59, 1.86, 2.13, 2.42].forEach(function (t, k) {
        var o = '#x-L-s' + k, n = '#x-L-s' + (k + 1);
        tl.to(o, { x: -300, opacity: 0, duration: 0.16, ease: 'power3.in' }, t);
        tl.fromTo(n, { x: 300, opacity: 0 }, { x: 0, opacity: 1, duration: 0.22, ease: 'power3.out', immediateRender: false }, t + 0.06);
      });
      swap(tl, 'x-e1', 'x-e7', 2.5, 0.05);
      leave(tl, '#x-t', 2.95);
      liftDown(tl, 'x-L', PB, 250, PSL, 2.95, '#x-velo');
      tap(tl, '#x-toque', 282, 795, 250, 3.45);
      // 3 · la imagen real descargada sale del teléfono como póster
      var c0 = { x: PX + 195 * S, y: PY + (540 - 250) * S };
      var P0 = { x: c0.x - 2160 * 0.12 / 2, y: c0.y - 2700 * 0.12 / 2, scale: 0.12 }, P1 = { x: (1080 - 2160 * 0.42) / 2, y: 330, scale: 0.42 };
      gsap.set('#x-poster', P0); tl.set('#x-poster', P0, 0);
      tl.fromTo('#x-poster', Object.assign({ opacity: 0 }, P0), Object.assign({ opacity: 1, duration: 0.55, ease: 'back.out(1.2)', immediateRender: false }, P1), 3.55);
      tl.to('#x-tel', { y: 1500, duration: 0.5, ease: 'power3.in' }, 3.55);
      tl.to('#x-suelo', { backgroundColor: '${GROUND.oro}', duration: 0.45, ease: 'power2.inOut' }, 3.55);
      // 4 · zoom a través del escudo de Leones de Tlalpan: su naranja es el siguiente mundo
      tl.to('#x-poster', { x: 540 - 332 * 24, y: 960 - 1049 * 24, scale: 24, duration: 0.36, ease: 'power3.in' }, 4.12);
      tl.to('#x-fill', { opacity: 1, duration: 0.14, ease: 'none' }, 4.34);
      tl.to({}, { duration: 4.5 - tl.duration() });`;
  return scene("exportar", { states: [r8, ...E], vars: ["t_exp"], css, body, script: s });
}

// ───────────────────────── escena 5 · delegado (20.5–25.5 s) ─────────────────────────
function delegadoScene() {
  const D1 = "09-delegado/mobile/04-mi-equipo", D2 = "09-delegado/mobile/05-analisis-proximo-rival";
  const AB = { x: 40, y: 380, w: 310, h: 278 }, ASL = SLmax(AB);
  const num = [["ganar", 55, "left"], ["empatar", 152, "center"], ["perder", 250, "right"]];
  const bars = [[55, 123], [181, 58], [242, 93]];
  // tapas y contadores dentro de la pieza (px de la app): la frase se escribe y las barras se llenan
  const tapas = `<div class="tapa" id="d-tv" style="left:52px;top:527px;width:290px;height:28px"></div>${num.map(([k, x, al]) => `<div class="tapa" style="left:${x - 2}px;top:594px;width:89px;height:33px"></div><div class="numero ${al}" id="d-n-${k}" style="left:${x}px;top:594px;width:85px;height:33px">0 %</div>`).join("")}${bars.map(([x, w], i) => `<div class="tapa barra" id="d-b${i}" style="left:${x - 1}px;top:635px;width:${w + 2}px;height:12px"></div>`).join("")}`;
  const inner = `${pantalla("d-p1", D1)}${pantalla("d-p2", D2)}`;
  const body = `
    <div class="layer suelo" id="d-suelo" style="background:${GROUND.naranja}"></div>
    ${telefono("d", inner)}
    ${pieza("d-L", AB, ASL, [D2], [tapas])}
    ${titulo("d-t1", "t_del1", "oscuro")}
    ${titulo("d-t2", "t_del2", "oscuro")}`;
  const css = `
#root .numero { position: absolute; color: #fff; font: 700 24px/33px Poppins; letter-spacing: -0.01em; }
#root .numero.left { text-align: left; } #root .numero.center { text-align: center; } #root .numero.right { text-align: right; }
#root .barra, #d-tv { transform-origin: 100% 50%; }
`;
  const s = `
      screen(tl, 'd-p1', 0); screen(tl, 'd-p2', 100);
      show(tl, 'd-p1', 0);
      var AB = ${JSON.stringify(AB)}, ASL = ${ASL};
      liftSetup('d-L', AB, ASL, 1);
      // el teléfono sube sobre el naranja de Leones de Tlalpan
      tl.fromTo('#d-tel', { y: 1500 }, { y: 0, duration: 0.7, ease: 'expo.out' }, 0.05);
      enter(tl, '#d-t1', 0.35, 'blur');
      leave(tl, '#d-t1', 1.9);
      // pestaña de análisis
      push(tl, 'd-p1', 'd-p2', 1.75);
      liftUp(tl, 'd-L', AB, 100, ASL, 2.35, '#d-velo', 880);
      enter(tl, '#d-t2', 2.45, 'pop');
      tl.fromTo('#d-tv', { scaleX: 1 }, { scaleX: 0, duration: 0.6, ease: 'none', immediateRender: false }, 2.85);
      [['ganar', 45], ['empatar', 21], ['perder', 34]].forEach(function (p, i) {
        var o = { v: 0 }, el = document.getElementById('d-n-' + p[0]);
        tl.to(o, { v: p[1], duration: 0.8, ease: 'expo.out', onUpdate: function () { el.textContent = Math.round(o.v) + ' %'; } }, 3.1 + i * 0.14);
        tl.fromTo('#d-b' + i, { scaleX: 1 }, { scaleX: 0, duration: 0.7, ease: 'expo.out', immediateRender: false }, 3.1 + i * 0.14);
      });
      leave(tl, '#d-t2', 4.45);
      liftDown(tl, 'd-L', AB, 100, ASL, 4.3, '#d-velo');
      tl.to('#d-tel', { y: 1500, duration: 0.42, ease: 'power3.in' }, 4.58);
      tl.to('#d-suelo', { backgroundColor: '${GROUND.marino}', duration: 0.4, ease: 'power2.inOut' }, 4.6);
      tl.to({}, { duration: 5.0 - tl.duration() });`;
  return scene("delegado", { states: [D1, D2], vars: ["t_del1", "t_del2"], css, body, script: s });
}

// ───────────────────────── escena 6 · liguilla (25.5–30 s) ─────────────────────────
const CB = { x: 140, y: 262, w: 250, h: 262 }; // escudo + CAMPEÓN + nombre en la pantalla del campeón
function liguillaScene() {
  const LT = "06-liguilla/mobile/01-tabla-final", BR = "06-liguilla/mobile/06-cuadro-completo", CH = "06-liguilla/mobile/07-torneo-con-campeon";
  const CSL = SLmax(CB);
  const alto = state(BR).meta.altoPagina;
  const inner = `${pantalla("l-p1", LT)}${pantalla("l-p2", BR, true)}${pantalla("l-p3", CH)}`;
  const body = `
    <div class="layer suelo" id="l-suelo"></div>
    ${telefono("l", inner)}
    ${pieza("l-L", CB, CSL, [CH])}
    ${titulo("l-t", "t_lig")}
    <div class="toque" id="l-toque"></div>
    <div class="flash" id="l-flash"></div>`;
  const s = `
      screen(tl, 'l-p1', 0); screen(tl, 'l-p2', 0); screen(tl, 'l-p3', 0);
      show(tl, 'l-p1', 0);
      var CB = ${JSON.stringify(CB)}, CSL = ${CSL};
      liftSetup('l-L', CB, CSL, 1);
      tl.fromTo('#l-tel', { y: 1500 }, { y: 0, duration: 0.6, ease: 'expo.out' }, 0);
      enter(tl, '#l-t', 0.35, 'blur');
      // de la tabla final al cuadro: toque en "Cuadro" y recorrido de cuartos a la final
      tap(tl, '#l-toque', 286, 164, 0, 0.8);
      swap(tl, 'l-p1', 'l-p2', 0.88, 0.18);
      scrollTo(tl, 'l-p2', ${Math.max(0, alto - 650)}, 1.25, 1.65);
      leave(tl, '#l-t', 2.9);
      // pausa, y CAMPEÓN: la pantalla del campeón y su escudo saltan al frente sobre el dorado de la liga
      push(tl, 'l-p2', 'l-p3', 3.1);
      tl.set('#l-L-s0', { opacity: 1 }, 0);
      tl.set('#l-L', { opacity: 1 }, 3.5);
      tl.fromTo('#l-L', Object.assign({}, rest(CB, CSL, 880), { scale: 1.35, x: rest(CB, CSL, 880).x - CB.w * CSL * 0.175, y: rest(CB, CSL, 880).y - CB.h * CSL * 0.175 }), Object.assign({ duration: 0.5, ease: 'back.out(1.6)', immediateRender: false }, rest(CB, CSL, 880)), 3.5);
      tl.to('#l-velo', { opacity: 0.6, duration: 0.3 }, 3.5);
      tl.to('#l-tel', { scale: 0.9, duration: 0.5, ease: 'expo.out' }, 3.5);
      tl.to('#l-suelo', { backgroundColor: '${GROUND.oro}', duration: 0.25, ease: 'power2.out' }, 3.5);
      tl.fromTo('#l-flash', { opacity: 0.85 }, { opacity: 0, duration: 0.16, ease: 'power2.out', immediateRender: false }, 3.5);
      shake(tl, '#l-tel', 3.55);
      tl.to({}, { duration: 4.5 - tl.duration() });`;
  return scene("liguilla", { states: [LT, BR, CH], vars: ["t_lig"], css: "", body, script: s });
}

// ───────────────────────── escena 7 · final y cierre (30–36 s) ─────────────────────────
function finalScene() {
  const CH = "06-liguilla/mobile/07-torneo-con-campeon";
  const CSL = SLmax(CB);
  const MARCO = { x: SW - 24 - 548, y: 330, w: 548, h: 600 }; // burbuja con la imagen (px de la pantalla)
  const inner = `
      ${pantalla("f-p3", CH)}
      <div class="scr" id="f-chatw"><div id="f-chat">
        ${chatCab("f", false)}
        <div class="burbuja" id="f-q" style="top:196px"><b style="color:#EF5350">Javier · ASI</b><span>¿Cómo va la tabla?</span></div>
        <div id="f-marco"></div>
        <div class="burbuja" id="f-r1" style="top:${MARCO.y + MARCO.h + 26}px"><b style="color:#BA68C8">Ernesto · RCF</b><span>¡Campeones!</span></div>
        <div class="burbuja" id="f-r2" style="top:${MARCO.y + MARCO.h + 26 + 122}px"><b style="color:#EF5350">Javier · ASI</b><span>Ya la vi en el link</span></div>
        <div id="f-caja" data-layout-ignore><span>Mensaje</span></div>
      </div></div>`;
  const body = `
    <div class="layer suelo" id="f-suelo" style="background:${GROUND.oro}"></div>
    ${telefono("f", inner)}
    ${pieza("f-L", CB, CSL, [CH])}
    <div id="f-reac"><b>❤</b><span>9</span></div>
    ${titulo("f-t", "t_fin")}
    <div class="layer" id="f-end">
      <div id="f-morph"></div>
      <img id="f-logo" src="assets/img/logo_app.png" alt="Bracket App">
      <div id="f-marca">Bracket App</div>
      <div id="f-boton">Empieza gratis</div>
      <div id="f-bio">Link en la bio</div>
    </div>`;
  const mx = PX + MARCO.x, my = PY + MARCO.y;
  const k = +((MARCO.w - 24) / (CB.w * CSL)).toFixed(4);
  const css = CHAT_CSS("f") + `
#f-r1, #f-r2 { opacity: 0; }
#f-marco { position: absolute; left: ${MARCO.x}px; top: ${MARCO.y}px; width: ${MARCO.w}px; height: ${MARCO.h}px; border-radius: 30px 10px 30px 30px; background: #1cb0f6; }
#f-reac { position: absolute; left: ${mx + MARCO.w - 150}px; top: ${my + MARCO.h - 36}px; height: 60px; padding: 0 18px; border-radius: 30px; background: #1E2A30; border: 3px solid #0B1418; display: flex; align-items: center; gap: 10px; z-index: 35; opacity: 0; }
#f-reac b { color: #F87171; font: 700 30px/1 Poppins; } #f-reac span { color: #fff; font: 600 30px/1 Poppins; }
#f-end { z-index: 50; pointer-events: none; }
#f-morph { position: absolute; left: ${mx}px; top: ${my}px; width: ${MARCO.w}px; height: ${MARCO.h}px; background: #1cb0f6; border-radius: 30px; transform-origin: 0 0; opacity: 0; }
#f-logo { position: absolute; left: 390px; top: 500px; width: 300px; height: 300px; opacity: 0; }
#f-marca { position: absolute; left: 0; width: ${W}px; top: 830px; text-align: center; color: #fff; font: 700 104px/1.1 Poppins; letter-spacing: -0.02em; clip-path: inset(0 100% 0 0); }
#f-boton { position: absolute; left: 280px; width: 520px; top: 1000px; height: 124px; border-radius: 30px; background: #0E9AE0; color: #fff; font: 700 54px/124px Poppins; text-align: center; opacity: 0; box-shadow: 0 20px 50px rgba(28, 176, 246, 0.3); }
#f-bio { position: absolute; left: 0; width: ${W}px; top: 1150px; text-align: center; color: #9AA7AE; font: 600 42px/1.2 Poppins; opacity: 0; }
`;
  const s = `
      screen(tl, 'f-p3', 0);
      show(tl, 'f-p3', 0);
      var CB = ${JSON.stringify(CB)}, CSL = ${CSL};
      liftSetup('f-L', CB, CSL, 1);
      tl.set('#f-L-s0', { opacity: 1 }, 0); tl.set('#f-L', Object.assign({ opacity: 1 }, rest(CB, CSL, 880)), 0);
      tl.set('#f-velo', { opacity: 0.6 }, 0); gsap.set('#f-tel', { scale: 0.9 }); tl.set('#f-tel', { scale: 0.9 }, 0);
      tl.to('#f-tel', { scale: 1, duration: 0.5, ease: 'power3.inOut' }, 0.15);
      // el escudo del campeón se envía al chat como imagen (llevar de un mundo a otro)
      push(tl, 'f-p3', 'f-chatw', 0.1);
      tl.to('#f-velo', { opacity: 0, duration: 0.35 }, 0.2);
      tl.to('#f-L', { x: ${mx + 12}, y: ${my + 12}, scale: ${k}, duration: 0.7, ease: 'power3.inOut' }, 0.15);
      tl.to('#f-L', { filter: 'blur(5px)', duration: 0.35, ease: 'power2.in' }, 0.15);
      tl.to('#f-L', { filter: 'blur(0px)', duration: 0.35, ease: 'power2.out' }, 0.5);
      tl.to('#f-suelo', { backgroundColor: '${GROUND.noche}', duration: 0.6, ease: 'power2.inOut' }, 0.3);
      tl.fromTo('#f-r1', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.8)', immediateRender: false }, 0.95);
      tl.fromTo('#f-reac', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.2)', immediateRender: false }, 1.1);
      tl.fromTo('#f-r2', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.8)', immediateRender: false }, 1.2);
      enter(tl, '#f-t', 1.0, 'pop');
      leave(tl, '#f-t', 2.98);
      // cierre: el teléfono baja y la imagen enviada se condensa en el logo
      tl.to('#f-tel', { y: 1500, duration: 0.5, ease: 'power3.in' }, 3.0);
      tl.to('#f-reac', { opacity: 0, duration: 0.15 }, 3.0);
      tl.set('#f-morph', { opacity: 1 }, 3.05);
      tl.to('#f-L', { opacity: 0, duration: 0.14 }, 3.05);
      tl.fromTo('#f-morph', { x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: 30 }, { x: 390 - ${mx}, y: 500 - ${my}, scaleX: 300 / ${MARCO.w}, scaleY: 300 / ${MARCO.h}, borderRadius: 150, duration: 0.4, ease: 'power3.inOut', immediateRender: false }, 3.05);
      tl.fromTo('#f-logo', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.36, ease: 'back.out(1.6)', immediateRender: false }, 3.35);
      tl.to('#f-morph', { opacity: 0, duration: 0.2 }, 3.45);
      tl.fromTo('#f-marca', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.45, ease: 'expo.out', immediateRender: false }, 3.5);
      tl.fromTo('#f-boton', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)', immediateRender: false }, 3.7);
      tl.fromTo('#f-bio', { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, 3.85);
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
// Efectos con causa en pantalla (tiempos globales). Las tomas se alternan.
const SFX = [];
const add = (file, t, dur, vol = 0.6) => SFX.push({ file, t: +t.toFixed(3), dur, vol });
let wk = 0;
const whoosh = (t, vol = 0.3, dur = 0.5) => add(wk++ % 2 ? "whoosh-2.mp3" : "whoosh-1.mp3", t, dur, vol);
// chat
LLEGA.forEach((t, i) => add("notificacion.mp3", t, 0.15, i % 2 ? 0.3 : 0.38));
add("clic.mp3", 6.7, 0.12, 0.9);
whoosh(6.76, 0.45);
// resultado
const R0 = 7.5;
whoosh(R0 + 0.15, 0.22); add("clic.mp3", R0 + 0.85, 0.12, 0.8); whoosh(R0 + 0.95, 0.25); whoosh(R0 + 1.4, 0.32);
add("clic-2.mp3", R0 + 1.95, 0.3, 0.55); add("clic-2.mp3", R0 + 2.4, 0.3, 0.55);
whoosh(R0 + 2.8, 0.22); add("clic-2.mp3", R0 + 3.42, 0.3, 0.8); whoosh(R0 + 3.52, 0.28); whoosh(R0 + 3.95, 0.3);
whoosh(R0 + 4.45, 0.3); add("clic.mp3", R0 + 5.0, 0.12, 0.7);
// reglas
const G0 = 13;
whoosh(G0 + 0.0, 0.22); whoosh(G0 + 0.35, 0.22); add("clic.mp3", G0 + 1.3, 0.12, 0.75); add("clic.mp3", G0 + 2.2, 0.12, 0.75);
// exportar
const X0 = 16;
whoosh(X0 + 0.0, 0.22); whoosh(X0 + 0.5, 0.32);
[1.05, 1.32, 1.59, 1.86, 2.13, 2.42].forEach((t) => whoosh(X0 + t, 0.2, 0.3));
whoosh(X0 + 2.95, 0.22); add("clic.mp3", X0 + 3.45, 0.12, 0.8);
add("impacto.mp3", X0 + 3.6, 1.0, 0.45); whoosh(X0 + 4.12, 0.5);
// delegado
const D0 = 20.5;
whoosh(D0 + 0.05, 0.32); whoosh(D0 + 1.75, 0.22); whoosh(D0 + 2.35, 0.32);
[0, 0.14, 0.28].forEach((d) => add("clic.mp3", D0 + 3.1 + d, 0.12, 0.35));
whoosh(D0 + 4.3, 0.22); whoosh(D0 + 4.58, 0.3);
// liguilla
const L0 = 25.5;
whoosh(L0 + 0.0, 0.3); add("clic.mp3", L0 + 0.8, 0.12, 0.8); whoosh(L0 + 1.25, 0.18, 0.6); whoosh(L0 + 3.1, 0.25);
add("impacto.mp3", L0 + 3.5, 2.0, 0.95);
// final
const F0 = 30;
whoosh(F0 + 0.1, 0.28); whoosh(F0 + 0.2, 0.3);
add("notificacion.mp3", F0 + 0.95, 0.3, 0.38); add("notificacion.mp3", F0 + 1.2, 0.3, 0.3);
whoosh(F0 + 3.0, 0.35); add("impacto.mp3", F0 + 3.35, 1.4, 0.4);


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
