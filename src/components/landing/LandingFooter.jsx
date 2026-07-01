import React from "react";
import { landingCopy } from "../../pages/landing/copy";

export default function LandingFooter() {
  const { footer, nav } = landingCopy;
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--lp-carbon)",
        padding: "80px 0 32px",
        color: "rgba(245, 239, 224, 0.7)",
      }}
    >
      <div className="lp-container">
        <div className="lp-footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background:
                    "linear-gradient(135deg, var(--lp-gold-bright), var(--lp-gold-deep))",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  color: "var(--lp-carbon)",
                }}
              >
                B
              </div>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  color: "var(--lp-cream)",
                }}
              >
                {nav.logo}
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
                  color: "var(--lp-gold-bright)",
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  margin: "0 0 18px",
                }}
              >
                {col.title}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {col.links.map((l) => (
                  <li key={l.label} style={{ marginBottom: 10 }}>
                    <a
                      href={l.href}
                      style={{
                        color: "rgba(245, 239, 224, 0.65)",
                        textDecoration: "none",
                        fontSize: 14,
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--lp-gold-bright)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(245, 239, 224, 0.65)")
                      }
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
            borderTop: "1px solid rgba(245, 239, 224, 0.08)",
            marginTop: 48,
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            color: "rgba(245, 239, 224, 0.5)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>{footer.copyright.replace("{year}", year)}</span>
          <span>Hecho con pasión por el fútbol amateur ⚽</span>
        </div>
      </div>

      <style>{`
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
