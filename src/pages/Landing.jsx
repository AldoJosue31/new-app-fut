// src/pages/Landing.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import "./landing/tokens.css";
import { useThemeStore } from "../store/ThemeStore";
import { v } from "../styles/variables";

// Componentes de la Landing
import LandingHeader from "../components/landing/LandingHeader";
import HeroSection from "../components/landing/HeroSection";
import FeaturesStrip from "../components/landing/FeaturesStrip";
import HowItWorks from "../components/landing/HowItWorks";
import BenefitsSection from "../components/landing/BenefitsSection";
import TestimonialSection from "../components/landing/TestimonialSection";
import PricingSection from "../components/landing/PricingSection";
import FAQSection from "../components/landing/FAQSection";
import FinalCTA from "../components/landing/FinalCTA";
import LandingFooter from "../components/landing/LandingFooter";

// COMPONENTES REALES DE LA APP PARA EL PREVIEW
import { TeamCard } from "../components/organismos/equipos/TeamCard";

// --- ANIMACIONES SCROLL ---
const ScrollReveal = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`lp-reveal ${isVisible ? "is-visible" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

// --- PREVIEW EN VIVO DE LA APP ---
const LiveAppPreview = () => {
  // Usamos datos de demostración vibrantes para ilustrar el componente real
  const mockTeam = {
    id: "demo-1",
    name: "AFC Kravitt",
    color: "#F9743B",
    logo_url: v.logo,
    delegate_name: "Aldo García",
    status: "Activo",
    players: new Array(15).fill({}),
  };

  return (
    <PreviewWrapper>
      <div className="lp-container">
        <h2 className="lp-h2" style={{ textAlign: 'center' }}>Así se ve tu liga por dentro</h2>
        <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto 40px' }}>
          No usamos imágenes falsas. Experimenta la misma interfaz limpia y profesional que verán tú y tus equipos.
        </p>
        
        <AppWindow>
          <div className="window-header">
            <span className="dot close"></span>
            <span className="dot min"></span>
            <span className="dot max"></span>
          </div>
          <div className="window-body">
             {/* Renderizamos el componente real de tu App */}
             <TeamCard 
               team={mockTeam} 
               onClick={() => {}} 
               onDelete={() => {}} 
               onEdit={() => {}} 
             />
          </div>
        </AppWindow>
      </div>
    </PreviewWrapper>
  );
};

export default function Landing() {
  const { theme, themeStyle } = useThemeStore();

  const landingVars = useMemo(() => {
    return {
      "--lp-primary": themeStyle.primary,
      "--lp-bg": themeStyle.bgtotal,
      "--lp-surface": themeStyle.bgcards,
      "--lp-text": themeStyle.text,
      "--lp-text-muted": themeStyle.colorSubtitle,
      "--lp-border": themeStyle.bg4,
      "--lp-shadow": theme === 'dark' ? "0 24px 48px -12px rgba(0,0,0,0.5)" : "0 24px 48px -12px rgba(28, 176, 246, 0.15)",
    };
  }, [theme, themeStyle]);

  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = landingVars["--lp-bg"];
    return () => {
      document.body.style.background = prev;
    };
  }, [landingVars]);

  return (
    <div className="landing-scope" data-theme={theme} style={landingVars}>
      {/* Puedes pasarle v.logo a tu LandingHeader si lo recibe por props */}
      <LandingHeader logo={v.logo} /> 
      
      <main>
        <ScrollReveal delay={0}><HeroSection /></ScrollReveal>
        <ScrollReveal delay={100}><FeaturesStrip /></ScrollReveal>
        <ScrollReveal delay={150}><HowItWorks /></ScrollReveal>
        
        {/* Reemplazamos el ProductShowcase genérico por el interactivo */}
        <ScrollReveal delay={150}>
          <LiveAppPreview />
        </ScrollReveal>
        
        <ScrollReveal delay={150}><BenefitsSection /></ScrollReveal>
        <ScrollReveal delay={150}><TestimonialSection /></ScrollReveal>
        <ScrollReveal delay={150}><PricingSection /></ScrollReveal>
        <ScrollReveal delay={150}><FAQSection /></ScrollReveal>
        <ScrollReveal delay={100}><FinalCTA /></ScrollReveal>
      </main>
      
      <LandingFooter />
    </div>
  );
}

const PreviewWrapper = styled.section`
  padding: 80px 0;
  background: var(--lp-bg);
`;

const AppWindow = styled.div`
  max-width: 500px;
  margin: 0 auto;
  background: var(--lp-surface);
  border-radius: 16px;
  box-shadow: var(--lp-shadow);
  border: 1px solid var(--lp-border);
  overflow: hidden;

  .window-header {
    background: var(--lp-bg);
    padding: 12px 16px;
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--lp-border);
    
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      &.close { background: #ff5f56; }
      &.min { background: #ffbd2e; }
      &.max { background: #27c93f; }
    }
  }

  .window-body {
    padding: 30px;
    display: flex;
    justify-content: center;
    background: var(--lp-bg);
  }
`;