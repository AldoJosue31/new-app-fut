import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";

export default function ProductShowcase() {
  const { showcase } = landingCopy;

  return (
    <section
      style={{
        padding: "120px 0",
        background: "var(--lp-forest-deep)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className="lp-container lp-showcase-grid"
        style={{ position: "relative", zIndex: 1 }}
      >
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="lp-eyebrow">{showcase.eyebrow}</span>
          <h2 className="lp-h2">{showcase.title}</h2>
          <p className="lp-lead" style={{ marginBottom: 28 }}>
            {showcase.text}
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {showcase.bullets.map((b) => (
              <li
                key={b}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 14,
                  color: "rgba(245, 239, 224, 0.88)",
                  fontSize: 15,
                }}
              >
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: 999,
                    background:
                      "linear-gradient(135deg, var(--lp-gold-bright), var(--lp-gold-deep))",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--lp-carbon)",
                    fontSize: 14,
                    marginTop: 2,
                  }}
                >
                  <Icon icon="mdi:check-bold" width={13} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="lp-mockup"
        >
          {/* Mockup dashboard SVG-ish */}
          <div className="lp-mockup-frame">
            <div className="lp-mockup-topbar">
              <span className="lp-mockup-dot" style={{ background: "#ff5f57" }} />
              <span className="lp-mockup-dot" style={{ background: "#febc2e" }} />
              <span className="lp-mockup-dot" style={{ background: "#28c840" }} />
              <span
                style={{
                  marginLeft: 12,
                  fontSize: 11,
                  color: "rgba(245, 239, 224, 0.5)",
                }}
              >
                bracket.app / dashboard
              </span>
            </div>
            <div className="lp-mockup-body">
              <div className="lp-mockup-cards">
                {[
                  { label: "Equipos", val: "24", up: "+3" },
                  { label: "Jornadas", val: "8/17", up: "47%" },
                  { label: "Goles", val: "142", up: "+18" },
                ].map((c) => (
                  <div key={c.label} className="lp-mockup-card">
                    <span className="lp-mockup-card-label">{c.label}</span>
                    <div className="lp-mockup-card-val">{c.val}</div>
                    <span className="lp-mockup-card-up">▲ {c.up}</span>
                  </div>
                ))}
              </div>

              <div className="lp-mockup-table">
                <div className="lp-mockup-table-head">
                  <span>Pos</span>
                  <span>Equipo</span>
                  <span>PJ</span>
                  <span>Pts</span>
                </div>
                {[
                  { p: "1", t: "AFC Kravitt", pj: "8", pts: "22" },
                  { p: "2", t: "Los Sapos FC", pj: "8", pts: "19" },
                  { p: "3", t: "Real Barrio", pj: "8", pts: "17" },
                  { p: "4", t: "Deportivo Sur", pj: "8", pts: "14" },
                ].map((r, i) => (
                  <div
                    key={r.p}
                    className="lp-mockup-table-row"
                    style={{
                      background:
                        i === 0
                          ? "linear-gradient(90deg, rgba(212, 175, 55, 0.18), transparent)"
                          : "transparent",
                    }}
                  >
                    <span
                      style={{
                        color: i === 0 ? "var(--lp-gold-bright)" : "inherit",
                        fontWeight: i === 0 ? 800 : 500,
                      }}
                    >
                      {r.p}
                    </span>
                    <span>{r.t}</span>
                    <span>{r.pj}</span>
                    <span style={{ fontWeight: 700 }}>{r.pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* glow decorativo detrás del mockup */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -40,
              background:
                "radial-gradient(circle at 60% 40%, rgba(212, 175, 55, 0.22), transparent 60%)",
              filter: "blur(20px)",
              zIndex: -1,
            }}
          />
        </motion.div>
      </div>

      <style>{`
        .landing-scope .lp-showcase-grid {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 60px;
          align-items: center;
        }
        .landing-scope .lp-mockup { position: relative; }
        .landing-scope .lp-mockup-frame {
          background: linear-gradient(180deg, rgba(8, 31, 26, 0.96), rgba(7, 23, 19, 0.98));
          border-radius: var(--lp-radius-lg);
          border: 1px solid rgba(212, 175, 55, 0.25);
          box-shadow: 0 24px 50px -32px rgba(0, 0, 0, 0.55);
          overflow: hidden;
        }
        .landing-scope .lp-mockup-topbar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(212, 175, 55, 0.1);
        }
        .landing-scope .lp-mockup-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .landing-scope .lp-mockup-body {
          padding: 24px;
          display: grid;
          gap: 20px;
        }
        .landing-scope .lp-mockup-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .landing-scope .lp-mockup-card {
          background: color-mix(in srgb, var(--lp-app-surface) 82%, transparent);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .landing-scope .lp-mockup-card-label {
          font-size: 11px;
          color: rgba(245, 239, 224, 0.62);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .landing-scope .lp-mockup-card-val {
          font-size: 22px;
          font-weight: 800;
          color: var(--lp-cream);
        }
        .landing-scope .lp-mockup-card-up {
          font-size: 11px;
          color: var(--lp-grass-bright);
          font-weight: 700;
        }
        .landing-scope .lp-mockup-table {
          background: rgba(0, 0, 0, 0.16);
          border-radius: 12px;
          padding: 8px 4px;
        }
        .landing-scope .lp-mockup-table-head,
        .landing-scope .lp-mockup-table-row {
          display: grid;
          grid-template-columns: 40px 1fr 50px 50px;
          padding: 10px 14px;
          font-size: 13px;
          color: rgba(245, 239, 224, 0.75);
          align-items: center;
          border-radius: 8px;
        }
        .landing-scope .lp-mockup-table-head {
          font-size: 11px;
          color: rgba(245, 239, 224, 0.45);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(212, 175, 55, 0.1);
        }
        @media (max-width: 900px) {
          .landing-scope .lp-showcase-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .landing-scope .lp-mockup-cards {
            grid-template-columns: 1fr;
          }
          .landing-scope .lp-mockup-table-head,
          .landing-scope .lp-mockup-table-row {
            grid-template-columns: 32px 1fr 42px 42px;
            padding: 10px 10px;
          }
        }
      `}</style>
    </section>
  );
}
