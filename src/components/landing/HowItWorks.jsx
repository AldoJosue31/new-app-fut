// src/components/landing/HowItWorks.jsx
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { landingCopy } from "../../pages/landing/copy";

const STEP_ICONS = ["⚙️", "👥", "📅"];
const STEP_COLORS = ["#1CB0F6", "#2ed573", "#EC4899"];
const STEP_DETAILS = [
  ["Define el nombre y logo de tu liga", "Elige el formato del torneo", "Establece reglas de puntuación", "Configura categorías y divisiones"],
  ["Agrega equipos con su color y delegado", "Registra jugadores con foto y datos", "Asigna dorsales automáticamente", "Valida documentación desde el panel"],
  ["El sistema genera el calendario solo", "Comparte el enlace público con tu liga", "Los resultados se actualizan en tiempo real", "Exporta tablas y cédulas con un clic"],
];

function useReveal(threshold = 0.1) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

export default function HowItWorks() {
  const { howItWorks } = landingCopy;
  const [hRef, hVisible] = useReveal();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Section id="como-funciona">
      <BgGrid />
      <div className="lp-container" style={{ position: "relative", zIndex: 1 }}>

        {/* HEADER */}
        <SectionHeader ref={hRef} className={hVisible ? "visible" : ""}>
          <SectionEyebrow>Proceso</SectionEyebrow>
          <h2 className="lp-h2">{howItWorks.title}</h2>
          <SectionLead>Sin curva de aprendizaje. Configura tu primera jornada en menos de 10 minutos.</SectionLead>
        </SectionHeader>

        {/* STEPS LAYOUT */}
        <StepsLayout>
          {/* Columna izquierda: tabs de pasos */}
          <StepTabs>
            {howItWorks.steps.map((s, i) => (
              <StepTab
                key={s.n}
                isactive={activeStep === i ? "true" : undefined}
                accentcolor={STEP_COLORS[i]}
                onClick={() => setActiveStep(i)}
                className={hVisible ? "visible" : ""}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <StepNum isactive={activeStep === i ? "true" : undefined} accentcolor={STEP_COLORS[i]}>
                  {s.n}
                </StepNum>
                <StepMeta>
                  <span className="step-icon">{STEP_ICONS[i]}</span>
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-desc">{s.text}</p>
                </StepMeta>
              </StepTab>
            ))}

            {/* Línea de progreso */}
            <ProgressLine>
              <ProgressFill style={{ height: `${((activeStep + 1) / howItWorks.steps.length) * 100}%` }} />
            </ProgressLine>
          </StepTabs>

          {/* Columna derecha: detalle del paso activo */}
          <StepDetail>
            <DetailCard accentcolor={STEP_COLORS[activeStep]}>
              <DetailCardHeader accentcolor={STEP_COLORS[activeStep]}>
                <span className="step-num-big">{howItWorks.steps[activeStep].n}</span>
                <span className="step-name">{howItWorks.steps[activeStep].title}</span>
              </DetailCardHeader>

              <DetailBody>
                {STEP_DETAILS[activeStep].map((detail, i) => (
                  <DetailItem key={i} accentcolor={STEP_COLORS[activeStep]}>
                    <span className="detail-idx">{i + 1}</span>
                    <span>{detail}</span>
                  </DetailItem>
                ))}
              </DetailBody>

              {/* Mini ilustracion de pantalla de app */}
              <MiniAppScreen accentcolor={STEP_COLORS[activeStep]}>
                <div className="screen-bar">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                  <span className="screen-title">Bracket App</span>
                </div>
                <div className="screen-body">
                  <ScreenItem accentcolor={STEP_COLORS[activeStep]}>
                    <span className="si-icon">{STEP_ICONS[activeStep]}</span>
                    <span className="si-text">Paso {howItWorks.steps[activeStep].n} — {howItWorks.steps[activeStep].title}</span>
                    <span className="si-badge">Listo ✓</span>
                  </ScreenItem>
                </div>
              </MiniAppScreen>
            </DetailCard>

            {/* Nav botones */}
            <StepNav>
              <NavBtn
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
              >← Anterior</NavBtn>
              <NavDots>
                {howItWorks.steps.map((_, i) => (
                  <NavDot key={i} active={i === activeStep ? "true" : undefined} onClick={() => setActiveStep(i)} />
                ))}
              </NavDots>
              <NavBtn
                onClick={() => setActiveStep(Math.min(howItWorks.steps.length - 1, activeStep + 1))}
                disabled={activeStep === howItWorks.steps.length - 1}
              >Siguiente →</NavBtn>
            </StepNav>
          </StepDetail>
        </StepsLayout>
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
  padding: 100px 0;
  background: var(--lp-surface);
  overflow: hidden;
`;

const BgGrid = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(28, 176, 246, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(28, 176, 246, 0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 700px;
  margin: 0 auto 72px;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
  &.visible { opacity: 1; transform: none; }
`;

const SectionEyebrow = styled.p`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--lp-primary);
  margin: 0 0 12px;
`;

const SectionLead = styled.p`
  font-size: 17px;
  color: var(--lp-text-muted);
  line-height: 1.65;
  margin: 12px auto 0;
  max-width: 520px;
`;

const StepsLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 48px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StepTabs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  padding-left: 24px;
`;

const ProgressLine = styled.div`
  position: absolute;
  left: 0;
  top: 24px;
  bottom: 24px;
  width: 3px;
  background: var(--lp-border);
  border-radius: 3px;
`;

const ProgressFill = styled.div`
  width: 100%;
  background: var(--lp-primary);
  border-radius: 3px;
  transition: height 0.4s ease;
`;

const StepTab = styled.div`
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 16px;
  border: 1px solid ${({ isactive, accentcolor }) => isactive ? `${accentcolor}44` : "var(--lp-border)"};
  background: ${({ isactive, accentcolor }) => isactive ? `${accentcolor}0D` : "transparent"};
  cursor: pointer;
  transition: all 200ms ease;
  opacity: 0;
  transform: translateX(-20px);

  &.visible { opacity: 1; transform: none; }
  &:hover {
    border-color: ${({ accentcolor }) => accentcolor}44;
    background: ${({ accentcolor }) => accentcolor}0D;
  }

  .step-icon { font-size: 22px; }
  .step-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--lp-text);
    margin: 0 0 4px;
  }
  .step-desc {
    font-size: 13px;
    color: var(--lp-text-muted);
    margin: 0;
    line-height: 1.5;
  }
`;

const StepNum = styled.div`
  font-size: 28px;
  font-weight: 900;
  color: ${({ isactive, accentcolor }) => isactive ? accentcolor : "var(--lp-text-muted)"};
  min-width: 48px;
  line-height: 1;
  letter-spacing: -0.03em;
  transition: color 200ms;
`;

const StepMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StepDetail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DetailCard = styled.div`
  background: var(--lp-bg);
  border: 1px solid ${({ accentcolor }) => `${accentcolor}33`};
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 48px -16px rgba(0,0,0,0.2);
`;

const DetailCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 28px;
  background: ${({ accentcolor }) => `${accentcolor}11`};
  border-bottom: 1px solid ${({ accentcolor }) => `${accentcolor}22`};

  .step-num-big {
    font-size: 48px;
    font-weight: 900;
    color: ${({ accentcolor }) => accentcolor};
    line-height: 1;
    letter-spacing: -0.04em;
  }
  .step-name {
    font-size: 22px;
    font-weight: 800;
    color: var(--lp-text);
  }
`;

const DetailBody = styled.div`
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--lp-surface);
  border-radius: 10px;
  border: 1px solid var(--lp-border);
  font-size: 14px;
  font-weight: 600;
  color: var(--lp-text);
  transition: border-color 150ms;

  &:hover { border-color: ${({ accentcolor }) => accentcolor}44; }

  .detail-idx {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: ${({ accentcolor }) => accentcolor}1A;
    color: ${({ accentcolor }) => accentcolor};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 12px;
    flex-shrink: 0;
  }
`;

const MiniAppScreen = styled.div`
  margin: 0 28px 28px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  border-radius: 12px;
  overflow: hidden;

  .screen-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    background: var(--lp-bg);
    border-bottom: 1px solid var(--lp-border);
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--lp-border); }
    .screen-title { font-size: 11px; color: var(--lp-text-muted); font-weight: 600; margin-left: 6px; }
  }
  .screen-body { padding: 14px; }
`;

const ScreenItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: ${({ accentcolor }) => accentcolor}11;
  border: 1px solid ${({ accentcolor }) => accentcolor}33;
  border-radius: 8px;
  font-size: 13px;

  .si-icon { font-size: 16px; }
  .si-text { flex: 1; font-weight: 600; color: var(--lp-text); }
  .si-badge {
    font-size: 11px;
    font-weight: 700;
    color: #2ed573;
    background: rgba(46, 213, 115, 0.1);
    padding: 3px 8px;
    border-radius: 6px;
  }
`;

const StepNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const NavBtn = styled.button`
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid var(--lp-border);
  background: var(--lp-surface);
  color: var(--lp-text);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
  font-family: inherit;

  &:disabled { opacity: 0.35; cursor: default; }
  &:not(:disabled):hover { border-color: var(--lp-primary); color: var(--lp-primary); }
`;

const NavDots = styled.div`
  display: flex;
  gap: 8px;
`;

const NavDot = styled.div`
  width: ${({ active }) => active ? "24px" : "8px"};
  height: 8px;
  border-radius: 4px;
  background: ${({ active }) => active ? "var(--lp-primary)" : "var(--lp-border)"};
  cursor: pointer;
  transition: all 250ms ease;
`;
