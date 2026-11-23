// Guarda un estado de pantalla en tres formas:
//   <estado>.png          imagen de referencia (resolución del dispositivo)
//   <estado>.html         DOM real congelado, con CSS y recursos locales (animable en HyperFrames)
//   <estado>.json         viewport, URL y cajas de los elementos clave (para cursor, zoom, recortes)
//   piezas/<estado>--<objetivo>.png   recorte de cada elemento clave
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const OUT = path.resolve("marketing/reel-promo/capturas");
const ASSETS = path.join(OUT, "_assets");
fs.mkdirSync(ASSETS, { recursive: true });

// Textos con codificación rota en la app (se corrigen solo en la captura).
const TEXT_FIXES = [["Ã­", "í"], ["Ã³", "ó"], ["Ã¡", "á"], ["Ã©", "é"], ["Ãº", "ú"], ["Ã±", "ñ"], ["Â°", "°"]];

const downloaded = new Map();
const saveAsset = async (page, absUrl) => {
  if (downloaded.has(absUrl)) return downloaded.get(absUrl);
  let rel = null;
  try {
    if (absUrl.startsWith("data:")) return absUrl;
    const res = await page.request.get(absUrl);
    if (res.ok()) {
      const buf = await res.body();
      const type = res.headers()["content-type"] || "";
      const ext = (path.extname(new URL(absUrl).pathname).slice(1) || type.split("/")[1]?.split(/[;+]/)[0] || "bin").toLowerCase();
      const name = crypto.createHash("sha1").update(absUrl).digest("hex").slice(0, 12) + "." + ext;
      fs.writeFileSync(path.join(ASSETS, name), buf);
      rel = name;
    }
  } catch {}
  downloaded.set(absUrl, rel);
  return rel;
};

export const fixPageText = (page) => page.evaluate((fixes) => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    let t = n.nodeValue; let changed = false;
    for (const [a, b] of fixes) if (t.includes(a)) { t = t.split(a).join(b); changed = true; }
    if (changed) n.nodeValue = t;
  }
  document.querySelectorAll("input,textarea").forEach((el) => {
    for (const [a, b] of fixes) if (el.placeholder?.includes(a)) el.placeholder = el.placeholder.split(a).join(b);
  });
}, TEXT_FIXES);

// Serializa el DOM como un "marco" autocontenido: el CSS de la app queda limitado a
// .bk-<dispositivo>, las media queries se resuelven al tamaño de la captura y vw/vh pasan a px.
// Así el mismo HTML se ve igual suelto o pegado en una escena de HyperFrames de cualquier tamaño.
const serialize = (page, scope, prefix) => page.evaluate(({ scope, prefix }) => {
  const VW = innerWidth, VH = innerHeight;
  const abs = (u, base) => { try { return new URL(u, base).href; } catch { return u; } };
  const urls = new Set();
  const fixUrls = (css, base) => css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
    if (u.startsWith("data:")) return m;
    if (u.startsWith("#")) return `url("#${prefix}${u.slice(1)}")`;
    const a = abs(u, base); urls.add(a); return `url("${a}")`;
  });
  const fixUnits = (t) => t.replace(/(-?\d*\.?\d+)[dsl]?v(w|h|min|max)\b/g, (m, n, u) => {
    const v = u === "w" ? VW : u === "h" ? VH : u === "min" ? Math.min(VW, VH) : Math.max(VW, VH);
    return `${+(parseFloat(n) * v / 100).toFixed(2)}px`;
  });
  const S = `.${scope}`;
  const splitSel = (sel) => {
    const out = []; let d = 0, cur = "";
    for (const ch of sel) {
      if (ch === "(" || ch === "[") d++;
      if (ch === ")" || ch === "]") d--;
      if (ch === "," && !d) { out.push(cur); cur = ""; } else cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim()).filter(Boolean);
  };
  const rootRe = /^(?::root|html)((?:\[[^\]]*\]|\.[\w-]+|:not\([^)]*\))*)\s*/;
  const bodyRe = /^body((?:\[[^\]]*\]|\.[\w-]+|:not\([^)]*\))*)/;
  const scopeSel = (sel) => splitSel(sel).flatMap((one) => {
    const m = one.match(rootRe);
    if (m) {
      let rest = one.slice(m[0].length);
      const bm = rest.match(bodyRe);
      if (bm) rest = (bm[1] || "") + rest.slice(bm[0].length);
      rest = rest.trim();
      const head = `${S}${m[1] || ""}`;
      if (!rest) return [head];
      return [/^[.[:]/.test(rest) && !/^:(?:is|where|not|has)\(/.test(rest) ? `${head}${rest}` : `${head} ${rest}`];
    }
    const bm = one.match(bodyRe);
    if (bm) return [`${S}${bm[1] || ""}${one.slice(bm[0].length)}`];
    if (/^::?[\w-]/.test(one) && !/^:(?:is|where|not|has)\(/.test(one)) return [`${S} ${one}`, `${S}${one}`];
    if (/^[.[]/.test(one)) return [`${S} ${one}`, `${S}${one}`];
    return [`${S} ${one}`];
  }).join(",");
  const walk = (rules, base) => {
    let out = "";
    for (const r of rules) {
      if (r instanceof CSSStyleRule) out += `${scopeSel(r.selectorText)}{${fixUnits(fixUrls(r.style.cssText, base))}}\n`;
      else if (r instanceof CSSMediaRule) { if (matchMedia(r.media.mediaText).matches) out += walk(r.cssRules, base); }
      else if (r instanceof CSSSupportsRule) out += `@supports ${r.conditionText}{${walk(r.cssRules, base)}}\n`;
      else if (r instanceof CSSImportRule) { try { if (!r.media.mediaText || matchMedia(r.media.mediaText).matches) out += walk(r.styleSheet.cssRules, r.styleSheet.href || base); } catch {} }
      else if (r instanceof CSSKeyframesRule) out += fixUnits(r.cssText) + "\n";
      else if (r instanceof CSSFontFaceRule) { if (!/__nextjs/.test(r.cssText)) out += fixUrls(r.cssText, base) + "\n"; }
      // @container, @layer, @scope…: se conserva el envoltorio (el navegador los evalúa igual que en la app;
      // desenvolver @layer cambiaría la prioridad del CSS).
      else if (r.cssRules) out += `${r.cssText.slice(0, r.cssText.indexOf("{")).trim()}{${walk(r.cssRules, base)}}\n`;
      // @layer a, b; @property …: se copian tal cual.
      else out += r.cssText + "\n";
    }
    return out;
  };
  let css = "";
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.ownerNode?.closest?.("nextjs-portal")) continue;
      if (sheet.media?.mediaText && !matchMedia(sheet.media.mediaText).matches) continue;
      css += walk(sheet.cssRules, sheet.href || location.href);
    } catch {}
  }
  // Valores de formularios -> atributos
  document.querySelectorAll("input").forEach((el) => {
    el.setAttribute("value", el.value);
    if (el.checked) el.setAttribute("checked", ""); else el.removeAttribute("checked");
  });
  document.querySelectorAll("textarea").forEach((el) => { el.textContent = el.value; });
  document.querySelectorAll("select").forEach((el) => [...el.options].forEach((o) => { if (o.selected) o.setAttribute("selected", ""); else o.removeAttribute("selected"); }));
  // Scroll interno de contenedores -> atributo
  document.querySelectorAll("body *").forEach((el) => { if (el.scrollTop || el.scrollLeft) el.setAttribute("data-bk-scroll", `${el.scrollTop},${el.scrollLeft}`); });
  const canvasMap = [];
  document.querySelectorAll("canvas").forEach((c, i) => { try { c.setAttribute("data-bk-canvas", i); canvasMap.push(c.toDataURL("image/png")); } catch { canvasMap.push(null); } });

  // Elementos sticky: se congelan en su posición visual (en el marco no hay scroll real que los pegue).
  document.querySelectorAll("body *").forEach((el) => {
    if (getComputedStyle(el).position !== "sticky") return;
    const r1 = el.getBoundingClientRect();
    const prev = el.getAttribute("style");
    for (const [k, v] of [["position", "relative"], ["top", "0px"], ["left", "0px"], ["bottom", "auto"], ["right", "auto"]]) el.style.setProperty(k, v, "important");
    const r0 = el.getBoundingClientRect();
    if (prev === null) el.removeAttribute("style"); else el.setAttribute("style", prev);
    el.setAttribute("data-bk-sticky", `${(r1.left - r0.left).toFixed(2)},${(r1.top - r0.top).toFixed(2)}`);
  });

  const body = document.body.cloneNode(true);
  document.querySelectorAll("[data-bk-scroll]").forEach((el) => el.removeAttribute("data-bk-scroll"));
  document.querySelectorAll("[data-bk-canvas]").forEach((el) => el.removeAttribute("data-bk-canvas"));
  document.querySelectorAll("[data-bk-sticky]").forEach((el) => el.removeAttribute("data-bk-sticky"));
  body.querySelectorAll("[data-bk-sticky]").forEach((el) => {
    const [dx, dy] = el.getAttribute("data-bk-sticky").split(",");
    el.setAttribute("style", `${el.getAttribute("style") || ""};position:relative !important;top:${dy}px !important;left:${dx}px !important;bottom:auto !important;right:auto !important`);
    el.removeAttribute("data-bk-sticky");
  });
  body.querySelectorAll("script, nextjs-portal, link, style, noscript, iframe, template").forEach((n) => n.remove());
  body.querySelectorAll("[data-bk-canvas]").forEach((c) => {
    const src = canvasMap[Number(c.getAttribute("data-bk-canvas"))];
    if (!src) return;
    const img = document.createElement("img");
    img.src = src; img.setAttribute("style", c.getAttribute("style") || ""); img.width = c.width; img.height = c.height; img.className = c.className;
    c.replaceWith(img);
  });
  body.querySelectorAll("img").forEach((img) => {
    const s = img.getAttribute("src");
    if (s && !s.startsWith("data:")) { const a = abs(s, location.href); urls.add(a); img.setAttribute("src", a); }
    img.removeAttribute("srcset"); img.removeAttribute("loading");
  });
  body.querySelectorAll("image").forEach((img) => {
    const s = img.getAttribute("href") || img.getAttribute("xlink:href");
    if (s && !s.startsWith("data:")) { const a = abs(s, location.href); urls.add(a); img.setAttribute("href", a); }
  });
  // ids únicos por estado (HyperFrames exige ids únicos en la página armada)
  const refAttrs = ["href", "xlink:href", "fill", "stroke", "clip-path", "mask", "filter", "marker-start", "marker-end"];
  body.querySelectorAll("[id]").forEach((el) => el.setAttribute("id", prefix + el.id));
  body.querySelectorAll("*").forEach((el) => {
    for (const a of refAttrs) {
      const v = el.getAttribute(a);
      if (!v || !v.includes("#") || /^https?:/.test(v)) continue;
      // Solo url(#id) en fill/stroke/... y #id en href: los colores #rrggbb se dejan intactos.
      let nv = v.replace(/url\(\s*['"]?#([^'")]+)['"]?\s*\)/g, `url(#${prefix}$1)`);
      if (a === "href" || a === "xlink:href") nv = nv.replace(/^#(.+)$/, `#${prefix}$1`);
      el.setAttribute(a, nv);
    }
    for (const a of ["for", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "list"]) {
      const v = el.getAttribute(a);
      if (v) el.setAttribute(a, v.split(/\s+/).map((x) => prefix + x).join(" "));
    }
    const st = el.getAttribute("style");
    if (st) el.setAttribute("style", fixUnits(fixUrls(st, location.href)));
  });
  const htmlEl = document.documentElement;
  const attrs = (el, skip = []) => [...el.attributes].filter((a) => !skip.includes(a.name)).map((a) => [a.name, a.value]);
  return {
    css, urls: [...urls], scrollY: window.scrollY + document.body.scrollTop, scrollX: window.scrollX + document.body.scrollLeft, w: VW, h: VH,
    bodyHeight: Math.max(document.body.scrollHeight, VH),
    htmlAttrs: attrs(htmlEl, ["lang", "style"]), htmlClass: htmlEl.className,
    bodyClass: document.body.className, bodyStyle: document.body.getAttribute("style") || "",
    inner: body.innerHTML,
  };
}, { scope, prefix });

const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * @param page      página de Playwright
 * @param dir       carpeta destino (relativa a capturas/)
 * @param state     nombre del estado
 * @param targets   { nombre: selector | Locator } elementos clave
 */
export const snapshot = async (page, dir, state, targets = {}, { note = "" } = {}) => {
  const folder = path.join(OUT, dir);
  fs.mkdirSync(path.join(folder, "piezas"), { recursive: true });
  await fixPageText(page);
  // Aparta el puntero para que no quede ningún hover activo.
  const vpNow = page.viewportSize();
  await page.mouse.move(vpNow.width - 3, vpNow.height - 3).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  // Espera a que el diseño deje de moverse (cargas tardías, avisos, animaciones de entrada).
  let last = "";
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const sig = await page.evaluate(() => {
      const els = [...document.querySelectorAll("body *")].slice(0, 1500);
      return document.documentElement.scrollHeight + ":" + els.map((e) => { const r = e.getBoundingClientRect(); return `${r.top | 0},${r.height | 0}`; }).join(";");
    });
    if (sig === last) break;
    last = sig;
  }
  await page.screenshot({ path: path.join(folder, `${state}.png`) });

  const boxes = {};
  for (const [name, sel] of Object.entries(targets)) {
    const loc = typeof sel === "string" ? page.locator(sel).first() : sel.first();
    try {
      const box = await loc.boundingBox({ timeout: 1500 });
      if (!box) continue;
      const text = (await loc.innerText({ timeout: 800 }).catch(() => "")).trim().slice(0, 160);
      boxes[name] = { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height), cx: Math.round(box.x + box.width / 2), cy: Math.round(box.y + box.height / 2), text };
      // Recorte de la parte visible, sin desplazar la página (un scroll cambiaría el estado capturado).
      const x = Math.max(0, box.x), y = Math.max(0, box.y);
      const w = Math.min(vpNow.width, box.x + box.width) - x, h = Math.min(vpNow.height, box.y + box.height) - y;
      if (w > 4 && h > 4) await page.screenshot({ path: path.join(folder, "piezas", `${state}--${name}.png`), clip: { x, y, width: w, height: h } }).catch(() => {});
    } catch {}
  }

  const vp = page.viewportSize();
  const device = vp.width < 600 ? "mobile" : "desktop";
  const scope = `bk-${device}`;
  const prefix = `bk-${dir.split("/")[0]}-${state}-`.replace(/[^\w-]/g, "");
  const snap = await serialize(page, scope, prefix);
  const map = {};
  for (const u of snap.urls) {
    const rel = await saveAsset(page, u);
    if (rel) map[u] = path.relative(folder, path.join(ASSETS, rel)).split(path.sep).join("/");
  }
  const swap = (s) => s.replace(/https?:\/\/127\.0\.0\.1:(?:4180|54399)[^"')\s]*/g, (u) => map[u] || u);
  const extraAttrs = snap.htmlAttrs.filter(([n]) => n !== "class").map(([n, v]) => ` ${n}="${esc(v)}"`).join("");
  const frame = `<div class="bk-frame ${scope} ${esc(snap.htmlClass)} ${esc(snap.bodyClass)}"${extraAttrs} data-captura="${dir}/${state}" style="position:relative;width:${vp.width}px;height:${vp.height}px;overflow:hidden;contain:layout paint;">
<div class="bk-body" style="position:absolute;left:${-snap.scrollX}px;top:${-snap.scrollY}px;width:${vp.width}px;min-height:${snap.bodyHeight}px;${esc(snap.bodyStyle)}">${swap(snap.inner)}</div>
</div>`;
  const css = swap(snap.css);
  fs.writeFileSync(path.join(folder, `${state}.css`), css);
  const restore = `<script data-captura="scroll">document.querySelectorAll('[data-captura="${dir}/${state}"] [data-bk-scroll]').forEach(function(e){var v=e.getAttribute('data-bk-scroll').split(',');e.scrollTop=+v[0];e.scrollLeft=+v[1];});</script>`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=${vp.width}">
<title>${dir}/${state} · Bracket App (datos ficticios)</title>
<!-- Marco de captura: todo el CSS de la app va limitado a .${scope}. ${note} -->
<style data-captura="app">${css}</style>
<style data-captura="pagina">html,body{margin:0;padding:0;background:#000}</style>
</head><body>
${frame}
${restore}
</body></html>`;
  fs.writeFileSync(path.join(folder, `${state}.html`), html);
  fs.writeFileSync(path.join(folder, `${state}.json`), JSON.stringify({ estado: state, dispositivo: device, ruta: new URL(page.url()).pathname, viewport: vp, scrollY: snap.scrollY, scrollX: snap.scrollX, marco: `.${scope}`, prefijoIds: prefix, altoPagina: snap.bodyHeight, nota: note, objetivos: boxes }, null, 2));
  // Página completa cuando hay scroll (para recorridos verticales). Va al final: redimensiona la
  // página un instante y la app podría reacomodarse.
  const tall = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight * 1.15);
  if (tall) {
    const keep = await page.evaluate(() => [scrollX, scrollY]);
    await page.screenshot({ path: path.join(folder, `${state}.completa.png`), fullPage: true }).catch(() => {});
    await page.evaluate(([x, y]) => window.scrollTo(x, y), keep);
    await page.waitForTimeout(300);
  }
  console.log(`  ✓ ${dir}/${state} (${Object.keys(boxes).length} objetivos)`);
  return boxes;
};
