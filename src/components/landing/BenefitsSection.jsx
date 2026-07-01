import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";

const ICONS = {
  shield: "mdi:shield-check",
  savings: "mdi:cash-multiple",
  "chart-up": "mdi:trending-up",
};

export default function BenefitsSection() {
  const { benefits } = landingCopy;

  return (
    <section
      style={{
        padding: "120px 0",
        background: "var(--lp-cream)",
        color: "var(--lp-carbon)",
        position: "relative",
      }}
    >
      <div className="lp-container">
        <div style={{ maxWidth: 780, marginBottom: 64 }}>
          <span
            className="lp-eyebrow"
            style={{ color: "var(--lp-forest)" }}
          >
            {benefits.eyebrow}
          </span>
          <h2
            className="lp-h2"
            style={{ color: "var(--lp-carbon)" }}
          >
            {benefits.title}
          </h2>
        </div>

        <div className="lp-benefits-grid">
          {benefits.cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="lp-benefit-card"
            >
              <div className="lp-benefit-icon">
                <Icon icon={ICONS[c.icon]} width={30} />
              </div>
              <h3 className="lp-benefit-title">{c.title}</h3>
              <p className="lp-benefit-text">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .landing-scope .lp-benefits-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .landing-scope .lp-benefit-card {
          background: #fff;
          border-radius: var(--lp-radius-lg);
          padding: 36px 32px;
          border: 1px solid rgba(15, 61, 46, 0.08);
          box-shadow: 0 20px 40px -30px rgba(15, 61, 46, 0.3);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .landing-scope .lp-benefit-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 30px 60px -25px rgba(15, 61, 46, 0.35);
        }
        .landing-scope .lp-benefit-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--lp-forest), var(--lp-grass));
          display: grid;
          place-items: center;
          color: var(--lp-gold-bright);
        }
        .landing-scope .lp-benefit-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--lp-forest);
          margin: 20px 0 10px;
        }
        .landing-scope .lp-benefit-text {
          font-size: 15px;
          color: rgba(10, 10, 10, 0.65);
          line-height: 1.6;
          margin: 0;
        }
        @media (max-width: 900px) {
          .landing-scope .lp-benefits-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
