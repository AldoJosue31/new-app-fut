import React from "react";
import { landingCopy } from "../../pages/landing/copy";

export default function LandingFooter() {
  const { footer, nav } = landingCopy;
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--lp-surface)", // Integrado con el color del dashboard
        borderTop: "1px solid var(--lp-border)",
        padding: "80px 0 32px",
        color: "var(--lp-text-muted)",
      }}
    >
      <div className="lp-container">
        <div className="lp-footer-grid">
          <div>
            {/* LOGO REAL INYECTADO AQUÍ */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <img 
                src={nav.logoImg} 
                alt={nav.logoText} 
                style={{ height: "36px", width: "auto", objectFit: "contain" }} 
              />
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  color: "var(--lp-text)",
                }}
              >
                {nav.logoText}
              </span>
            </div>
            <p style={{ fontSize: 14, maxWidth: 280, margin: 0 }}>
              {footer.tagline}
            </p>
          </div>

          {footer.columns.map((col) => (
            <div key={col.title}>
              <h4
                style={{
                  color: "var(--lp-primary)", // Color primario (Azul)
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  margin: "0 0 18px",
                  fontWeight: 800
                }}
              >
                {col.title}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {col.links.map((l) => (
                  <li key={l.label} style={{ marginBottom: 10 }}>
                    <a
                      href={l.href}
                      className="lp-footer-link"
                      style={{
                        textDecoration: "none",
                        fontSize: 14,
                        fontWeight: 500
                      }}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--lp-border)",
            marginTop: 48,
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            color: "var(--lp-text-muted)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>{footer.copyright.replace("{year}", year)}</span>
          <span>Hecho con pasión por el fútbol amateur ⚽</span>
        </div>
      </div>

      <style>{`
        .landing-scope .lp-footer-link {
          color: var(--lp-text-muted);
          transition: color 180ms ease, transform 180ms ease;
          display: inline-block;
        }
        .landing-scope .lp-footer-link:hover {
          color: var(--lp-primary);
          transform: translateX(4px);
        }
        .landing-scope .lp-footer-grid {
          display: grid;
          grid-template-columns: 1.8fr repeat(3, 1fr);
          gap: 40px;
        }
        @media (max-width: 900px) {
          .landing-scope .lp-footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 520px) {
          .landing-scope .lp-footer-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </footer>
  );
}