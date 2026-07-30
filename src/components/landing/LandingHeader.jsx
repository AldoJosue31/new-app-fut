import React, { useEffect, useState, useRef } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../views/landing/copy";

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

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 900) setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [open]);

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
          <a
            href="/login"
            className="lp-btn lp-btn-ghost"
            style={{ padding: "10px 18px", fontSize: 13 }}
          >
            {landingCopy.nav.ctaLogin}
          </a>
          <a
            href="/login"
            className="lp-btn lp-btn-primary"
            style={{ padding: "10px 20px", fontSize: 13 }}
          >
            {landingCopy.nav.ctaStart}
          </a>
          
          <button
            type="button"
            onClick={() => setOpen((currentOpen) => !currentOpen)}
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
            aria-controls="landing-mobile-nav"
            aria-expanded={open}
            aria-label={open ? "Cerrar menú" : "Menú"}
          >
            <Icon icon={open ? "mdi:close" : "mdi:menu"} width={24} />
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="landing-mobile-nav"
          aria-label="Navegación móvil"
          className="lp-nav-mobile"
        >
          {landingCopy.nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="lp-nav-mobile-link"
              onClick={() => {
                setActiveSection(link.href.replace("#", ""));
                setOpen(false);
              }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="lp-nav-mobile-login"
            onClick={() => setOpen(false)}
          >
            {landingCopy.nav.ctaLogin}
          </a>
        </nav>
      )}

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
        .landing-scope .lp-nav-mobile {
          position: absolute;
          top: 66px;
          left: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px;
          border: 1px solid var(--lp-border);
          border-radius: 14px;
          background: var(--lp-surface);
        }
        .landing-scope .lp-nav-mobile-link,
        .landing-scope .lp-nav-mobile-login {
          min-height: 44px;
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-radius: 10px;
          color: var(--lp-text);
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }
        .landing-scope .lp-nav-mobile-link:hover,
        .landing-scope .lp-nav-mobile-login:hover {
          background: var(--lp-bg);
          color: var(--lp-primary);
        }
        .landing-scope .lp-nav-mobile-login {
          margin-top: 4px;
          border-top: 1px solid var(--lp-border);
          border-radius: 0 0 10px 10px;
          color: var(--lp-primary);
        }
        .landing-scope .lp-nav-mobile-toggle:focus-visible,
        .landing-scope .lp-nav-mobile-link:focus-visible,
        .landing-scope .lp-nav-mobile-login:focus-visible {
          outline: 3px solid var(--lp-primary);
          outline-offset: 2px;
        }
        @media (max-width: 900px) {
          .landing-scope .lp-nav-desktop { display: none !important; }
          .landing-scope .lp-nav-mobile-toggle { display: inline-flex !important; }
        }
        @media (min-width: 901px) {
          .landing-scope .lp-nav-mobile { display: none !important; }
        }
        @media (max-width: 640px) {
          .landing-scope .lp-btn-ghost { display: none !important; }
        }
      `}</style>
    </motion.header>
  );
}
