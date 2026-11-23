// Recorre la app real y guarda cada estado de cada toma (escritorio y móvil).
// Uso: node shots.mjs [id-de-toma ...] [--device=desktop|mobile]
import fs from "node:fs";
import path from "node:path";
import { launch, openContext, watch, settle, setScenario, APP, MOCK } from "./browser.mjs";
import { snapshot, OUT } from "./snapshot.mjs";
import { MANAGER, DELEGATE } from "./seed.mjs";

const T = "/division/94/torneos/123";
const J8 = 4508;

const go = async (page, route, ms = 1800) => {
  await page.goto(APP + route, { waitUntil: "domcontentloaded", timeout: 120000 });
  await settle(page, ms);
};
// Botón por nombre accesible, aria-label o title (en escritorio varios botones muestran un texto corto).
const btn = (page, name, exact = true) => page.getByRole("button", { name, exact })
  .or(page.locator(`button[aria-label="${name}"], button[title="${name}"]`)).first();
const tab = (page, name) => page.getByRole("tab", { name, exact: true }).first();
const click = async (loc, ms = 900) => { await loc.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {}); await loc.click({ timeout: 8000 }); await settle(loc.page(), ms); };
const scrollTo = async (loc, ms = 600) => { await loc.evaluate((el) => el.scrollIntoView({ block: "start" })); await loc.page().waitForTimeout(ms); };
const jornadaSelect = (page) => page.getByRole("combobox", { name: "Seleccionar jornada" }).first();
const dialog = (page) => page.locator("[class*=ModalContainer], [role=dialog], [aria-modal=true]").last();

// Ejecuta un paso; si falla, lo anota y sigue con el resto de la toma.
const fails = [];
let currentPage = null;
const step = async (label, fn) => {
  try { await fn(); } catch (e) {
    fails.push(`${label}: ${String(e.message).split("\n")[0]}`);
    console.log(`  ✗ ${label}: ${String(e.message).split("\n")[0]}`);
    if (currentPage) await currentPage.screenshot({ path: `marketing/reel-promo/capture/out/fail-${label}.png` }).catch(() => {});
  }
};

const download = async (page, trigger, file) => {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), trigger()]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await dl.saveAs(file);
  console.log(`  ⬇ ${path.relative(OUT, file)}`);
};

// Suma goles con la flecha del contador en la fila del jugador (modal de resultado).
const addGoal = async (page, playerStart, times = 1) => { for (let i = 0; i < times; i++) { await addOneGoal(page, playerStart); await page.waitForTimeout(450); } };
const addOneGoal = (page, playerStart, times = 1) => page.evaluate(({ playerStart, times }) => {
  const input = [...document.querySelectorAll("input")].find((i) => i.value.startsWith(playerStart));
  if (!input) throw new Error("jugador no encontrado " + playerStart);
  let row = input.parentElement;
  while (row && !row.querySelector(".stat-chip")) row = row.parentElement;
  if (!row) throw new Error("fila no encontrada " + playerStart);
  const counter = [...row.querySelectorAll("input")].find((i) => /^\d+$/.test(i.value));
  const up = [...counter.parentElement.querySelectorAll("button")][0];
  for (let i = 0; i < times; i++) up.click();
}, { playerStart, times });

// Agrega un jugador en el primer espacio vacío de la plantilla del partido.
const addPlayer = async (page, name) => {
  const empty = page.locator('input[type="text"]').filter({ hasNot: page.locator("xpath=self::*[@value!='']") });
  const slot = page.locator('input[type="text"]').and(page.locator(':not([value]), [value=""]')).first();
  await slot.scrollIntoViewIfNeeded();
  await slot.click();
  await slot.pressSequentially(name.split(" ").slice(0, 2).join(" "), { delay: 40 });
  await page.waitForTimeout(700);
  await page.getByText(name, { exact: false }).last().click();
  await page.waitForTimeout(500);
};

// Escribe resultados de una fase de liguilla directamente en el servidor falso.
const fillPhase = async (scores) => {
  const matches = await (await fetch(`${MOCK}/__db?table=matches`)).json();
  const pending = matches.filter((m) => m.observations?.startsWith("Fase:") && m.goals1 == null).sort((a, b) => a.id - b.id);
  for (const [i, m] of pending.entries()) {
    const [g1, g2] = scores[i % scores.length];
    await fetch(`${MOCK}/rest/v1/rpc/save_match_result_atomic`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ p_match_id: m.id, p_updates: { goals1: g1, goals2: g2, status: "Finalizado", puntos1: g1 > g2 ? 3 : g1 === g2 ? 1 : 0, puntos2: g2 > g1 ? 3 : g1 === g2 ? 1 : 0 } }) });
  }
  const jIds = [...new Set(pending.map((m) => m.jornada_id))];
  if (jIds.length) await fetch(`${MOCK}/rest/v1/jornadas?id=in.(${jIds.join(",")})`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Finalizada" }) });
  return pending.length;
};


// Guarda en el servidor falso el resultado del bloque 4 (Real Cuauhtémoc FC 1–2 Atlético San Isidro),
// para que las exportaciones muestren la tabla después del gol, como en el reel.
const saveJ8Result = async () => {
  const [matches, players] = await Promise.all(["matches", "players"].map(async (t) => (await fetch(`${MOCK}/__db?table=${t}`)).json()));
  const m = matches.find((x) => x.jornada_id === J8 && x.team1_id === 103 && x.team2_id === 101);
  if (!m) throw new Error("No está el partido RCF–ASI de la jornada 8");
  const who = (name) => players.find((p) => `${p.first_name} ${p.last_name}` === name)?.id;
  const goal = (name) => ({ player_id: who(name), event_type: "goal" });
  const events = [goal("Diego Herrera Aguilar"), goal("Luis Flores Estrada"), goal("Luis Flores Estrada")];
  if (events.some((e) => !e.player_id)) throw new Error("Faltan goleadores en la semilla");
  await fetch(`${MOCK}/rest/v1/rpc/save_match_result_atomic`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ p_match_id: m.id, p_updates: { goals1: 1, goals2: 2, status: "Finalizado", puntos1: 0, puntos2: 3 }, p_events: events }) });
};

export const SHOTS = [
  // ───────── 1. Tu liga, tus reglas ─────────
  {
    id: "01-reglas", who: MANAGER, scenario: "temporada",
    run: async (page, d) => {
      await go(page, "/liga/rules");
      await step("plantilla", () => snapshot(page, d, "01-plantilla-reglas", { titulo: page.getByText("Plantilla de Reglas del Torneo"), minJugadores: page.getByText("Mínimo de Jugadores") }));
      await step("puntuacion", async () => {
        await scrollTo(page.getByText("Sistema de Puntuación y Desempate").first());
        await snapshot(page, d, "02-puntuacion", { seccion: page.getByText("Sistema de Puntuación y Desempate").first(), victoria: page.getByText("Puntos por Victoria").first(), desempate: page.locator("select").first() });
      });
      await step("cambio", async () => {
        const field = page.getByText("Puntos por Empate").locator("xpath=following::input[1]");
        await field.fill("2");
        await settle(page, 600);
        await snapshot(page, d, "03-cambio-sin-guardar", { campo: field, aviso: page.getByText("Tienes cambios sin guardar").first() });
      });
      await go(page, `${T}/definir`);
      await step("resumen-torneo", () => snapshot(page, d, "04-reglas-activas", { reglas: page.getByText("REGLAS ACTIVAS").first().locator("xpath=ancestor::*[self::div or self::section][2]"), verConfig: btn(page, "Ver configuracion") }));
      await step("config", async () => {
        await click(btn(page, "Ver configuracion"));
        await snapshot(page, d, "05-torneo-general", { modal: dialog(page) });
        for (const [n, name] of [["06", "Puntuación"], ["07", "Formato"], ["08", "Reglas"]]) {
          await click(tab(page, name), 700);
          await snapshot(page, d, `${n}-torneo-${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`, { modal: dialog(page), pestana: tab(page, name) });
        }
      });
    },
  },

  // ───────── 2. Equipos y jugadores ─────────
  {
    id: "02-equipos", who: MANAGER, scenario: "temporada",
    run: async (page, d) => {
      await go(page, "/division/94/equipos");
      await step("grid", () => snapshot(page, d, "01-equipos", { leones: page.getByRole("heading", { name: "Leones de Tlalpan" }), crear: btn(page, "Crear equipo"), contadores: btn(page, "Mostrar todos los equipos: 10") }));
      await go(page, "/division/94/equipos/104");
      await step("ficha", () => snapshot(page, d, "02-ficha-equipo", { modal: dialog(page), delegado: page.getByText("Ricardo Salinas").last(), estadisticas: page.getByText("Estadísticas").last() }));
      await step("jugadores", async () => {
        await click(page.getByText("Ver Jugadores").last(), 1200);
        await snapshot(page, d, "03-plantilla", { modal: dialog(page) });
      });
      await go(page, "/division/94/equipos/104");
      await step("estadisticas", async () => {
        await click(page.getByText("Estadísticas").last(), 1500);
        await snapshot(page, d, "04-estadisticas", { modal: dialog(page) });
        await click(dialog(page).getByText("Jugadores", { exact: true }).last(), 1500);
        await snapshot(page, d, "05-estadisticas-jugadores", { modal: dialog(page) });
      });
    },
  },

  // ───────── 3. Torneo y calendario ─────────
  {
    id: "03-calendario", who: MANAGER, scenario: "temporada",
    run: async (page, d) => {
      await go(page, `${T}/definir`);
      await step("torneo", () => snapshot(page, d, "01-torneo", { definir: btn(page, "Definir jornadas"), avanzar: btn(page, "Avanzar de fase"), metricas: page.getByText("METRICAS DEL TORNEO").first() }));
      await go(page, `${T}/jornadas/${J8}/list`);
      await step("fixture", async () => {
        const more = page.getByRole("button", { name: "Mostrar controles" });
        if (await more.count()) await click(more.first(), 700);
        await click(page.getByRole("button", { name: "Reorganizar partidos futuros" }).first(), 2500);
        await snapshot(page, d, "02-editor-fixture", { modal: dialog(page) });
        await page.keyboard.press("Escape"); await settle(page, 800);
      });
      await go(page, `${T}/jornadas/${J8}/list`);
      await step("lista", () => snapshot(page, d, "03-jornada-lista", { resultado: btn(page, "Resultado"), selector: btn(page, "Seleccionar jornada") }));
      await go(page, `${T}/jornadas/${J8}/grid`, 2200);
      await step("grilla", () => snapshot(page, d, "04-jornada-grilla", { calendario: page.getByLabel("Calendario semanal").first(), exportarRol: btn(page, "Exportar rol") }));
    },
  },

  // ───────── 4 + 5. Resultado que mueve la tabla ─────────
  {
    id: "04-resultado", who: MANAGER, scenario: "temporada",
    run: async (page, d) => {
      await go(page, `${T}/standings`);
      await step("antes", () => snapshot(page, d, "01-tabla-antes", { asi: page.locator("tr", { hasText: "Atlético San Isidro" }).first(), leones: page.locator("tr", { hasText: "Leones de Tlalpan" }).first(), rcf: page.locator("tr", { hasText: "Real Cuauhtémoc FC" }).first() }));
      await go(page, `${T}/jornadas/${J8}/list`);
      await step("jornada", () => snapshot(page, d, "02-jornada", { partido: page.getByText("Real Cuauhtémoc FC").first(), resultado: btn(page, "Resultado") }));
      await step("modal", async () => {
        await click(btn(page, "Resultado"), 1200);
        await snapshot(page, d, "03-definir-resultado", { modal: dialog(page), marcador: page.getByText("PRIMERA FUERZA").first() });
      });
      await step("local", async () => {
        await click(tab(page, "Real Cuauhtémoc FC"));
        await click(btn(page, "Auto-rellenar titulares"), 1500);
        await snapshot(page, d, "04-titulares-local", { autorellenar: btn(page, "Auto-rellenar titulares") });
        await addGoal(page, "Diego Herrera Aguilar", 1);
        await settle(page, 700);
        await snapshot(page, d, "05-gol-local", { marcador: page.getByText("PRIMERA FUERZA").first() });
      });
      await step("visita", async () => {
        await click(tab(page, "Atlético San Isidro"));
        await click(btn(page, "Auto-rellenar titulares"), 1500);
        await addPlayer(page, "Luis Flores Estrada");
        await addGoal(page, "Luis Flores Estrada", 2);
        await settle(page, 700);
        await snapshot(page, d, "06-goles-visita", { marcador: page.getByText("PRIMERA FUERZA").first() });
      });
      await step("guardar", async () => {
        await click(btn(page, "Guardar Marcador"), 1200);
        await snapshot(page, d, "07-confirmar", { confirmacion: dialog(page) });
        const confirm = page.getByRole("button", { name: /Confirmar|Guardar resultado|Sí, guardar|Confirmar y guardar/i }).last();
        await click(confirm, 2500);
        await snapshot(page, d, "08-guardado", { partido: page.getByText("Real Cuauhtémoc FC").first() });
      });
      await go(page, `${T}/standings`);
      await step("despues", () => snapshot(page, d, "09-tabla-despues", { asi: page.locator("tr", { hasText: "Atlético San Isidro" }).first(), leones: page.locator("tr", { hasText: "Leones de Tlalpan" }).first(), rcf: page.locator("tr", { hasText: "Real Cuauhtémoc FC" }).first() }));
      await go(page, `${T}/goleadores`);
      await step("goleadores", () => snapshot(page, d, "10-goleadores-despues", { lider: page.getByText("Luis Flores Estrada").first() }));
    },
  },

  {
    id: "05-tabla", who: MANAGER, scenario: "temporada",
    run: async (page, d) => {
      await go(page, `${T}/standings`);
      await step("tabla", () => snapshot(page, d, "01-tabla", { tabla: "table", fila1: page.locator("tbody tr").first(), selector: jornadaSelect(page), criterios: page.getByText("Criterios de desempate").first() }));
      await step("equipo", async () => {
        await click(page.locator("tbody tr", { hasText: "Leones de Tlalpan" }).first(), 1500);
        await snapshot(page, d, "02-resultados-equipo", { modal: dialog(page) });
      });
      await go(page, `${T}/goleadores`);
      await step("goleadores", () => snapshot(page, d, "03-goleadores", { lider: page.getByText("Luis Flores Estrada").first(), tabla: "table" }));
    },
  },

  // ───────── 6. Liga → liguilla ─────────
  {
    id: "06-liguilla", who: MANAGER, scenario: "liguilla",
    run: async (page, d, dev, ctx, browser) => {
      await go(page, `${T}/standings`);
      await step("final-regular", () => snapshot(page, d, "01-tabla-final", { tabla: "table", liguilla: page.getByText("LIGUILLA").first() }));
      const advance = async (label, scores, file) => {
        await go(page, `${T}/definir`);
        await click(btn(page, "Avanzar de fase"), 1800);
        await snapshot(page, d, file, { modal: dialog(page), confirmar: btn(page, "Confirmar cruces") });
        await click(btn(page, "Confirmar cruces"), 2500);
        const n = await fillPhase(scores);
        console.log(`  · ${label}: ${n} partidos con resultado`);
      };
      await step("cuartos", () => advance("cuartos", [[2, 1], [0, 0], [3, 1], [1, 2], [1, 1], [2, 2], [0, 1], [2, 0]], "02-cruces-cuartos"));
      await go(page, `${T}/standings`);
      await step("cuadro-cuartos", async () => { await click(tab(page, "Cuadro"), 1500); await snapshot(page, d, "03-cuadro-cuartos", { cuadro: page.getByRole("tabpanel").first() }); });
      await step("semis", () => advance("semis", [[1, 0], [2, 2], [1, 1], [0, 2]], "04-cruces-semis"));
      await step("final", () => advance("final", [[1, 1], [2, 1]], "05-cruces-final"));
      await go(page, `${T}/standings`);
      await step("cuadro-final", async () => { await click(tab(page, "Cuadro"), 1500); await snapshot(page, d, "06-cuadro-completo", { cuadro: page.getByRole("tabpanel").first() }); });
      await go(page, `${T}/definir`);
      await step("campeon", async () => {
        await snapshot(page, d, "07-torneo-con-campeon", { avanzar: btn(page, "Avanzar de fase") });
        const adv = btn(page, "Avanzar de fase");
        if (await adv.isEnabled().catch(() => false)) { await click(adv, 1800); await snapshot(page, d, "08-campeon", { modal: dialog(page) }); await page.keyboard.press("Escape"); }
      });
      // Vista pública del cuadro (sin cuenta), con el mismo estado de la liguilla.
      await step("publico-cuadro", async () => {
        const anon = await openContext(browser, { user: null, device: dev });
        const p2 = await anon.newPage();
        await go(p2, "/share/standings/123", 2500);
        await click(btn(p2, "Cuadro del torneo", false), 1500);
        await snapshot(p2, d, "09-publico-cuadro", { cuadro: p2.locator("main").first() });
        await anon.close();
      });
    },
  },

  // ───────── 7. Exportar en imagen ─────────
  {
    id: "07-exportar", who: MANAGER, scenario: "temporada",
    run: async (page, d, dev) => {
      const dl = path.join(OUT, d, "descargas");
      await saveJ8Result();
      await go(page, `${T}/standings`);
      await step("tabla", async () => {
        await click(btn(page, "Exportar Tabla"), 2500);
        await snapshot(page, d, "01-tabla-clasica", { modal: dialog(page), siguiente: btn(page, "Combinación siguiente"), descargar: btn(page, "Descargar") });
        for (let i = 2; i <= 6; i++) {
          await click(btn(page, "Combinación siguiente"), 1200);
          await snapshot(page, d, `0${i}-tabla-combinacion-${i}`, { modal: dialog(page) });
        }
        await click(btn(page, "Combinación siguiente"), 1000);
        await click(page.getByRole("switch", { name: "Usar colores de la liga" }), 1500);
        await snapshot(page, d, "07-tabla-colores-liga", { modal: dialog(page), colores: page.getByRole("switch", { name: "Usar colores de la liga" }) });
        if (dev === "desktop") await download(page, () => btn(page, "Descargar").click(), path.join(dl, "tabla-general.png"));
      });
      await go(page, `${T}/goleadores`);
      await step("goleadores", async () => {
        await click(btn(page, "Exportar tabla de goleo"), 2500);
        await snapshot(page, d, "08-goleadores", { modal: dialog(page) });
        if (!(await btn(page, "Barras").isVisible().catch(() => false))) { await btn(page, "Abrir configuracion").click({ force: true }); await settle(page, 900); }
        await btn(page, "Barras").click({ force: true }); await settle(page, 1200);
        await snapshot(page, d, "09-goleadores-barras", { modal: dialog(page) });
        if (dev === "desktop") await download(page, () => btn(page, "Descargar").click(), path.join(dl, "goleadores.png"));
      });
      await go(page, `${T}/jornadas/${J8}/grid`, 2200);
      await step("rol", async () => {
        await click(btn(page, "Exportar rol"), 2500);
        await snapshot(page, d, "10-rol-de-juego", { modal: dialog(page) });
        const story = page.getByRole("button", { name: /Historia \(9:16\)/ }).first();
        if (await story.count()) { await click(story, 1500); await snapshot(page, d, "11-rol-historia", { modal: dialog(page) }); }
        if (dev === "desktop") await download(page, () => btn(page, "Descargar").click(), path.join(dl, "rol-jornada-8.png"));
      });
    },
  },

  // ───────── 8. Enlace público ─────────
  {
    id: "08-publico", who: MANAGER, scenario: "temporada",
    run: async (page, d, dev, ctx, browser) => {
      await go(page, `${T}/standings`);
      await step("copiar", async () => {
        await snapshot(page, d, "01-interruptor-publico", { publico: btn(page, "Desactivar enlace publico"), copiar: btn(page, "Copiar Enlace") });
        await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
        await click(btn(page, "Copiar Enlace"), 700);
        await snapshot(page, d, "02-enlace-copiado", { copiar: btn(page, "Copiar Enlace") });
      });
      const anon = await openContext(browser, { user: null, device: dev });
      const p2 = await anon.newPage();
      await go(p2, "/share/standings/123", 2500);
      await step("publico-tabla", () => snapshot(p2, d, "03-publico-tabla", { titulo: p2.getByText("Temporada Apertura 2026").first(), tabla: "table" }));
      await step("publico-goleadores", async () => {
        await click(btn(p2, "Goleadores", false), 1500);
        await snapshot(p2, d, "04-publico-goleadores", { lider: p2.getByText("Luis Flores Estrada").first() });
      });
      await anon.close();
    },
  },

  // ───────── 9. Cuentas de delegado ─────────
  {
    id: "09-delegado", who: MANAGER, scenario: "temporada",
    run: async (page, d, dev, ctx, browser) => {
      await go(page, "/division/94/equipos");
      await step("invitar", async () => {
        await snapshot(page, d, "01-equipos-sin-vincular", { sinVincular: btn(page, "Mostrar equipos sin vincular: 9"), invitaciones: btn(page, "Invitaciones") });
        await click(btn(page, "Invitaciones"), 1500);
        await snapshot(page, d, "02-invitaciones", { modal: dialog(page), crear: page.getByRole("button", { name: /Crear \d+ invitaciones/ }).first() });
        await click(page.getByRole("button", { name: /Crear \d+ invitaciones/ }).first(), 2500);
        await snapshot(page, d, "03-invitaciones-creadas", { modal: dialog(page) });
      });
      const del = await openContext(browser, { user: DELEGATE, device: dev });
      const p2 = await del.newPage();
      await go(p2, "/equipos", 3000);
      await step("mi-equipo", () => snapshot(p2, d, "04-mi-equipo", { equipo: p2.getByRole("heading", { name: "Leones de Tlalpan" }).first(), resumen: p2.getByText("Torneo actual").first() }));
      await step("analisis", async () => {
        await scrollTo(p2.getByText("Análisis y probabilidades").first(), 1500);
        await snapshot(p2, d, "05-analisis-proximo-rival", { titulo: p2.getByText("Análisis y probabilidades").first(), selector: p2.locator("select").first() });
        await p2.mouse.wheel(0, dev === "mobile" ? 600 : 500); await p2.waitForTimeout(800);
        await snapshot(p2, d, "06-probabilidades", {});
        const show = p2.getByRole("button", { name: "Mostrar datos del rival" }).first();
        if (await show.count()) { await click(show, 1200); await scrollTo(show, 600); await snapshot(p2, d, "07-rival-en-contexto", { boton: show }); }
        await scrollTo(p2.getByText("Análisis y probabilidades").first(), 600);
        await click(p2.getByRole("tab", { name: "Temporada" }).first(), 1500);
        await snapshot(p2, d, "08-temporada", { pestana: p2.getByRole("tab", { name: "Temporada" }).first() });
      });
      await go(p2, "/equipos", 2500);
      await step("tabla-delegado", async () => {
        await click(p2.getByRole("button", { name: "Ver tabla de posiciones" }).first(), 1800);
        await snapshot(p2, d, "09-tabla-delegado", { tuEquipo: p2.getByText("Tu equipo").first() });
      });
      await del.close();
    },
  },
];

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith("--"));
const devArg = args.find((a) => a.startsWith("--device="))?.split("=")[1];
const devices = devArg ? [devArg] : ["desktop", "mobile"];

const browser = await launch();
for (const shot of SHOTS.filter((s) => !only.length || only.includes(s.id))) {
  for (const dev of (shot.devices || devices)) {
    if (shot.scenario) await setScenario(shot.scenario);
    const ctx = await openContext(browser, { user: shot.who, device: dev });
    const page = await ctx.newPage();
    const issues = watch(page, `${shot.id}/${dev}`);
    currentPage = page;
    console.log(`▶ ${shot.id} · ${dev}`);
    try {
      await shot.run(page, `${shot.id}/${dev}`, dev, ctx, browser);
    } catch (err) {
      console.log(`  ✗ ${shot.id}/${dev}: ${String(err.message).split("\n")[0]}`);
    }
    const real = issues.filter((x) => !/WebSocket|DevTools|HMR/.test(x));
    if (real.length) console.log(real.slice(0, 4).map((x) => "  ! " + x).join("\n"));
    await ctx.close();
  }
}
await browser.close();
if (fails.length) fs.writeFileSync("marketing/reel-promo/capture/out/fails.txt", fails.join("\n"));
