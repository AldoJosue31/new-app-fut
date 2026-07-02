import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";

export default function TestimonialSection() {
  const { testimonial } = landingCopy;

  return (
    <section
      style={{
        padding: "100px 0",
        background:
          "linear-gradient(180deg, var(--lp-forest-deep), var(--lp-forest))",
      }}
    >
      <div className="lp-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "clamp(36px, 4vw, 56px) clamp(24px, 4vw, 48px)",
            background:
              "linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(46, 125, 50, 0.08))",
            border: "1px solid rgba(212, 175, 55, 0.25)",
            borderRadius: "28px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Icon
            icon="mdi:format-quote-open"
            width={64}
            style={{
              color: "var(--lp-gold)",
              opacity: 0.35,
              position: "absolute",
              top: 20,
              left: 24,
            }}
          />

          <p
            style={{
              fontSize: "clamp(20px, 2.4vw, 26px)",
              fontWeight: 500,
              color: "var(--lp-cream)",
              lineHeight: 1.62,
              margin: 0,
              paddingLeft: 24,
              fontStyle: "italic",
            }}
          >
            "{testimonial.quote}"
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 32,
              paddingLeft: 24,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, var(--lp-gold-bright), var(--lp-gold-deep))",
                display: "grid",
                placeItems: "center",
                color: "var(--lp-carbon)",
                fontWeight: 900,
                fontSize: 20,
              }}
            >
              {testimonial.author
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  color: "var(--lp-cream)",
                  fontSize: 16,
                }}
              >
                {testimonial.author}
              </div>
              <div
                style={{
                  color: "rgba(245, 239, 224, 0.6)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {testimonial.role}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
