import React, { useState } from "react";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";

const formatPrice = (amount) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(amount);

export default function PricingSection() {
  const { pricing } = landingCopy;
  const [cycle, setCycle] = useState("monthly");

  return (
    <section
      id="planes"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        padding: "clamp(60px, 8vh, 100px) 0",
        background: "var(--lp-bg)",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Fondo decorativo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(212, 175, 55, 0.1), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div className="lp-container" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 44px" }}>
          <span className="lp-eyebrow" style={{ justifyContent: "center" }}>
            {pricing.eyebrow}
          </span>
          <h2 className="lp-h2">{pricing.title}</h2>
          <p className="lp-lead" style={{ margin: "0 auto" }}>
            {pricing.subtitle}
          </p>
        </div>

        {/* Toggle de ciclo */}
        <div className="lp-cycle-toggle">
          {Object.values(pricing.cycles).map((c) => (
            <button
              key={c.key}
              onClick={() => setCycle(c.key)}
              className={`lp-cycle-btn ${cycle === c.key ? "active" : ""}`}
            >
              <span style={{ fontWeight: 700 }}>{c.label}</span>
              <span
                style={{
                  fontSize: 11,
                  opacity: 0.7,
                  display: "block",
                  marginTop: 2,
                }}
              >
                {c.note}
              </span>
            </button>
          ))}
        </div>

        {/* Grid de planes */}
        <div className="lp-plans-grid">
          {pricing.plans.map((plan, i) => {
            const price = plan.prices[cycle];
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className={`lp-plan-card ${plan.highlight ? "highlight" : ""}`}
              >
                {plan.highlight && (
                  <div className="lp-plan-badge">MÁS ELEGIDO</div>
                )}

                <div className="lp-plan-header">
                  <div className="lp-plan-shield">{plan.badge}</div>
                  <div>
                    <div className="lp-plan-name">{plan.name}</div>
                    <div className="lp-plan-divisions">{plan.divisions}</div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={cycle}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="lp-plan-price"
                  >
                    <div className="lp-plan-amount">
                      <span className="lp-plan-currency">$</span>
                      <span className="lp-plan-num">
                        {formatPrice(price.amount)}
                      </span>
                      <span className="lp-plan-mxn">{pricing.currency}</span>
                    </div>
                    <div className="lp-plan-period">
                      {cycle === "monthly" && "por mes"}
                      {cycle === "semester" && "cada 6 meses"}
                      {cycle === "annual" && "por año"}
                    </div>
                    {price.save && (
                      <div className="lp-plan-savings">
                        <Icon icon="mdi:leaf" width={14} />
                        {pricing.savingLabel} ${formatPrice(price.save)}{" "}
                        {pricing.currency} · {price.percent}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <Link
                  to="/login"
                  className={`lp-btn ${
                    plan.highlight ? "lp-btn-primary" : "lp-btn-ghost"
                  }`}
                  style={{ width: "100%", marginTop: "auto" }}
                >
                  {pricing.ctaLabel}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 40,
            fontSize: 13,
            color: "rgba(245, 239, 224, 0.55)",
          }}
        >
          {pricing.finePrint}
        </p>
      </div>

      <style>{`
        .landing-scope .lp-cycle-toggle {
          display: inline-flex;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 999px;
          padding: 6px;
          margin: 0 auto 56px;
          gap: 4px;
          left: 50%;
          transform: translateX(-50%);
          position: relative;
        }
        .landing-scope .lp-cycle-btn {
          padding: 10px 22px;
          background: transparent;
          color: rgba(245, 239, 224, 0.72);
          border: none;
          border-radius: 999px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          transition:
            background-color 180ms ease,
            color 180ms ease,
            transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
            box-shadow 180ms ease;
          min-width: 130px;
        }
        .landing-scope .lp-cycle-btn:hover {
          color: var(--lp-cream);
        }
        .landing-scope .lp-cycle-btn.active {
          background: linear-gradient(135deg, var(--lp-gold-bright), var(--lp-gold-deep));
          color: var(--lp-carbon);
          box-shadow: 0 10px 24px -10px rgba(212, 175, 55, 0.52);
        }

        .landing-scope .lp-plans-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }
        .landing-scope .lp-plan-card {
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, rgba(245, 239, 224, 0.04), rgba(245, 239, 224, 0.01));
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: var(--lp-radius-lg);
          padding: 28px 22px;
          gap: 20px;
          transition:
            transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
            border-color 180ms ease,
            box-shadow 180ms ease;
          position: relative;
        }
        .landing-scope .lp-plan-card:hover {
          transform: translateY(-3px);
          border-color: rgba(212, 175, 55, 0.34);
          box-shadow: 0 18px 34px -26px rgba(212, 175, 55, 0.18);
        }
        .landing-scope .lp-plan-card.highlight {
          background: linear-gradient(180deg, rgba(212, 175, 55, 0.14), rgba(46, 125, 50, 0.1));
          border-color: rgba(212, 175, 55, 0.55);
          box-shadow: 0 24px 46px -28px rgba(212, 175, 55, 0.28);
          transform: translateY(-6px);
        }
        .landing-scope .lp-plan-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, var(--lp-gold-bright), var(--lp-gold-deep));
          color: var(--lp-carbon);
          font-size: 10px;
          font-weight: 900;
          padding: 5px 12px;
          border-radius: 999px;
          letter-spacing: 1px;
          box-shadow: 0 8px 20px -6px rgba(212, 175, 55, 0.55);
        }
        .landing-scope .lp-plan-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .landing-scope .lp-plan-shield {
          width: 44px;
          height: 50px;
          background: linear-gradient(135deg, var(--lp-forest), var(--lp-grass));
          clip-path: polygon(50% 0, 100% 20%, 100% 75%, 50% 100%, 0 75%, 0 20%);
          display: grid;
          place-items: center;
          color: var(--lp-gold-bright);
          font-weight: 900;
          font-size: 14px;
          flex-shrink: 0;
        }
        .landing-scope .lp-plan-name {
          font-size: 13px;
          font-weight: 800;
          color: var(--lp-cream);
          letter-spacing: 1px;
        }
        .landing-scope .lp-plan-divisions {
          font-size: 11px;
          color: rgba(245, 239, 224, 0.62);
          margin-top: 2px;
        }
        .landing-scope .lp-plan-price {
          padding: 16px 0 8px;
          border-top: 1px solid rgba(212, 175, 55, 0.15);
          border-bottom: 1px solid rgba(212, 175, 55, 0.08);
        }
        .landing-scope .lp-plan-amount {
          display: flex;
          align-items: flex-start;
          gap: 3px;
          color: var(--lp-cream);
        }
        .landing-scope .lp-plan-currency {
          font-size: 18px;
          margin-top: 8px;
          color: var(--lp-gold);
        }
        .landing-scope .lp-plan-num {
          font-size: 34px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .landing-scope .lp-plan-mxn {
          font-size: 11px;
          color: rgba(245, 239, 224, 0.58);
          margin-top: 6px;
          margin-left: 4px;
        }
        .landing-scope .lp-plan-period {
          font-size: 12px;
          color: rgba(245, 239, 224, 0.62);
          margin-top: 4px;
        }
        .landing-scope .lp-plan-savings {
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: var(--lp-grass-bright);
          background: rgba(76, 175, 80, 0.12);
          padding: 4px 10px;
          border-radius: 999px;
        }

        @media (max-width: 1100px) {
          .landing-scope .lp-plans-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 720px) {
          .landing-scope .lp-plans-grid { grid-template-columns: repeat(2, 1fr); }
          .landing-scope .lp-cycle-btn { min-width: 100px; padding: 10px 14px; }
        }
        @media (max-width: 560px) {
          .landing-scope .lp-cycle-toggle {
            display: grid;
            width: 100%;
            transform: none;
            left: auto;
          }
          .landing-scope .lp-cycle-btn {
            min-width: 0;
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .landing-scope .lp-plans-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
