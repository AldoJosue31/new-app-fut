import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "./landing/tokens.css";
import { useThemeStore } from "../store/ThemeStore";
import { Light } from "../styles/themes";
import { landingCopy } from "./landing/copy";

const fallbackLanding = Light.landingPage;

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
    <div className="landing-scope" data-theme={theme} style={landingVars}>
      <header className="landing-header">
        <a href="#inicio" className="landing-brand" aria-label="Bracket App">
          <img src="/logo_app.png" alt="Bracket App" width="40" height="40" />
          <span>{landingCopy.brand}</span>
        </a>

        <nav className="landing-nav" aria-label="Navegacion principal">
          {landingCopy.nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="landing-actions">
          <button type="button" onClick={setTheme}>
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </button>
          <Link to="/login">{landingCopy.actions.login}</Link>
        </div>
      </header>

      <main id="inicio" className="landing-main">
        <section className="landing-section" aria-labelledby="landing-title">
          <p>{landingCopy.hero.eyebrow}</p>
          <h1 id="landing-title">{landingCopy.hero.title}</h1>
          <p>{landingCopy.hero.summary}</p>
          <div className="landing-cta">
            <Link to="/login">{landingCopy.actions.start}</Link>
            <a href="#funciones">{landingCopy.actions.functions}</a>
          </div>
        </section>

        <section id="funciones" className="landing-section" aria-labelledby="funciones-title">
          <h2 id="funciones-title">Funciones principales</h2>
          <ul className="landing-list">
            {landingCopy.functions.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="operacion" className="landing-section" aria-labelledby="operacion-title">
          <h2 id="operacion-title">Flujo de operacion</h2>
          <ol className="landing-list">
            {landingCopy.flow.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="planes" className="landing-section" aria-labelledby="planes-title">
          <h2 id="planes-title">Planes</h2>
          <p>{landingCopy.pricing}</p>
        </section>

        <section id="faq" className="landing-section" aria-labelledby="faq-title">
          <h2 id="faq-title">Preguntas basicas</h2>
          <dl className="landing-faq">
            {landingCopy.faq.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="landing-footer">
        <p>{landingCopy.footer}</p>
        <a href="#inicio">Volver arriba</a>
      </footer>
    </div>
  );
}
