import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";

const ICONS = {
  trophy: "mdi:trophy-variant",
  team: "mdi:account-group",
  calendar: "mdi:calendar-check",
  chart: "mdi:chart-bar",
};

export default function FeaturesStrip() {
  const { features } = landingCopy;

  return (
    <section
      id="producto"
      style={{
        padding: "100px 0",
        background: "var(--lp-forest)",
        position: "relative",
      }}
    >
      <div className="lp-container">
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 64px" }}>
          <span className="lp-eyebrow" style={{ justifyContent: "center" }}>
            {features.eyebrow}
          </span>
          <h2 className="lp-h2">{features.title}</h2>
        </div>

        <div className="lp-features-grid">
          {features.items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="lp-feature-card"
            >
              <div className="lp-feature-icon">
                <Icon icon={ICONS[item.icon]} width={28} height={28} />
              </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--lp-cream)",
                  margin: "18px 0 10px",
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 15,
                  color: "rgba(245, 239, 224, 0.7)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .landing-scope .lp-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .landing-scope .lp-feature-card {
          background: linear-gradient(180deg, rgba(245, 239, 224, 0.04), rgba(245, 239, 224, 0.02));
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: var(--lp-radius-lg);
          padding: 28px 24px;
          transition: all 0.25s ease;
        }
        .landing-scope .lp-feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(212, 175, 55, 0.5);
          box-shadow: 0 20px 40px -20px rgba(212, 175, 55, 0.25);
        }
        .landing-scope .lp-feature-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--lp-gold-bright), var(--lp-gold-deep));
          display: grid;
          place-items: center;
          color: var(--lp-carbon);
        }
        @media (max-width: 900px) {
          .landing-scope .lp-features-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .landing-scope .lp-features-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
