import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { landingCopy } from "../../pages/landing/copy";

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isClickScrolling = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -40% 0px" }
    );

    const ids = ["top", ...landingCopy.nav.links.map(l => l.href.replace("#", ""))];
    
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
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
        transition:
          "background-color 180ms ease, border-color 180ms ease, backdrop-filter 180ms ease",
        background: scrolled ? "var(--lp-bg)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled
          ? "1px solid var(--lp-border)"
          : "1px solid transparent",
        boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.05)" : "none"
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
        {/* LOGO REAL INYECTADO AQUÍ */}
        <a
          href="#top"
          onClick={() => {
            setActiveSection("top");
            isClickScrolling.current = true;
            setTimeout(() => { isClickScrolling.current = false; }, 800);
          }}
          className="lp-brand-link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "var(--lp-text)",
          }}
        >
          <img 
            src={landingCopy.nav.logoImg} 
            alt={landingCopy.nav.logoText} 
            className="lp-brand-mark"
            style={{ height: "36px", width: "auto", objectFit: "contain" }} 
          />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>
            {landingCopy.nav.logoText}
          </span>
        </a>

        <nav className="lp-nav-desktop" style={{ display: "flex", gap: 24 }}>
          {landingCopy.nav.links.map((l) => {
            const id = l.href.replace("#", "");
            const isActive = activeSection === id;
            return (
              <a
                key={l.href}
                href={l.href}
                onClick={() => {
                  setActiveSection(id);
                  isClickScrolling.current = true;
                  setTimeout(() => { isClickScrolling.current = false; }, 800);
                }}
                className="lp-nav-link"
                style={{
                  position: "relative",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 14,
                  color: isActive ? "var(--lp-primary)" : "var(--lp-text-muted)",
                  padding: "4px 0",
                  transition: "color 200ms ease"
                }}
              >
                {l.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: "absolute",
                      bottom: -2,
                      left: 0,
                      right: 0,
                      margin: "0 auto",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: "var(--lp-primary)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </a>
            );
          })}
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
              background: "var(--lp-surface)",
              border: "1px solid var(--lp-border)",
              color: "var(--lp-text)",
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
        .landing-scope .lp-brand-mark {
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .landing-scope .lp-brand-link:hover .lp-brand-mark {
          transform: translateY(-2px) scale(1.05);
        }
        .landing-scope .lp-nav-link {
          transition: color 180ms ease;
        }
        .landing-scope .lp-nav-link:hover {
          color: var(--lp-primary) !important;
        }
        .landing-scope .lp-nav-mobile-toggle:hover {
          border-color: var(--lp-primary);
          color: var(--lp-primary);
        }
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