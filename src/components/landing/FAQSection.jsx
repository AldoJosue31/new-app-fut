import React, { useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";

export default function FAQSection() {
  const { faq } = landingCopy;
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section
      id="faq"
      style={{
        padding: "120px 0",
        background: "var(--lp-forest)",
      }}
    >
      <div className="lp-container" style={{ maxWidth: 900 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span className="lp-eyebrow" style={{ justifyContent: "center" }}>
            {faq.eyebrow}
          </span>
          <h2 className="lp-h2">{faq.title}</h2>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {faq.items.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                style={{
                  border: `1px solid ${
                    isOpen
                      ? "rgba(212, 175, 55, 0.45)"
                      : "rgba(212, 175, 55, 0.15)"
                  }`,
                  borderRadius: "var(--lp-radius)",
                  background: isOpen
                    ? "linear-gradient(180deg, rgba(212, 175, 55, 0.06), transparent)"
                    : "rgba(245, 239, 224, 0.02)",
                  overflow: "hidden",
                  transition:
                    "border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease",
                  boxShadow: isOpen
                    ? "0 16px 30px -24px rgba(0, 0, 0, 0.32)"
                    : "none",
                }}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? -1 : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 20,
                    padding: "22px 26px",
                    background: "transparent",
                    border: "none",
                    color: "var(--lp-cream)",
                    fontSize: 16,
                    fontWeight: 700,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span>{item.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      display: "grid",
                      placeItems: "center",
                      minWidth: 32,
                      height: 32,
                      borderRadius: 10,
                      background: isOpen
                        ? "linear-gradient(135deg, var(--lp-gold-bright), var(--lp-gold-deep))"
                        : "rgba(245, 239, 224, 0.08)",
                      color: isOpen ? "var(--lp-carbon)" : "var(--lp-gold)",
                    }}
                  >
                    <Icon icon="mdi:plus" width={18} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: "hidden" }}
                    >
                      <p
                        style={{
                          padding: "0 26px 24px",
                          margin: 0,
                          color: "rgba(245, 239, 224, 0.8)",
                          fontSize: 15,
                          lineHeight: 1.65,
                        }}
                      >
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
