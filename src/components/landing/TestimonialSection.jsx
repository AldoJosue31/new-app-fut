// src/components/landing/TestimonialSection.jsx
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { landingCopy } from "../../pages/landing/copy";

const TESTIMONIALS = [
  {
    quote: "Antes gestionaba la liga con Excel y WhatsApp. Con Bracket App todo está en un solo lugar y mis equipos saben qué pasa en tiempo real. Cambió mi forma de dirigir.",
    author: "Aldo García",
    role: "Administrador de Liga",
    league: "Liga Municipal Norte",
    teams: 12,
    seasons: 3,
    stars: 5,
  },
  {
    quote: "El calendario se genera solo, los resultados se publican automáticamente y los delegados ya no me llaman para preguntar la tabla. Impresionante.",
    author: "Roberto Méndez",
    role: "Organizador deportivo",
    league: "Copa Empresarial 2025",
    teams: 8,
    seasons: 1,
    stars: 5,
  },
  {
    quote: "Pasamos de 6 horas de trabajo manual por jornada a menos de 20 minutos. La plataforma es increíblemente intuitiva.",
    author: "Carlos Vega",
    role: "Director técnico",
    league: "Torneo Relámpago",
    teams: 16,
    seasons: 2,
    stars: 5,
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

export default function TestimonialSection() {
  const [hRef, hVisible] = useReveal();
  const [active, setActive] = useState(0);

  const t = TESTIMONIALS[active];
  const initials = t.author.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <Section>
      <BgGlow />
      <div className="lp-container" style={{ position: "relative", zIndex: 1 }}>
        <SectionHeader ref={hRef} className={hVisible ? "visible" : ""}>
          <SectionEyebrow>Testimonios</SectionEyebrow>
          <h2 className="lp-h2">Organizadores que ya confían en nosotros</h2>
          <SectionLead>No palabras nuestras, sino de quienes usan Bracket App cada semana.</SectionLead>
        </SectionHeader>

        <TestimLayout>
          {/* Panel principal */}
          <MainTestimCard className={hVisible ? "visible" : ""}>
            {/* Stars */}
            <Stars>
              {Array.from({ length: t.stars }).map((_, i) => (
                <span key={i}>★</span>
              ))}
            </Stars>

            <QuoteText key={active}>"{t.quote}"</QuoteText>

            <AuthorRow>
              <AuthorAvatar>
                {initials}
              </AuthorAvatar>
              <AuthorInfo>
                <span className="author-name">{t.author}</span>
                <span className="author-role">{t.role}</span>
              </AuthorInfo>
              <LeaguePill>
                🏆 {t.league}
              </LeaguePill>
            </AuthorRow>

            {/* Métricas del autor */}
            <AuthorStats>
              <StatChip>
                <span className="sc-num">{t.teams}</span>
                <span className="sc-label">equipos</span>
              </StatChip>
              <StatChip>
                <span className="sc-num">{t.seasons}</span>
                <span className="sc-label">{t.seasons === 1 ? "temporada" : "temporadas"}</span>
              </StatChip>
              <StatChip>
                <span className="sc-num">100%</span>
                <span className="sc-label">en línea</span>
              </StatChip>
            </AuthorStats>
          </MainTestimCard>

          {/* Selector lateral */}
          <TestimSide className={hVisible ? "visible" : ""}>
            {TESTIMONIALS.map((item, i) => {
              const initials2 = item.author.split(" ").map(n => n[0]).join("").slice(0, 2);
              return (
                <TestimThumb
                  key={i}
                  isactive={active === i ? "true" : undefined}
                  onClick={() => setActive(i)}
                >
                  <ThumbAvatar isactive={active === i ? "true" : undefined}>{initials2}</ThumbAvatar>
                  <ThumbInfo>
                    <span className="tn">{item.author}</span>
                    <span className="tr">{item.league}</span>
                  </ThumbInfo>
                </TestimThumb>
              );
            })}

            {/* CTA pequeño */}
            <TestimCTA>
              <p>¿Usas Bracket App?</p>
              <a href="mailto:contacto@bracketapp.mx">Comparte tu historia →</a>
            </TestimCTA>
          </TestimSide>
        </TestimLayout>
      </div>
    </Section>
  );
}

// ─── KEYFRAMES ───────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
`;

// ─── STYLED ──────────────────────────────
const Section = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: clamp(60px, 8vh, 100px) 0;
  background: var(--lp-surface);
  overflow: hidden;
  box-sizing: border-box;
`;

const BgGlow = styled.div`
  position: absolute;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(99, 102, 241, 0.06) 0%, transparent 70%);
  pointer-events: none;
`;

const SectionHeader = styled.div`
  text-align: center;
  max-width: 700px;
  margin: 0 auto clamp(32px, 5vh, 64px);
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
  max-width: 500px;
`;

const TestimLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const MainTestimCard = styled.div`
  background: var(--lp-bg);
  border: 1px solid var(--lp-border);
  border-radius: 24px;
  padding: 40px;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
  &.visible { opacity: 1; transform: none; }
`;

const Stars = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  span { font-size: 20px; color: #FFD700; }
`;

const QuoteText = styled.p`
  font-size: clamp(18px, 2vw, 22px);
  font-weight: 500;
  color: var(--lp-text);
  line-height: 1.65;
  font-style: italic;
  margin: 0 0 32px;
  animation: ${fadeIn} 0.4s ease;
`;

const AuthorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const AuthorAvatar = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1CB0F6, #6366F1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
  color: #fff;
  flex-shrink: 0;
`;

const AuthorInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;

  .author-name { font-size: 16px; font-weight: 800; color: var(--lp-text); }
  .author-role { font-size: 13px; color: var(--lp-text-muted); }
`;

const LeaguePill = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: var(--lp-primary);
  background: rgba(28, 176, 246, 0.1);
  border: 1px solid rgba(28, 176, 246, 0.2);
  padding: 6px 12px;
  border-radius: 100px;
`;

const AuthorStats = styled.div`
  display: flex;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--lp-border);
`;

const StatChip = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--lp-surface);
  border-radius: 12px;
  border: 1px solid var(--lp-border);

  .sc-num { font-size: 22px; font-weight: 900; color: var(--lp-text); }
  .sc-label { font-size: 11px; font-weight: 600; color: var(--lp-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
`;

const TestimSide = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  transform: translateX(20px);
  transition: opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s;
  &.visible { opacity: 1; transform: none; }
`;

const TestimThumb = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid ${({ isactive }) => isactive ? "rgba(28, 176, 246, 0.4)" : "var(--lp-border)"};
  background: ${({ isactive }) => isactive ? "rgba(28, 176, 246, 0.08)" : "var(--lp-bg)"};
  cursor: pointer;
  transition: all 150ms ease;

  &:hover { border-color: rgba(28, 176, 246, 0.3); }

  .tn { font-size: 13px; font-weight: 700; color: var(--lp-text); display: block; }
  .tr { font-size: 11px; color: var(--lp-text-muted); display: block; margin-top: 2px; }
`;

const ThumbAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ isactive }) => isactive ? "linear-gradient(135deg, #1CB0F6, #6366F1)" : "var(--lp-surface)"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  color: ${({ isactive }) => isactive ? "#fff" : "var(--lp-text-muted)"};
  border: 1px solid var(--lp-border);
  transition: all 200ms;
`;

const ThumbInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const TestimCTA = styled.div`
  margin-top: 8px;
  padding: 16px;
  background: var(--lp-bg);
  border: 1px dashed var(--lp-border);
  border-radius: 14px;
  text-align: center;

  p { font-size: 13px; color: var(--lp-text-muted); margin: 0 0 6px; }
  a { font-size: 13px; font-weight: 700; color: var(--lp-primary); text-decoration: none; }
  a:hover { text-decoration: underline; }
`;
