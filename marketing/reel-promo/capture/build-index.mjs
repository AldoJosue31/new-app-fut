// Genera capturas/manifest.json y capturas/INDICE.md a partir de los .json de cada estado.
import fs from "node:fs";
import path from "node:path";
import { OUT } from "./snapshot.mjs";

const BLOQUES = {
  "01-reglas": "Tu liga, tus reglas",
  "02-equipos": "Equipos y jugadores",
  "03-calendario": "Torneo y calendario",
  "04-resultado": "Resultado que mueve la tabla",
  "05-tabla": "Tabla y goleadores en tiempo real",
  "06-liguilla": "Liga → liguilla",
  "07-exportar": "Exportar en imagen",
  "08-publico": "Enlace público",
  "09-delegado": "Cuentas de delegado",
};

const manifest = [];
for (const bloque of Object.keys(BLOQUES)) {
  for (const dev of ["desktop", "mobile"]) {
    const dir = path.join(OUT, bloque, dev);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      const base = `${bloque}/${dev}/${meta.estado}`;
      manifest.push({
        bloque, titulo: BLOQUES[bloque], dispositivo: dev, estado: meta.estado, ruta: meta.ruta,
        viewport: meta.viewport, html: `${base}.html`, css: `${base}.css`, png: `${base}.png`,
        completa: fs.existsSync(path.join(dir, `${meta.estado}.completa.png`)) ? `${base}.completa.png` : null,
        objetivos: meta.objetivos,
      });
    }
    const dl = path.join(dir, "descargas");
    if (fs.existsSync(dl)) for (const f of fs.readdirSync(dl)) manifest.push({ bloque, titulo: BLOQUES[bloque], dispositivo: dev, estado: `descarga:${f}`, png: `${bloque}/${dev}/descargas/${f}` });
  }
}
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

let md = `# Capturas de Bracket App para el reel

Pantallas reales de la app (no maquetas), con datos ficticios, tema oscuro, en escritorio (1440×900) y móvil (390×844).
Generadas por \`marketing/reel-promo/capture/\` el ${new Date().toISOString().slice(0, 10)}.

## Qué hay por cada estado

| Archivo | Para qué sirve en HyperFrames |
| --- | --- |
| \`<estado>.html\` | El DOM real congelado dentro de un marco \`.bk-desktop\` / \`.bk-mobile\`. Se abre solo en el navegador y se pega en una escena: el CSS ya está limitado al marco, las media queries resueltas y vw/vh en px. Es texto y vectores: se puede ampliar sin perder nitidez y animar fila por fila. |
| \`<estado>.css\` | El mismo CSS, aparte. |
| \`<estado>.png\` | Placa de referencia a resolución del dispositivo (2× escritorio, 3× móvil). |
| \`<estado>.completa.png\` | Página completa cuando la pantalla tiene scroll (para recorridos verticales). |
| \`<estado>.json\` | Ruta, viewport y cajas (x, y, w, h, centro, texto) de los elementos clave: destino del cursor, del acercamiento o del resaltado. |
| \`piezas/<estado>--<objetivo>.png\` | Recorte de cada elemento clave. |
| \`descargas/*.png\` | Las imágenes que la app exporta de verdad (tabla, goleadores, rol). |

Convertir un estado en escena: \`node marketing/reel-promo/capture/to-hyperframes.mjs <proyecto-hf> <bloque/dispositivo/estado> <id-escena> [objetivo] [segundos]\`.

`;
for (const [bloque, titulo] of Object.entries(BLOQUES)) {
  md += `## ${bloque} · ${titulo}\n\n| Estado | Escritorio | Móvil | Objetivos |\n| --- | --- | --- | --- |\n`;
  const estados = [...new Set(manifest.filter((m) => m.bloque === bloque && !m.estado.startsWith("descarga")).map((m) => m.estado))];
  for (const e of estados) {
    const d = manifest.find((m) => m.bloque === bloque && m.estado === e && m.dispositivo === "desktop");
    const mo = manifest.find((m) => m.bloque === bloque && m.estado === e && m.dispositivo === "mobile");
    const objs = [...new Set([...Object.keys(d?.objetivos || {}), ...Object.keys(mo?.objetivos || {})])].join(", ");
    md += `| ${e} | ${d ? `[html](${d.html}) · [png](${d.png})` : "—"} | ${mo ? `[html](${mo.html}) · [png](${mo.png})` : "—"} | ${objs || "—"} |\n`;
  }
  const dls = manifest.filter((m) => m.bloque === bloque && m.estado.startsWith("descarga"));
  if (dls.length) md += `\nImágenes exportadas por la app: ${dls.map((x) => `[${x.estado.slice(9)}](${x.png})`).join(" · ")}\n`;
  md += "\n";
}
fs.writeFileSync(path.join(OUT, "INDICE.md"), md);
console.log(`manifest: ${manifest.length} entradas`);
