// Abre la app (servidor local contra el Supabase falso) con sesión demo y tema oscuro.
import { chromium } from "@playwright/test";
import { makeSession } from "./mock-supabase-session.mjs";

export const APP = "http://127.0.0.1:4180";
export const MOCK = "http://127.0.0.1:54399";
export const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

export const launch = () => chromium.launch();

export const openContext = async (browser, { user, device = "desktop", divisionId = 94 }) => {
  const ctx = await browser.newContext({ ...VIEWPORTS[device], locale: "es-MX", timezoneId: "America/Mexico_City", colorScheme: "dark", reducedMotion: "no-preference" });
  if (user) {
    const session = makeSession(user);
    await ctx.addCookies([{ name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: APP, sameSite: "Lax", expires: session.expires_at }]);
  }
  await ctx.addInitScript((div) => {
    try {
      localStorage.setItem("theme", "dark");
      localStorage.setItem("division-storage", JSON.stringify({ state: { selectedDivision: div }, version: 0 }));
    } catch {}
    // Oculta el indicador de desarrollo de Next.
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = [400, 600, 700].map((w) => `@font-face{font-family:Poppins;font-style:normal;font-weight:${w};font-display:block;src:url(/fonts/poppins/poppins-latin-${w}.woff2) format("woff2")}`).join("") + "nextjs-portal{display:none!important}*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}";
      document.head.appendChild(s);
    });
  }, { id: divisionId, name: divisionId === 94 ? "Primera Fuerza" : "Segunda Fuerza", league_id: 7 });
  return ctx;
};

export const watch = (page, label) => {
  const issues = [];
  page.on("console", (m) => { if (m.type() === "error") issues.push(`[${label}] console: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => issues.push(`[${label}] pageerror: ${String(e).slice(0, 200)}`));
  return issues;
};

export const settle = async (page, ms = 1200) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};

export const setScenario = (name) => fetch(`${MOCK}/__scenario?name=${name}`);
