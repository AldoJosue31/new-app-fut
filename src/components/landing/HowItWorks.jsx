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
  }, []);
  return [ref, visible];
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function HowItWorks() {
  const { howItWorks } = landingCopy;
  const [hRef, hVisible] = useReveal();
  const [activeStep, setActiveStep] = useState(0);

  const activeStepData = howItWorks.steps[activeStep];
  const ActiveIcon = STEP_ICONS[activeStep];

  return (
    <section
      id="como-funciona"
      style={{ background: "var(--lp-surface)", minHeight: "100dvh" }}
      className="relative flex flex-col justify-center py-28 overflow-hidden"
    >
      {/* ── Fondo: rejilla sutil ── */}
      <div
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(var(--lp-border) 1px, transparent 1px), linear-gradient(90deg, var(--lp-border) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
        className="pointer-events-none absolute inset-0 opacity-20"
      />

      {/* ── Radial glow ambiental ── */}
      <div
        aria-hidden="true"
        style={{ background: "var(--lp-primary)" }}
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-[0.04] blur-[160px]"
      />

      <div className="lp-container relative z-10">

        {/* ── Encabezado ── */}
        <div
          ref={hRef}
          className="text-center max-w-2xl mx-auto mb-20"
          style={{
            opacity: hVisible ? 1 : 0,
            transform: hVisible ? "none" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--lp-primary)" }}
          >
            Proceso
          </p>
          <h2
            className="text-4xl font-bold leading-tight mb-4"
            style={{ color: "var(--lp-text)" }}
          >
            {howItWorks.title}
          </h2>
          <p
            className="text-lg leading-relaxed max-w-lg mx-auto"
            style={{ color: "var(--lp-text-muted)" }}
          >
            Sin curva de aprendizaje. Configura tu primera jornada en menos de 10 minutos.
          </p>
        </div>

        {/* ── Layout dos columnas ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

          {/* ── Columna izquierda: lista de pasos ── */}
          <div className="flex flex-col gap-4 relative pl-5">

            {/* Línea de progreso */}
            <div
              aria-hidden="true"
              className="absolute left-0 top-5 bottom-5 w-0.5 rounded-full"
              style={{ background: "var(--lp-border)" }}
            >
              <div
                className="w-full rounded-full transition-all duration-500 ease-out"
                style={{
                  height: `${((activeStep + 1) / howItWorks.steps.length) * 100}%`,
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
                  className="relative flex items-start gap-4 text-left w-full rounded-2xl p-6 backdrop-blur-md border transition-all duration-300 cursor-pointer focus-visible:outline-none"
                  style={{
                    background: isActive
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.02)",
                    borderColor: isActive
                      ? "var(--lp-primary)"
                      : "var(--lp-border)",
                    opacity: hVisible ? (isActive ? 1 : 0.55) : 0,
                    transform: hVisible ? "none" : "translateX(-20px)",
                    boxShadow: isActive
                      ? "0 0 28px -8px var(--lp-primary)"
                      : "none",
                    transition: `opacity 0.6s ${i * 120}ms ease, transform 0.6s ${i * 120}ms ease, box-shadow 0.3s ease, border-color 0.3s ease`,
                  }}
                >
                  {/* Borde izquierdo acento activo */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 rounded-full"
                      style={{ background: "var(--lp-primary)" }}
                    />
                  )}

                  {/* Número grande */}
                  <span
                    className="font-black text-3xl leading-none tracking-tight min-w-[44px] tabular-nums transition-colors duration-300"
                    style={{ color: isActive ? "var(--lp-primary)" : "var(--lp-text-muted)" }}
                  >
                    {s.n}
                  </span>

                  {/* Icono + título + descripción */}
                  <span className="flex flex-col gap-1 pt-0.5">
                    <span className="flex items-center gap-2">
                      <Icon
                        size={18}
                        aria-hidden="true"
                        style={{ color: isActive ? "var(--lp-primary)" : "var(--lp-text-muted)", flexShrink: 0, transition: "color 0.3s" }}
                      />
                      <span
                        className="font-bold text-base transition-colors duration-300"
                        style={{ color: isActive ? "var(--lp-text)" : "var(--lp-text-muted)" }}
                      >
                        {s.title}
                      </span>
                    </span>
                    <span
                      className="text-sm leading-snug"
                      style={{ color: "var(--lp-text-muted)" }}
                    >
                      {s.text}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Columna derecha: tarjeta de detalle ── */}
          <div className="flex flex-col gap-5">

            {/* Tarjeta glassmorphism principal */}
            <div
              className="rounded-2xl overflow-hidden border backdrop-blur-md"
              style={{
                background: "rgba(255,255,255,0.05)",
                borderColor: "var(--lp-border)",
                boxShadow: "var(--lp-shadow)",
              }}
            >
              {/* Header de la tarjeta */}
              <div
                className="flex items-center gap-4 px-7 py-6 border-b"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "var(--lp-border)",
                }}
              >
                <span
                  className="font-black text-5xl leading-none tracking-tight tabular-nums"
                  style={{ color: "var(--lp-primary)" }}
                >
                  {activeStepData.n}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <ActiveIcon
                      size={20}
                      aria-hidden="true"
                      style={{ color: "var(--lp-primary)", flexShrink: 0 }}
                    />
                    <span
                      className="font-bold text-xl"
                      style={{ color: "var(--lp-text)" }}
                    >
                      {activeStepData.title}
                    </span>
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--lp-text-muted)" }}
                  >
                    {activeStepData.text}
                  </span>
                </div>
              </div>

              {/* Lista de detalles */}
              <div className="flex flex-col gap-3 px-7 py-6">
                {STEP_DETAILS[activeStep].map((detail, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl border text-sm font-semibold backdrop-blur-sm transition-colors duration-200"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "var(--lp-border)",
                      color: "var(--lp-text)",
                    }}
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-black tabular-nums"
                      style={{
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

              {/* Mini pantalla de app */}
              <div
                className="mx-7 mb-7 rounded-xl overflow-hidden border"
                style={{ borderColor: "var(--lp-border)" }}
              >
                {/* Barra de título */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5 border-b"
                  style={{ background: "rgba(0,0,0,0.2)", borderColor: "var(--lp-border)" }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--lp-border)" }} aria-hidden="true" />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--lp-border)" }} aria-hidden="true" />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--lp-border)" }} aria-hidden="true" />
                  <span className="ml-2 text-xs font-semibold" style={{ color: "var(--lp-text-muted)" }}>
                    Bracket App
                  </span>
                </div>
                {/* Fila de estado */}
                <div className="px-4 py-3" style={{ background: "rgba(0,0,0,0.1)" }}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "var(--lp-border)",
                    }}
                  >
                    <ActiveIcon
                      size={16}
                      aria-hidden="true"
                      style={{ color: "var(--lp-primary)", flexShrink: 0 }}
                    />
                    <span className="flex-1 text-sm font-semibold" style={{ color: "var(--lp-text)" }}>
                      Paso {activeStepData.n} — {activeStepData.title}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)" }}>
                      Listo ✓
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Navegación: anterior / dots / siguiente ── */}
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="px-5 py-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-all duration-150 disabled:opacity-30 disabled:cursor-default focus-visible:outline-none"
                style={{
                  borderColor: "var(--lp-border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--lp-text)",
                }}
              >
                ← Anterior
              </button>

              <div className="flex gap-2" role="tablist" aria-label="Pasos del proceso">
                {howItWorks.steps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === activeStep}
                    aria-label={`Ir al paso ${i + 1}`}
                    onClick={() => setActiveStep(i)}
                    className="h-2 rounded-full cursor-pointer transition-all duration-300 ease-out focus-visible:outline-none"
                    style={{
                      width: i === activeStep ? "28px" : "8px",
                      background: i === activeStep ? "var(--lp-primary)" : "var(--lp-border)",
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveStep(Math.min(howItWorks.steps.length - 1, activeStep + 1))}
                disabled={activeStep === howItWorks.steps.length - 1}
                className="px-5 py-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-all duration-150 disabled:opacity-30 disabled:cursor-default focus-visible:outline-none"
                style={{
                  borderColor: "var(--lp-border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--lp-text)",
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
