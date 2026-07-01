import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { landingCopy } from "../../pages/landing/copy";

export default function HowItWorks() {
  const { howItWorks } = landingCopy;

  return (
    <section
      id="como-funciona"
      style={{
        padding: "120px 0",
        background:
          "linear-gradient(180deg, var(--lp-forest), var(--lp-forest-deep))",
        position: "relative",
      }}
    >
      <div className="lp-container">
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 72px" }}>
          <span className="lp-eyebrow" style={{ justifyContent: "center" }}>
            {howItWorks.eyebrow}
          </span>
          <h2 className="lp-h2">{howItWorks.title}</h2>
        </div>

        <div className="lp-steps-grid">
          {howItWorks.steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className="lp-step-card"
            >
              <div className="lp-step-number">{s.n}</div>
              <h3 className="lp-step-title">{s.title}</h3>
              <p className="lp-step-text">{s.text}</p>

              {i < howItWorks.steps.length - 1 && (
                <div className="lp-step-connector" aria-hidden />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .landing-scope .lp-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          position: relative;
        }
        .landing-scope .lp-step-card {
          position: relative;
          padding: 40px 32px;
          border-radius: var(--lp-radius-lg);
          background: linear-gradient(180deg, rgba(212, 175, 55, 0.05), transparent);
          border: 1px solid rgba(212, 175, 55, 0.12);
        }
        .landing-scope .lp-step-number {
          font-size: 68px;
          font-weight: 900;
          line-height: 1;
          background: linear-gradient(135deg, var(--lp-gold-bright), var(--lp-gold-deep));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 20px;
          letter-spacing: -0.03em;
        }
        .landing-scope .lp-step-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--lp-cream);
          margin: 0 0 12px;
        }
        .landing-scope .lp-step-text {
          font-size: 15px;
          color: rgba(245, 239, 224, 0.72);
          margin: 0;
          line-height: 1.6;
        }
        .landing-scope .lp-step-connector {
          position: absolute;
          top: 60px;
          right: -18px;
          width: 36px;
          height: 2px;
          background: linear-gradient(90deg, var(--lp-gold), transparent);
        }
        @media (max-width: 900px) {
          .landing-scope .lp-steps-grid { grid-template-columns: 1fr; }
          .landing-scope .lp-step-connector { display: none; }
        }
      `}</style>
    </section>
  );
}
