// src/components/landing/FeaturesStrip.jsx
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";

const ICONS = {
  trophy:   "mdi:trophy-variant",
  team:     "mdi:account-group",
  calendar: "mdi:calendar-check",
  chart:    "mdi:chart-bar",
};

const FEATURE_DETAILS = {
  trophy:   { color: "#FFD700", preview: ["Liguilla", "Torneo doble", "Repechaje automático", "Bracket visual"] },
  team:     { color: "#1CB0F6", preview: ["Plantillas ilimitadas", "Control de dorsales", "Foto de jugador", "Transferencias"] },
  calendar: { color: "#2ed573", preview: ["Cédulas imprimibles", "Resultados en línea", "Historial de partidos", "Árbitros asignados"] },
  chart:    { color: "#EC4899", preview: ["Tabla en tiempo real", "Goleadores", "Tarjetas", "Exportar PDF"] },
};

function useReveal() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

export default function FeaturesStrip() {
  const { features } = landingCopy;
  const [hovered, setHovered] = useState(null);
  const [sRef, sVisible] = useReveal();

  return (
    <Section id="producto">
      {/* Glow de fondo */}
      <BgGlow />

      <div className="lp-container" style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <SectionHeader ref={sRef} className={sVisible ? "visible" : ""}>
          <h2 className="lp-h2">{features.title}</h2>
          <SectionLead>Cada herramienta diseñada para que organices tu liga con precisión profesional, sin complicaciones técnicas.</SectionLead>
        </SectionHeader>

        {/* Grid de Features */}
        <FeatGrid>
          {features.items.map((item, i) => {
            const detail = FEATURE_DETAILS[item.icon];
            const isHovered = hovered === i;
            return (
              <FeatCard
                key={item.title}
                accentcolor={detail.color}
                className={sVisible ? "visible" : ""}
                style={{ transitionDelay: `${i * 80}ms` }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Resplandor interno al hover */}
                <CardGlow accentcolor={detail.color} className={isHovered ? "show" : ""} />

                <IconWrap accentcolor={detail.color}>
                  <Icon icon={ICONS[item.icon]} width={28} height={28} />
                </IconWrap>

                <CardTitle>{item.title}</CardTitle>
                <CardText>{item.text}</CardText>

                {/* Lista de detalles */}
                <DetailList>
                  {detail.preview.map((d) => (
                    <li key={d}>
                      <CheckIcon accentcolor={detail.color}>✓</CheckIcon>
                      {d}
                    </li>
                  ))}
                </DetailList>

                <CardFooter accentcolor={detail.color}>
                  Incluido en todos los planes →
                </CardFooter>
              </FeatCard>
            );
          })}
        </FeatGrid>

        {/* Banner informativo */}
        <InfoBanner>
          <span className="ib-icon">⚡</span>
          <span className="ib-text">Todas las funciones disponibles desde el primer día, sin configuración técnica</span>
        </InfoBanner>
      </div>
    </Section>
  );
}

// ─── KEYFRAMES ───────────────────────────
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const glowPulse = keyframes`
  0%, 100% { opacity: 0; }
  50%       { opacity: 0.12; }
`;

// ─── STYLED ──────────────────────────────
const Section = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: clamp(40px, 6vh, 80px) 0;
  background: var(--lp-bg);
  overflow: hidden;
  box-sizing: border-box;
  scroll-margin-top: 40px;
`;

const BgGlow = styled.div`
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(28, 176, 246, 0.06) 0%, transparent 70%);
  pointer-events: none;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 700px;
  margin: 0 auto clamp(40px, 6vh, 72px);
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
  &.visible { opacity: 1; transform: none; }
`;



const SectionLead = styled.p`
  font-size: 17px;
  color: var(--lp-text-muted);
  line-height: 1.65;
  margin: 12px auto 0;
  max-width: 560px;
`;

const FeatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 1100px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px)  { grid-template-columns: 1fr; }
`;

const FeatCard = styled.div`
  position: relative;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  border-radius: 20px;
  padding: 32px 28px;
  overflow: hidden;
  cursor: default;
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease,
    border-color 200ms ease,
    box-shadow 200ms ease;

  &.visible {
    opacity: 1;
    transform: none;
  }

  &:hover {
    border-color: ${({ accentcolor }) => accentcolor}55;
    box-shadow: 0 20px 48px -16px ${({ accentcolor }) => accentcolor}33;
    transform: translateY(-4px);
  }
`;

const CardGlow = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ accentcolor }) => accentcolor};
  opacity: 0;
  transition: opacity 300ms ease;
  pointer-events: none;
  &.show { opacity: 0.05; }
`;

const IconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: ${({ accentcolor }) => accentcolor}1A;
  border: 1px solid ${({ accentcolor }) => accentcolor}33;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ accentcolor }) => accentcolor};
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  font-size: 20px;
  font-weight: 800;
  color: var(--lp-text);
  margin: 0 0 10px;
`;

const CardText = styled.p`
  font-size: 14px;
  color: var(--lp-text-muted);
  line-height: 1.6;
  margin: 0 0 24px;
`;

const DetailList = styled.ul`
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--lp-text-muted);
  }
`;

const CheckIcon = styled.span`
  font-size: 11px;
  font-weight: 900;
  color: ${({ accentcolor }) => accentcolor};
  flex-shrink: 0;
`;

const CardFooter = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ accentcolor }) => accentcolor};
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid var(--lp-border);
`;

const InfoBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: clamp(28px, 4vh, 56px);
  padding: 18px 32px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  border-radius: 14px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;

  .ib-icon { font-size: 20px; }
  .ib-text { font-size: 14px; font-weight: 600; color: var(--lp-text-muted); }
`;
