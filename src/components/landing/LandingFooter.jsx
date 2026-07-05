import React from "react";
import { landingCopy } from "../../pages/landing/copy";

// ─── Nav links estructurales del footer ─────────────────────────────────────
const FOOTER_SECTIONS = [
  {
    title: "Producto",
    links: [
      { label: "Funcionalidades", href: "#producto" },
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Planes", href: "#planes" },
      { label: "Preguntas frecuentes", href: "#faq" },
    ],
  },
  {
    title: "Plataforma",
    links: [
      { label: "Crear una liga", href: "#" },
      { label: "Registrar equipo", href: "#" },
      { label: "Tabla pública", href: "#" },
      { label: "Resultados en vivo", href: "#" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Acerca de", href: "#" },
      { label: "Contacto", href: "#" },
      { label: "Privacidad", href: "#" },
      { label: "Términos de uso", href: "#" },
    ],
  },
];

// ─── Stats de prueba social ──────────────────────────────────────────────────
const STATS = [
  { value: "+120", label: "Ligas activas" },
  { value: "+1,800", label: "Equipos registrados" },
  { value: "+42 k", label: "Partidos jugados" },
];

export default function LandingFooter() {
  const { footer, nav } = landingCopy;
  const year = new Date().getFullYear();

  // Usar columnas del copy si existen, si no, las estructurales
  const sections =
    footer.columns && footer.columns.length > 0
      ? footer.columns
      : FOOTER_SECTIONS;

  return (
    <footer
      className="
        relative
        bg-[var(--lp-surface)]
        border-t border-[var(--lp-border)]
        pt-20 pb-8
        overflow-hidden
      "
    >
      {/* ── Glow ambiental sutil ── */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -top-48 left-1/2
          -translate-x-1/2 w-[800px] h-[400px]
          rounded-full opacity-[0.04]
          bg-[var(--lp-text)]
          blur-[120px]
        "
      />

      <div className="lp-container relative z-10">

        {/* ── Bloque superior: marca + stats ── */}
        <div className="
          grid grid-cols-1 gap-12
          md:grid-cols-[1.6fr_1fr_1fr_1fr]
          md:gap-10
          pb-14
          border-b border-[var(--lp-border)]
        ">
          {/* Marca */}
          <div className="flex flex-col gap-5">
            {/* Logo */}
            <a
              href="#"
              className="inline-flex items-center gap-2.5 group w-fit"
              aria-label={nav.logoText}
            >
              <img
                src={nav.logoImg}
                alt={nav.logoText}
                className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span className="
                text-[var(--lp-text)]
                font-extrabold text-[17px] tracking-tight
                transition-opacity duration-200 group-hover:opacity-80
              ">
                {nav.logoText}
              </span>
            </a>

            {/* Tagline */}
            <p className="
              text-[var(--lp-text-muted)]
              text-[14px] leading-relaxed
              max-w-[240px]
            ">
              {footer.tagline}
            </p>

            {/* Stats compactos */}
            <ul className="flex flex-col gap-3 mt-1" aria-label="Métricas de la plataforma">
              {STATS.map((s) => (
                <li key={s.label} className="flex items-baseline gap-2">
                  <span className="
                    text-[var(--lp-text)]
                    font-bold text-[15px] tabular-nums
                  ">
                    {s.value}
                  </span>
                  <span className="
                    text-[var(--lp-text-muted)]
                    text-[13px]
                  ">
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Columnas de navegación */}
          {sections.map((col) => (
            <nav
              key={col.title}
              aria-label={`Sección ${col.title}`}
            >
              <h2 className="
                text-[var(--lp-text)]
                font-semibold text-[13px] tracking-wide
                mb-5
              ">
                {col.title}
              </h2>
              <ul className="flex flex-col gap-[10px]" role="list">
                {(col.links || []).map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="footer-nav-link
                        text-[var(--lp-text-muted)]
                        text-[14px] font-medium
                        inline-block
                        transition-all duration-200
                        hover:text-[var(--lp-text)]
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-[var(--lp-border)]
                        focus-visible:ring-offset-2
                        rounded-sm
                      "
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ── Barra inferior: copyright + crédito ── */}
        <div className="
          flex flex-col gap-3
          sm:flex-row sm:items-center sm:justify-between
          pt-7
          text-[13px] text-[var(--lp-text-muted)]
        ">
          <span className="tabular-nums">
            {footer.copyright.replace("{year}", year)}
          </span>

          <span className="flex items-center gap-1.5 select-none">
            <span
              aria-hidden="true"
              className="text-base leading-none"
            >
              ⚽
            </span>
            Hecho con pasión por el fútbol amateur
          </span>
        </div>
      </div>

      {/* ── Estilo de hover con translate (GPU-accelerated) ── */}
      <style>{`
        .landing-scope .footer-nav-link {
          transform: translateX(0);
        }
        .landing-scope .footer-nav-link:hover {
          transform: translateX(3px);
        }
        @media (max-width: 767px) {
          .landing-scope footer .lp-container > div:first-of-type {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 480px) {
          .landing-scope footer .lp-container > div:first-of-type {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </footer>
  );
}