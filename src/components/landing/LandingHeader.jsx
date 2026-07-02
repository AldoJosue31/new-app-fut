import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { landingCopy } from "../../pages/landing/copy";

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "all 0.3s ease",
        background: scrolled ? "rgba(10, 42, 32, 0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(212, 175, 55, 0.15)"
          : "1px solid transparent",
      }}
    >
      <div
        className="lp-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 74,
        }}
      >
        <a
          href="#top"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "var(--lp-cream)",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--lp-gold-bright), var(--lp-gold-deep))",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              color: "var(--lp-carbon)",
              boxShadow: "0 6px 20px -6px rgba(212, 175, 55, 0.6)",
            }}
          >
            B
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.3 }}>
            {landingCopy.nav.logo}
          </span>
        </a>

        <nav className="lp-nav-desktop" style={{ display: "flex", gap: 32 }}>
          {landingCopy.nav.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                color: "rgba(245, 239, 224, 0.75)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 14,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--lp-gold-bright)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(245, 239, 224, 0.75)")
              }
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            to="/login"
            className="lp-btn lp-btn-ghost"
            style={{ padding: "10px 18px", fontSize: 13 }}
          >
            {landingCopy.nav.ctaLogin}
          </Link>
          <Link
            to="/login"
            className="lp-btn lp-btn-primary"
            style={{ padding: "10px 20px", fontSize: 13 }}
          >
            {landingCopy.nav.ctaStart}
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="lp-nav-mobile-toggle"
            style={{
              display: "none",
              background: "transparent",
              border: "1px solid rgba(245, 239, 224, 0.3)",
              color: "var(--lp-cream)",
              padding: "8px 10px",
              borderRadius: 8,
              cursor: "pointer",
            }}
            aria-label="Menú"
          >
            ☰
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .landing-scope .lp-nav-desktop { display: none !important; }
          .landing-scope .lp-nav-mobile-toggle { display: inline-flex !important; }
        }
        @media (max-width: 640px) {
          .landing-scope .lp-btn-ghost { display: none !important; }
        }
      `}</style>
    </motion.header>
  );
}
