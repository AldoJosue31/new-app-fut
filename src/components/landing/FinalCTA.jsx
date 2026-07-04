// src/components/landing/FinalCTA.jsx
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Link } from "react-router-dom";
import { landingCopy } from "../../pages/landing/copy";

function useReveal() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

const FEATURES_CHECKLIST = [
  "Sin tarjeta de crédito para empezar",
  "Acceso completo durante el período de prueba",
  "Calendario automático desde el primer día",
  "Soporte en español incluido",
  "Cancela cuando quieras, sin penalizaciones",
  "Exporta tus datos en cualquier momento",
];

export default function FinalCTA() {
  const { finalCta } = landingCopy;
  const [hRef, hVisible] = useReveal();

  return (
    <Section>
      <BgMesh />
      <div className="lp-container" style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <CTACard ref={hRef} className={hVisible ? "visible" : ""}>
          {/* Decoración de fondo */}
          <CardDecor1 />
          <CardDecor2 />

          <CardBody>
            {/* Left */}
            <CTALeft>
              <CTAEyebrow>Empieza hoy</CTAEyebrow>
              <h2 className="cta-title">{finalCta.title}</h2>
              <p className="cta-subtitle">{finalCta.subtitle}</p>

              <ChecklistGrid>
                {FEATURES_CHECKLIST.map((f) => (
                  <CheckItem key={f}>
                    <CheckMark>✓</CheckMark>
                    {f}
                  </CheckItem>
                ))}
              </ChecklistGrid>

              <CTABtns>
                <Link to="/login" className="lp-btn lp-btn-primary" id="final-cta-primary">
                  {finalCta.ctaPrimary} →
                </Link>
                <a href="#planes" className="lp-btn lp-btn-ghost" id="final-cta-secondary">
                  Ver planes
                </a>
              </CTABtns>

              <TrustLine>
                <TrustBadge>🔒 Seguro</TrustBadge>
                <TrustBadge>☁️ En la nube</TrustBadge>
                <TrustBadge>📱 Mobile-first</TrustBadge>
              </TrustLine>
            </CTALeft>

            {/* Right: mini stats */}
            <CTARight>
              <StatsPanel>
                <StatBig>
                  <span className="sb-num">+120</span>
                  <span className="sb-label">Ligas activas</span>
                </StatBig>
                <StatBig>
                  <span className="sb-num">+1,800</span>
                  <span className="sb-label">Equipos registrados</span>
                </StatBig>
                <StatBig>
                  <span className="sb-num">+42k</span>
                  <span className="sb-label">Partidos jugados</span>
                </StatBig>
                <StatBig>
                  <span className="sb-num">99.9%</span>
                  <span className="sb-label">Disponibilidad</span>
                </StatBig>
              </StatsPanel>

              <QuoteBox>
                <QuoteText>"La mejor inversión que hicimos para nuestra liga."</QuoteText>
                <QuoteAuthor>— Aldo García, Liga Municipal</QuoteAuthor>
              </QuoteBox>
            </CTARight>
          </CardBody>
        </CTACard>
      </div>
    </Section>
  );
}

// ─── KEYFRAMES ───────────────────────────
const rotateSlow = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const gradientPulse = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50%       { background-position: 100% 50%; }
`;

// ─── STYLED ──────────────────────────────
const Section = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 100px 0;
  background: var(--lp-surface);
  overflow: hidden;
`;

const BgMesh = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(28, 176, 246, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 50%, rgba(99, 102, 241, 0.06) 0%, transparent 50%);
  pointer-events: none;
`;

const CTACard = styled.div`
  position: relative;
  border-radius: 28px;
  background: var(--lp-bg);
  border: 1px solid var(--lp-border);
  overflow: hidden;
  box-shadow: 0 32px 64px -24px rgba(0,0,0,0.3);
  opacity: 0;
  transform: translateY(32px);
  transition: opacity 0.8s ease, transform 0.8s ease;
  &.visible { opacity: 1; transform: none; }
`;

const CardDecor1 = styled.div`
  position: absolute;
  top: -100px;
  right: -100px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(28, 176, 246, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
`;

const CardDecor2 = styled.div`
  position: absolute;
  bottom: -80px;
  left: -80px;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
`;

const CardBody = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 0;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const CTALeft = styled.div`
  padding: 56px 48px;
  border-right: 1px solid var(--lp-border);

  .cta-title {
    font-size: clamp(32px, 4vw, 52px);
    font-weight: 900;
    color: var(--lp-text);
    margin: 8px 0 16px;
    line-height: 1.05;
    letter-spacing: -0.03em;
  }
  .cta-subtitle {
    font-size: 17px;
    color: var(--lp-text-muted);
    margin: 0 0 36px;
    line-height: 1.6;
  }

  @media (max-width: 900px) {
    padding: 40px 28px;
    border-right: none;
    border-bottom: 1px solid var(--lp-border);
  }
`;

const CTAEyebrow = styled.p`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--lp-primary);
  margin: 0;
`;

const ChecklistGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 24px;
  margin-bottom: 36px;

  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const CheckItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--lp-text-muted);
`;

const CheckMark = styled.span`
  font-size: 11px;
  font-weight: 900;
  color: #2ed573;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(46, 213, 115, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const CTABtns = styled.div`
  display: flex;
  gap: 14px;
  margin-bottom: 28px;
  flex-wrap: wrap;
`;

const TrustLine = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const TrustBadge = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: var(--lp-text-muted);
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  padding: 5px 12px;
  border-radius: 100px;
`;

const CTARight = styled.div`
  padding: 56px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;

  @media (max-width: 900px) { padding: 32px 28px; }
`;

const StatsPanel = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const StatBig = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  border-radius: 16px;
  transition: border-color 150ms;

  &:hover { border-color: rgba(28, 176, 246, 0.3); }

  .sb-num { font-size: 28px; font-weight: 900; color: var(--lp-text); letter-spacing: -0.02em; }
  .sb-label { font-size: 12px; font-weight: 600; color: var(--lp-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
`;

const QuoteBox = styled.div`
  padding: 20px 24px;
  background: rgba(28, 176, 246, 0.06);
  border: 1px solid rgba(28, 176, 246, 0.2);
  border-radius: 16px;
`;

const QuoteText = styled.p`
  font-size: 15px;
  font-weight: 600;
  font-style: italic;
  color: var(--lp-text);
  margin: 0 0 8px;
  line-height: 1.5;
`;

const QuoteAuthor = styled.p`
  font-size: 12px;
  font-weight: 700;
  color: var(--lp-primary);
  margin: 0;
`;
