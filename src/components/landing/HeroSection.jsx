import React from "react";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { landingCopy } from "../../pages/landing/copy";

export default function HeroSection() {
  const { hero } = landingCopy;

  return (
    <section
      id="top"
      className="lp-grass-noise"
      style={{
        position: "relative",
        paddingTop: 160,
        paddingBottom: 120,
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 20% 0%, rgba(46, 125, 50, 0.35), transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(212, 175, 55, 0.18), transparent 60%), linear-gradient(180deg, var(--lp-forest-deep), var(--lp-forest))",
      }}
    >
      {/* Orbe dorado decorativo */}
      <motion.div
        aria-hidden
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.6 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "-10%",
          right: "-8%",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(241, 203, 74, 0.35), transparent 65%)",
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="lp-container"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 60,
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: 780 }}>
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lp-eyebrow"
          >
            {hero.eyebrow}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            style={{
              fontSize: "clamp(44px, 8vw, 96px)",
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "24px 0 24px",
              color: "var(--lp-cream)",
            }}
          >
            {hero.titleLine1}
            <br />
            <span
              style={{
                color: "var(--lp-gold-bright)",
              }}
            >
              {hero.titleAccent}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              fontSize: 19,
              color: "rgba(245, 239, 224, 0.84)",
              maxWidth: 620,
              marginBottom: 40,
            }}
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
          >
            <Link to="/login" className="lp-btn lp-btn-primary">
              {hero.ctaPrimary} <span aria-hidden>→</span>
            </Link>
            <a href="#producto" className="lp-btn lp-btn-ghost">
              ▶ {hero.ctaSecondary}
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="lp-hero-stats"
            style={{
              display: "grid",
              gap: 32,
              marginTop: 64,
              maxWidth: 560,
              paddingTop: 32,
              borderTop: "1px solid rgba(245, 239, 224, 0.12)",
            }}
          >
            {hero.stats.map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--lp-gold-bright)",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(245, 239, 224, 0.68)",
                    marginTop: 6,
                    letterSpacing: 0.3,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <style>{`
        .landing-scope .lp-hero-stats {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (max-width: 640px) {
          .landing-scope .lp-hero-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px 18px;
            margin-top: 48px !important;
          }
        }
        @media (max-width: 420px) {
          .landing-scope .lp-hero-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
