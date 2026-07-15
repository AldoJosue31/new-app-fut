// src/components/landing/HowItWorks.jsx
import React, { useEffect, useRef, useState } from "react";
import { RiSettings3Line, RiGroupLine, RiCalendarCheckLine } from "react-icons/ri";
import { landingCopy } from "../../pages/landing/copy";

// ─── Datos estáticos por paso ──────────────────────────────────────────────
const STEP_ICONS = [RiSettings3Line, RiGroupLine, RiCalendarCheckLine];

const STEP_DETAILS = [
  [
    "Define el nombre y logo de tu liga",
    "Elige el formato del torneo",
    "Establece reglas de puntuación",
    "Configura categorías y divisiones",
  ],
  [
    "Agrega equipos con su color y delegado",
    "Registra jugadores con foto y datos",
    "Asigna dorsales automáticamente",
    "Valida documentación desde el panel",
  ],
  [
    "El sistema genera el calendario solo",
    "Comparte el enlace público con tu liga",
    "Los resultados se actualizan en tiempo real",
    "Exporta tablas y cédulas con un clic",
  ],
];

// ─── Intersection Observer hook ────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

// ─── Componente principal ──────────────────────────────────────────────────
function HowItWorksStepList({ howItWorks, activeStep, setActiveStep, hVisible }) {
  return (
    <>
          {/* ── Columna izquierda: lista de pasos ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative", paddingLeft: "20px" }}>

            {/* Línea de progreso */}
            <div
              aria-hidden="true"
              style={{ position: "absolute", left: 0, top: "20px", bottom: "20px", width: "2px", borderRadius: "9999px", background: "var(--lp-border)" }}
            >
              <div
                style={{
                  width: "100%",
                  borderRadius: "9999px",
                  height: "100%",
                  transformOrigin: "top",
                  transform: `scaleY(${(activeStep + 1) / howItWorks.steps.length})`,
                  transition: "transform 500ms ease-out",
                  background: "var(--lp-primary)",
                }}
              />
            </div>

            {howItWorks.steps.map((s, i) => {
              const Icon = STEP_ICONS[i];
              const isActive = activeStep === i;

              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setActiveStep(i)}
                  aria-pressed={isActive}
                  style={{
                    position: "relative", display: "flex", alignItems: "flex-start", gap: "16px",
                    textAlign: "left", width: "100%", borderRadius: "16px", padding: "24px",
                    border: "1px solid",
                    background: isActive ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                    borderColor: isActive ? "var(--lp-primary)" : "var(--lp-border)",
                    opacity: hVisible ? (isActive ? 1 : 0.55) : 0,
                    transform: hVisible ? "none" : "translateX(-20px)",
                    boxShadow: isActive ? "0 0 28px -8px var(--lp-primary)" : "none",
                    transition: `opacity 0.6s ${i * 120}ms ease, transform 0.6s ${i * 120}ms ease, box-shadow 0.3s ease, border-color 0.3s ease`,
                    cursor: "pointer",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                >
                  {/* Borde izquierdo acento activo */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                        width: "4px", height: "60%", borderRadius: "9999px", background: "var(--lp-primary)",
                      }}
                    />
                  )}

                  {/* Número grande */}
                  <span
                    style={{ fontWeight: 900, fontSize: "30px", lineHeight: 1, letterSpacing: "-0.04em", minWidth: "44px", color: isActive ? "var(--lp-primary)" : "var(--lp-text-muted)", transition: "color 0.3s", fontVariantNumeric: "tabular-nums" }}
                  >
                    {s.n}
                  </span>

                  {/* Icono + título + descripción */}
                  <span style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "2px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Icon
                        size={18}
                        aria-hidden="true"
                        style={{ color: isActive ? "var(--lp-primary)" : "var(--lp-text-muted)", flexShrink: 0, transition: "color 0.3s" }}
                      />
                      <span
                        style={{ fontWeight: 700, fontSize: "15px", color: isActive ? "var(--lp-text)" : "var(--lp-text-muted)", transition: "color 0.3s" }}
                      >
                        {s.title}
                      </span>
                    </span>
                    <span
                      style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--lp-text-muted)" }}
                    >
                      {s.text}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
    </>
  );
}

function HowItWorksStepDetail({ howItWorks, activeStep, setActiveStep }) {
  const activeStepData = howItWorks.steps[activeStep];
  const ActiveIcon = STEP_ICONS[activeStep];

  return (
    <>
          {/* ── Columna derecha: tarjeta de detalle ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Tarjeta glassmorphism principal */}
            <div
              style={{
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid var(--lp-border)",
                background: "rgba(255,255,255,0.05)",
                boxShadow: "var(--lp-shadow)",
              }}
            >
              {/* Header de la tarjeta */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "16px",
                  padding: "24px 28px",
                  borderBottom: "1px solid var(--lp-border)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <span
                  style={{ color: "var(--lp-primary)", fontWeight: 900, fontSize: "48px", lineHeight: 1, letterSpacing: "-0.04em" }}
                >
                  {activeStepData.n}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ActiveIcon
                      size={20}
                      aria-hidden="true"
                      style={{ color: "var(--lp-primary)", flexShrink: 0 }}
                    />
                    <span
                      style={{ fontWeight: 700, fontSize: "18px", color: "var(--lp-text)" }}
                    >
                      {activeStepData.title}
                    </span>
                  </span>
                  <span
                    style={{ fontSize: "14px", color: "var(--lp-text-muted)" }}
                  >
                    {activeStepData.text}
                  </span>
                </div>
              </div>

              {/* Lista de detalles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "24px 28px" }}>
                {STEP_DETAILS[activeStep].map((detail, i) => (
                  <div
                    key={detail}
                    style={{
                      display: "flex", alignItems: "center", gap: "16px",
                      padding: "12px 16px", borderRadius: "12px",
                      border: "1px solid var(--lp-border)",
                      fontSize: "14px", fontWeight: 600,
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--lp-text)",
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0, width: "24px", height: "24px", borderRadius: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "12px", fontWeight: 900,
                        background: "rgba(255,255,255,0.08)",
                        color: "var(--lp-primary)",
                      }}
                    >
                      {i + 1}
                    </span>
                    {detail}
                  </div>
                ))}
              </div>

              <div
                style={{ margin: "0 28px 28px", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--lp-border)" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderBottom: "1px solid var(--lp-border)", background: "rgba(0,0,0,0.2)" }}
                >
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--lp-border)", display: "inline-block" }} aria-hidden="true" />
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--lp-border)", display: "inline-block" }} aria-hidden="true" />
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--lp-border)", display: "inline-block" }} aria-hidden="true" />
                  <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 600, color: "var(--lp-text-muted)" }}>
                    Bracket App
                  </span>
                </div>
                <div style={{ padding: "12px", background: "rgba(0,0,0,0.1)" }}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px 16px", borderRadius: "8px",
                      border: "1px solid var(--lp-border)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <ActiveIcon
                      size={16}
                      aria-hidden="true"
                      style={{ color: "var(--lp-primary)", flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "var(--lp-text)" }}>
                      Paso {activeStepData.n} — {activeStepData.title}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", color: "#22c55e", background: "rgba(34,197,94,0.1)" }}>
                      Listo ✓
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Navegación: anterior / dots / siguiente ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <button
                type="button"
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                style={{
                  padding: "10px 20px", borderRadius: "12px", border: "1px solid var(--lp-border)",
                  fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  transition: "background-color 150ms ease, border-color 150ms ease, opacity 150ms ease",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--lp-text)",
                  opacity: activeStep === 0 ? 0.3 : 1,
                  fontFamily: "inherit",
                }}
              >
                ← Anterior
              </button>

              <div style={{ display: "flex", gap: "8px" }} role="tablist" aria-label="Pasos del proceso">
                {howItWorks.steps.map((step, i) => (
                  <button
                    key={step.n}
                    type="button"
                    role="tab"
                    aria-selected={i === activeStep}
                    aria-label={`Ir al paso ${i + 1}`}
                    onClick={() => setActiveStep(i)}
                    style={{
                      height: "8px", borderRadius: "9999px", cursor: "pointer",
                      transition: "transform 300ms ease, background-color 300ms ease",
                      border: "none",
                      width: "28px",
                      transform: `scaleX(${i === activeStep ? 1 : 0.2857})`,
                      background: i === activeStep ? "var(--lp-primary)" : "var(--lp-border)",
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveStep(Math.min(howItWorks.steps.length - 1, activeStep + 1))}
                disabled={activeStep === howItWorks.steps.length - 1}
                style={{
                  padding: "10px 20px", borderRadius: "12px", border: "1px solid var(--lp-border)",
                  fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  transition: "background-color 150ms ease, border-color 150ms ease, opacity 150ms ease",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--lp-text)",
                  opacity: activeStep === howItWorks.steps.length - 1 ? 0.3 : 1,
                  fontFamily: "inherit",
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
    </>
  );
}

export default function HowItWorks() {
  const { howItWorks } = landingCopy;
  const [hRef, hVisible] = useReveal();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section
      id="como-funciona"
      style={{
        background: "var(--lp-surface)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(40px, 6vh, 80px) 0",
        overflow: "hidden",
        position: "relative",
        boxSizing: "border-box",
        scrollMarginTop: "40px",
      }}
    >
      {/* ── Fondo: rejilla sutil ── */}
      <div
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(var(--lp-border) 1px, transparent 1px), linear-gradient(90deg, var(--lp-border) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          position: "absolute",
          inset: 0,
          opacity: 0.2,
          pointerEvents: "none",
        }}
      />

      {/* ── Radial glow ambiental ── */}
      <div
        aria-hidden="true"
        style={{
          background: "radial-gradient(ellipse, color-mix(in srgb, var(--lp-primary) 45%, transparent), transparent 70%)",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "640px",
          height: "320px",
          borderRadius: "50%",
          opacity: 0.04,
          pointerEvents: "none",
        }}
      />

      <div className="lp-container" style={{ position: "relative", zIndex: 10 }}>

        {/* ── Encabezado ── */}
        <div
          ref={hRef}
          style={{
            textAlign: "center",
            maxWidth: "672px",
            margin: "0 auto",
            marginBottom: "clamp(32px, 5vh, 80px)",
            opacity: hVisible ? 1 : 0,
            transform: hVisible ? "none" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <h2
            style={{ color: "var(--lp-text)", fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, lineHeight: 1.2, marginBottom: "16px" }}
          >
            {howItWorks.title}
          </h2>
          <p
            style={{ color: "var(--lp-text-muted)", fontSize: "17px", lineHeight: 1.65, maxWidth: "512px", margin: "0 auto" }}
          >
            Sin curva de aprendizaje. Configura tu primera jornada en menos de 10 minutos.
          </p>
        </div>

        {/* ── Layout responsive ── */}
        <GridContainer>
          <HowItWorksStepList
            howItWorks={howItWorks}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            hVisible={hVisible}
          />
          <HowItWorksStepDetail
            howItWorks={howItWorks}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
          />
        </GridContainer>
      </div>
    </section>
  );
}

// ─── STYLED ──────────────────────────────
import styled from "styled-components";

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 64px;
  }
`;
