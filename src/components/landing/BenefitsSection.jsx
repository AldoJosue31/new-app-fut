// src/components/landing/BenefitsSection.jsx
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";

const BENEFIT_EXTRA = [
  {
    icon: "mdi:shield-check",
    color: "#1CB0F6",
    bigStat: "100%",
    statLabel: "en la nube",
    bullets: ["Acceso desde cualquier dispositivo", "Sin instalar nada", "Backup automático diario", "Multi-usuario por liga"],
  },
  {
    icon: "mdi:chart-line-up",
    color: "#2ed573",
    bigStat: "∞",
    statLabel: "escalabilidad",
    bullets: ["Crece sin límites de equipos", "Agrega divisiones fácilmente", "Historial permanente", "Datos históricos por temporada"],
  },
  {
    icon: "mdi:lock",
    color: "#EC4899",
    bigStat: "256",
    statLabel: "bits cifrado",
    bullets: ["Datos cifrados en tránsito", "Acceso por roles", "Registro de auditoría", "Privacidad de jugadores"],
  },
];

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

export default function BenefitsSection() {
  const { benefits } = landingCopy;
  const [hRef, hVisible] = useReveal();

  return (
    <Section id="ventajas">
      <BgOrb style={{ top: "10%", left: "-5%" }} />
      <BgOrb style={{ bottom: "10%", right: "-5%", background: "radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)" }} />

      <div className="lp-container" style={{ position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <SectionHeader ref={hRef} className={hVisible ? "visible" : ""}>
          <h2 className="lp-h2">{benefits.title}</h2>
          <SectionLead>Tu liga merece herramientas modernas. Olvídate de los grupos de WhatsApp y las hojas de cálculo.</SectionLead>
        </SectionHeader>

        {/* CARDS GRID */}
        <BenGrid>
          {BENEFIT_EXTRA.map((b, i) => (
            <BenCard
              key={i}
              accentcolor={b.color}
              className={hVisible ? "visible" : ""}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <BenCardTop accentcolor={b.color}>
                <BigStat>
                  <span className="stat-num">{b.bigStat}</span>
                  <span className="stat-label">{b.statLabel}</span>
                </BigStat>
                <BenIcon><Icon icon={b.icon} /></BenIcon>
              </BenCardTop>

              <BenCardBody>
                <h3 className="ben-title">{benefits.cards[i]?.title || "Beneficio"}</h3>
                <p className="ben-text">{benefits.cards[i]?.text || ""}</p>
                <BulletList accentcolor={b.color}>
                  {b.bullets.map((bullet) => (
                    <li key={bullet}>
                      <span className="bullet-dot" />
                      {bullet}
                    </li>
                  ))}
                </BulletList>
              </BenCardBody>
            </BenCard>
          ))}
        </BenGrid>

        {/* COMPARATIVA */}
        <CompareSection className={hVisible ? "visible" : ""}>
          <CompareTitle>¿Por qué Bracket App y no una hoja de cálculo?</CompareTitle>
          <CompareGrid>
            <CompareCol bad>
              <ColHeader>❌ Excel / WhatsApp</ColHeader>
              {["Errores manuales de cálculo", "Difícil de compartir", "Sin historial de cambios", "Solo tú puedes editarlo", "Imposible en móvil"].map(t => (
                <CompareItem key={t} bad>{t}</CompareItem>
              ))}
            </CompareCol>
            <CompareDivider />
            <CompareCol>
              <ColHeader>✅ Bracket App</ColHeader>
              {["Cálculo automático e instantáneo", "Enlace público compartible", "Historial completo por partido", "Multi-usuario con roles", "100% responsive en móvil"].map(t => (
                <CompareItem key={t}>{t}</CompareItem>
              ))}
            </CompareCol>
          </CompareGrid>
        </CompareSection>
      </div>
    </Section>
  );
}

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

const BgOrb = styled.div`
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(28, 176, 246, 0.07) 0%, transparent 70%);
  border-radius: 50%;
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
  max-width: 520px;
`;

const BenGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: clamp(32px, 4vh, 56px);

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const BenCard = styled.div`
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  border-radius: 24px;
  overflow: hidden;
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.6s ease, transform 0.6s ease, border-color 200ms, box-shadow 200ms;

  &.visible { opacity: 1; transform: none; }
  &:hover {
    border-color: ${({ accentcolor }) => accentcolor}55;
    box-shadow: 0 20px 48px -16px ${({ accentcolor }) => accentcolor}22;
    transform: translateY(-4px);
  }
`;

const BenCardTop = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 28px;
  background: ${({ accentcolor }) => accentcolor}0D;
  border-bottom: 1px solid ${({ accentcolor }) => accentcolor}22;
`;

const BigStat = styled.div`
  display: flex;
  flex-direction: column;

  .stat-num {
    font-size: 52px;
    font-weight: 900;
    color: var(--lp-text);
    line-height: 1;
    letter-spacing: -0.04em;
  }
  .stat-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--lp-text-muted);
    margin-top: 4px;
  }
`;

const BenIcon = styled.div`
  font-size: 40px;
  line-height: 1;
`;

const BenCardBody = styled.div`
  padding: 24px 28px;

  .ben-title { font-size: 20px; font-weight: 800; color: var(--lp-text); margin: 0 0 8px; }
  .ben-text  { font-size: 14px; color: var(--lp-text-muted); line-height: 1.6; margin: 0 0 20px; }
`;

const BulletList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--lp-text-muted);
  }

  .bullet-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ accentcolor }) => accentcolor};
    flex-shrink: 0;
  }
`;

const CompareSection = styled.div`
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s;
  &.visible { opacity: 1; transform: none; }
`;

const CompareTitle = styled.h3`
  font-size: 22px;
  font-weight: 800;
  color: var(--lp-text);
  text-align: center;
  margin: 0 0 32px;
`;

const CompareGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  border-radius: 20px;
  overflow: hidden;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    ${CompareDivider} { display: none; }
  }
`;

const CompareCol = styled.div`
  padding: 24px 28px;
  background: ${({ bad }) => bad ? "rgba(255, 107, 107, 0.04)" : "rgba(46, 213, 115, 0.04)"};
`;

const ColHeader = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: var(--lp-text);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--lp-border);
`;

const CompareDivider = styled.div`
  width: 1px;
  background: var(--lp-border);
`;

const CompareItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ bad }) => bad ? "#ff6b6b" : "#2ed573"};
  border-bottom: 1px solid var(--lp-border);
  &:last-child { border-bottom: none; }
`;
