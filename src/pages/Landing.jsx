import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "./landing/tokens.css";
import { useThemeStore } from "../store/ThemeStore";
import { Light } from "../styles/themes";
import { landingCopy } from "./landing/copy";

const fallbackLanding = Light.landingPage;

const dashboardRows = [
  { home: "Norte FC", away: "Delta Sur", time: "19:30", state: "Programado" },
  { home: "Union 8", away: "Cantera", time: "21:00", state: "Cedula lista" },
  { home: "Real Lago", away: "Atlas 24", time: "Final", state: "2 - 1" },
];

const publicMetrics = [
  ["18", "equipos activos"],
  ["42", "partidos publicados"],
  ["6", "divisiones"],
];

export default function Landing() {
  const { theme, themeStyle, setTheme } = useThemeStore();
  const landing = themeStyle.landingPage ?? fallbackLanding;

  const landingVars = useMemo(
    () => ({
      "--lp-page": landing.page,
      "--lp-surface": landing.surface,
      "--lp-surface-soft": landing.surfaceSoft,
      "--lp-surface-raised": landing.surfaceRaised,
      "--lp-text": landing.text,
      "--lp-text-muted": landing.textMuted,
      "--lp-text-soft": landing.textSoft,
      "--lp-border": landing.border,
      "--lp-border-strong": landing.borderStrong,
      "--lp-accent": landing.accent,
      "--lp-accent-strong": landing.accentStrong,
      "--lp-accent-soft": landing.accentSoft,
      "--lp-accent-text": landing.accentText,
      "--lp-header": landing.header,
      "--lp-shadow": landing.shadow,
      "--lp-bracket-line": landing.bracketLine,
      "--lp-focus-ring": `0 0 0 3px ${landing.accentSoft}, 0 0 0 6px ${landing.accent}`,
    }),
    [landing]
  );

  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = landing.page;
    return () => {
      document.body.style.background = prev;
    };
  }, [landing.page]);

  return (
    <div
      className="landing-scope min-h-[100dvh] bg-[var(--lp-page)] text-[var(--lp-text)]"
      data-theme={theme}
      style={landingVars}
    >
      <header className="landing-header sticky top-0 z-20 border-b border-[var(--lp-border)] bg-[var(--lp-header)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="#inicio" className="landing-brand flex items-center gap-3" aria-label="Bracket App">
          <img src="/logo_app.png" alt="Bracket App" width="40" height="40" />
          <span className="text-sm font-black uppercase tracking-[0.18em]">{landingCopy.brand}</span>
        </a>

        <nav className="landing-nav hidden items-center gap-1 rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] p-1 md:flex" aria-label="Navegacion principal">
          {landingCopy.nav.map((item) => (
            <a key={item.href} href={item.href} className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--lp-text-muted)] transition hover:bg-[var(--lp-surface-soft)] hover:text-[var(--lp-text)]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="landing-actions flex items-center gap-2">
          <button className="landing-button landing-button-secondary" type="button" onClick={setTheme}>
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </button>
          <Link className="landing-button landing-button-primary" to="/login">{landingCopy.actions.login}</Link>
        </div>
        </div>
      </header>

      <main id="inicio">
        <section className="landing-hero mx-auto grid min-h-[calc(100dvh-73px)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,1.08fr)] lg:px-8 lg:py-16" aria-labelledby="landing-title">
          <div className="max-w-3xl">
            <p className="landing-eyebrow mb-5">{landingCopy.hero.eyebrow}</p>
            <h1 id="landing-title" className="max-w-4xl text-4xl font-black leading-[0.98] text-[var(--lp-text)] sm:text-6xl lg:text-7xl">
              {landingCopy.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--lp-text-muted)]">
              {landingCopy.hero.summary}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="landing-button landing-button-primary landing-button-large" to="/login">{landingCopy.actions.start}</Link>
              <a className="landing-button landing-button-secondary landing-button-large" href="#funciones">{landingCopy.actions.functions}</a>
            </div>
          </div>

          <div className="landing-product-shell" aria-label="Vista operativa de ejemplo">
            <div className="landing-product-top">
              <div>
                <span>Jornada 8</span>
                <strong>Division libre</strong>
              </div>
              <Link to="/login">Operar liga</Link>
            </div>
            <div className="landing-score-strip" aria-label="Indicadores publicos">
              {publicMetrics.map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="landing-board">
              <div className="landing-board-header">
                <span>Partidos</span>
                <span>Estado</span>
              </div>
              {dashboardRows.map((row) => (
                <div className="landing-match-row" key={`${row.home}-${row.away}`}>
                  <div>
                    <strong>{row.home}</strong>
                    <span>{row.away}</span>
                  </div>
                  <time>{row.time}</time>
                  <span>{row.state}</span>
                </div>
              ))}
            </div>
            <div className="landing-public-link">
              <span>Tabla publica actualizada</span>
              <strong>Lista para compartir</strong>
            </div>
          </div>
        </section>

        <section id="funciones" className="landing-section mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="funciones-title">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="landing-eyebrow mb-4">Funciones principales</p>
              <h2 id="funciones-title" className="text-4xl font-black leading-tight sm:text-5xl">Todo lo que la jornada necesita en un solo lugar.</h2>
            </div>
            <ul className="landing-feature-grid">
            {landingCopy.functions.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
          </div>
        </section>

        <section id="operacion" className="landing-section mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="operacion-title">
          <div className="max-w-3xl">
            <p className="landing-eyebrow mb-4">Flujo de operacion</p>
            <h2 id="operacion-title" className="text-4xl font-black leading-tight sm:text-5xl">Del registro inicial a la tabla publica.</h2>
          </div>
          <ol className="landing-flow mt-10">
            {landingCopy.flow.map((item) => (
              <li key={item.title}>
                <span>{item.title}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="planes" className="landing-section mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="planes-title">
          <div className="landing-pricing">
            <div>
              <p className="landing-eyebrow mb-4">Planes</p>
              <h2 id="planes-title" className="text-4xl font-black leading-tight sm:text-5xl">Preparado para crecer por division.</h2>
            </div>
            <div>
              <p>{landingCopy.pricing}</p>
              <Link className="landing-button landing-button-primary landing-button-large mt-7" to="/login">{landingCopy.actions.start}</Link>
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="faq-title">
          <div className="grid gap-10 lg:grid-cols-[0.55fr_1fr]">
            <div>
              <p className="landing-eyebrow mb-4">Preguntas basicas</p>
              <h2 id="faq-title" className="text-4xl font-black leading-tight sm:text-5xl">Lo esencial antes de empezar.</h2>
            </div>
            <dl className="landing-faq">
            {landingCopy.faq.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
          </div>
        </section>
      </main>

      <footer className="landing-footer border-t border-[var(--lp-border)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 text-sm text-[var(--lp-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{landingCopy.footer}</p>
          <a className="font-semibold text-[var(--lp-text)]" href="#inicio">Volver arriba</a>
        </div>
      </footer>
    </div>
  );
}
