// Convierte un estado capturado en una escena de HyperFrames.
// Uso: node to-hyperframes.mjs <proyecto-hf> <bloque/dispositivo/estado> <id-escena> [objetivo] [duración]
//   - Copia fuentes a assets/fonts/ y el resto de recursos a assets/capturas/.
//   - Deja el CSS de la captura dentro del <template> (ya viene limitado a .bk-desktop / .bk-mobile).
//   - La captura se escala para llenar el ancho del lienzo; si se da [objetivo] (nombre del JSON),
//     la cámara hace un acercamiento a ese elemento.
import fs from "node:fs";
import path from "node:path";
import { OUT } from "./snapshot.mjs";

const [, , project, statePath, sceneId, target, durArg] = process.argv;
const dur = Number(durArg || 4);
const proj = path.resolve(project);
const base = path.join(OUT, statePath);
const meta = JSON.parse(fs.readFileSync(`${base}.json`, "utf8"));
const html = fs.readFileSync(`${base}.html`, "utf8");
const css = html.match(/<style data-captura="app">([\s\S]*?)<\/style>/)[1];
const frame = html.match(/(<div class="bk-frame[\s\S]*<\/div>)\s*<script data-captura="scroll">/)[1];

// Recursos: ../../_assets/<archivo> -> assets/fonts|capturas/<archivo>
const used = new Set();
const relocate = (s) => s.replace(/(?:\.\.\/)+_assets\/([\w.-]+)/g, (m, f) => {
  used.add(f);
  return /\.(woff2?|ttf|otf)$/i.test(f) ? `assets/fonts/${f}` : `assets/capturas/${f}`;
});
// La captura es un estado congelado: fuera transiciones y animaciones CSS (no son deterministas al renderizar).
const sceneCss = relocate(css)
  .replace(/(?<=[;{]|^)\s*(?:-webkit-)?(?:transition|animation)(?:-[\w-]+)?\s*:[^;}]*;?/g, "")
  // fuentes de emoji/sistema sin archivo: el renderizador no las tiene
  .replace(/,\s*(?:"Apple Color Emoji"|"Segoe UI Emoji"|"Segoe UI Symbol"|"Noto Color Emoji"|SFMono-Regular)/g, "");
const sceneFrame = relocate(frame).replace('<div class="bk-frame', '<div data-layout-allow-overflow data-layout-ignore class="bk-frame');
for (const f of used) {
  const dest = path.join(proj, /\.(woff2?|ttf|otf)$/i.test(f) ? "assets/fonts" : "assets/capturas", f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(OUT, "_assets", f), dest);
}

const index = JSON.parse(fs.readFileSync(path.join(proj, "hyperframes.json"), "utf8").replace(/^﻿/, ""));
const W = 1080, H = 1920; // lienzo vertical del reel
const vp = meta.viewport;
// Cámara sobre el lienzo completo: la captura (coordenadas en px de la app) se escala y se
// desplaza con transform-origin 0 0. Plano general: cabe al 90 % del ancho, centrada.
const fit = (W * 0.9) / vp.width;
const s0 = fit, x0 = (W - vp.width * s0) / 2, y0 = (H - vp.height * s0) / 2;
const t = target && meta.objetivos[target];
// Acercamiento: el objetivo ocupa ~80 % del ancho y la captura llena el lienzo (sin vacío en los bordes).
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const s1 = t ? Math.max(Math.min(fit * 2.4, (W * 0.8) / Math.min(t.w, vp.width)), H / vp.height, W / vp.width, fit * 1.25) : s0;
const x1 = t ? clamp(W / 2 - t.cx * s1, W - vp.width * s1, 0) : x0;
const y1 = t ? clamp(H / 2 - t.cy * s1, H - vp.height * s1, 0) : y0;
const zoom = s1 / s0;
const glow = t ? { x: Math.max(4, t.x - 6), y: t.y - 6, w: Math.min(t.w + 12, vp.width - Math.max(4, t.x - 6) - 4), h: t.h + 12 } : null;

const scene = `<!-- Escena generada desde capturas/${statePath} (${meta.dispositivo}, ${vp.width}×${vp.height}) -->
<template>
  <style>
    #root { position: absolute; inset: 0; overflow: hidden; background: #0b1418; }
    #${sceneId}-stage { position: absolute; inset: 0; overflow: hidden; }
    #${sceneId}-cam { position: absolute; left: 0; top: 0; width: ${vp.width}px; height: ${vp.height}px; transform-origin: 0 0; }
    #${sceneId}-glow { position: absolute; border-radius: 14px; box-shadow: 0 0 0 3px #1cb0f6, 0 0 40px rgba(28,176,246,.55); opacity: 0; pointer-events: none; }
${sceneCss}
  </style>
  <div id="root" data-composition-id="${sceneId}" data-width="${W}" data-height="${H}">
    <div id="${sceneId}-stage">
      <div id="${sceneId}-cam">
        ${sceneFrame}
        ${t ? `<div id="${sceneId}-glow" style="left:${glow.x}px;top:${glow.y}px;width:${glow.w}px;height:${glow.h}px"></div>` : ""}
      </div>
    </div>
  </div>
  <script>
    (function () {
      document.querySelectorAll('#root [data-captura] [data-bk-scroll]').forEach(function (e) { var v = e.getAttribute('data-bk-scroll').split(','); e.scrollTop = +v[0]; e.scrollLeft = +v[1]; });
      var tl = gsap.timeline({ paused: true });
      var cam = "#${sceneId}-cam";
      tl.fromTo(cam, { x: ${(x0 + vp.width * s0 * 0.02).toFixed(1)}, y: ${(y0 + vp.height * s0 * 0.02).toFixed(1)}, scale: ${(s0 * 0.96).toFixed(4)} }, { x: ${x0.toFixed(1)}, y: ${y0.toFixed(1)}, scale: ${s0.toFixed(4)}, duration: 0.5, ease: "power3.out" }, 0);
      ${t ? `// acercamiento a "${target}"
      tl.fromTo(cam, { x: ${x0.toFixed(1)}, y: ${y0.toFixed(1)}, scale: ${s0.toFixed(4)} }, { x: ${x1.toFixed(1)}, y: ${y1.toFixed(1)}, scale: ${s1.toFixed(4)}, duration: 0.55, ease: "power2.inOut", immediateRender: false }, 1.1);
      tl.fromTo("#${sceneId}-glow", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.6);` : ""}
      tl.to({}, { duration: ${dur} - tl.duration() });
      window.__timelines["${sceneId}"] = tl;
    })();
  </script>
</template>
`;
fs.mkdirSync(path.join(proj, "compositions"), { recursive: true });
fs.writeFileSync(path.join(proj, "compositions", `${sceneId}.html`), scene);
console.log(`escena compositions/${sceneId}.html · ${used.size} recursos · escala ${fit.toFixed(2)}${t ? ` · zoom ${zoom.toFixed(2)} a ${target}` : ""}`);
