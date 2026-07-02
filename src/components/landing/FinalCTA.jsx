import React from "react";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { landingCopy } from "../../pages/landing/copy";

export default function FinalCTA() {
  const { finalCta } = landingCopy;

  return (
    <section
      style={{
        padding: "80px 0",
        background:
          "linear-gradient(180deg, var(--lp-forest), var(--lp-forest-deep))",
      }}
    >
      <div className="lp-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          style={{
            position: "relative",
            padding: "72px 48px",
            borderRadius: "var(--lp-radius-xl)",
            background:
              "linear-gradient(135deg, var(--lp-gold-deep), var(--lp-gold-bright))",
            color: "var(--lp-carbon)",
            overflow: "hidden",
            textAlign: "center",
            boxShadow: "0 40px 80px -30px rgba(212, 175, 55, 0.6)",
          }}
        >
          {/* Textura decorativa */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(10, 42, 32, 0.15) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(10, 42, 32, 0.1) 0, transparent 40%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
                margin: 0,
                marginBottom: 20,
                color: "var(--lp-forest-deep)",
              }}
            >
              {finalCta.tagline}
            </p>
            <h2
              style={{
                fontSize: "clamp(32px, 5vw, 54px)",
                fontWeight: 900,
                margin: 0,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {finalCta.title}
            </h2>
            <p
              style={{
                fontSize: 22,
                marginTop: 8,
                marginBottom: 36,
                fontWeight: 700,
                color: "var(--lp-forest-deep)",
              }}
            >
              {finalCta.subtitle}
            </p>
            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/login"
                className="lp-btn"
                style={{
                  background: "var(--lp-forest-deep)",
                  color: "var(--lp-gold-bright)",
                  border: "2px solid var(--lp-forest-deep)",
                }}
              >
                {finalCta.ctaPrimary} →
              </Link>
              <a
                href="#planes"
                className="lp-btn"
                style={{
                  background: "transparent",
                  color: "var(--lp-forest-deep)",
                  border: "2px solid var(--lp-forest-deep)",
                }}
              >
                {finalCta.ctaSecondary}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
