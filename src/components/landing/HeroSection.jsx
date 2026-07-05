// src/components/landing/HeroSection.jsx

import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";
import RealStandingsTable from "../organismos/tabs/torneos/subcomponents/StandingsTable";
import { Toast } from "../atomos/Toast";

// --- CONTADOR ANIMADO ---
function useCountUp(target, duration = 1800, shouldStart = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!shouldStart) return;
    let start = null;
    const numericTarget = parseInt(String(target).replace(/\D/g, ""), 10);
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * numericTarget));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(numericTarget);
    };
    requestAnimationFrame(step);
  }, [shouldStart, target, duration]);
  return count;
}

function AnimatedStat({ value, label, delay = 0 }) {
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const numericTarget = parseInt(String(value).replace(/\D/g, ""), 10);
  const prefix = String(value).match(/^[^0-9]*/)?.[0] ?? "";
  const suffix = String(value).match(/[^0-9]*$/)?.[0] ?? "";
  const count = useCountUp(numericTarget, 1800, started);

  return (
    <StatItem ref={ref} style={{ transitionDelay: `${delay}ms` }}>
      <span className="stat-value">{prefix}{started ? count.toLocaleString() : 0}{suffix}</span>
      <span className="stat-label">{label}</span>
    </StatItem>
  );
}

// --- DATOS DEMO ---
const STANDINGS = [
  { id: "1", nombre: "Deportivo Sur", pj: 12, pts: 34, gf: 28, gc: 10, g: 11, e: 1, p: 0, dg: 18, tendencia: 'same', posDiff: 0, color: "#1CB0F6", partidosPendientes: 0 },
  { id: "2", nombre: "Real Centro",   pj: 12, pts: 31, gf: 22, gc: 11, g: 10, e: 1, p: 1, dg: 11, tendencia: 'up', posDiff: 1, color: "#FF6B6B", partidosPendientes: 0 },
  { id: "3", nombre: "Atletico FC",   pj: 12, pts: 28, gf: 19, gc: 12, g: 9,  e: 1, p: 2, dg: 7,  tendencia: 'down', posDiff: 1, color: "#FFD700", partidosPendientes: 0 },
  { id: "4", nombre: "Club Union",    pj: 12, pts: 20, gf: 14, gc: 16, g: 6,  e: 2, p: 4, dg: -2, tendencia: 'same', posDiff: 0, color: "#94a3b8", partidosPendientes: 0 },
];

const tableConfig = { ascensos: 1, descensos: 0, zonaLiguilla: true, clasificados: 3, repechaje: 0, tieBreakType: 'normal' };

const SCORERS = [
  { initials: "MG", name: "M. Gomez",   team: "Deportivo Sur", goals: 14, color: "#1CB0F6" },
  { initials: "CR", name: "C. Ramirez", team: "Real Centro",   goals: 11, color: "#FF6B6B" },
  { initials: "AS", name: "A. Silva",   team: "Atletico FC",   goals:  9, color: "#FFD700" },
];

const TABS = ["Tabla", "Goleadores"];

// --- COMPONENTE PRINCIPAL ---
export default function HeroSection() {
  const { hero } = landingCopy;
  const [activeTab, setActiveTab] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const heroRef = useRef(null);

  useEffect(() => {
    const handleMove = (e) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const parallaxX = (mousePos.x - 0.5) * 16;
  const parallaxY = (mousePos.y - 0.5) * 10;

  return (
    <HeroWrapper id="top" ref={heroRef}>
      <BgCanvas />
      <GlowOrb style={{ transform: `translate(${parallaxX * 1.5}px, ${parallaxY}px)` }} />
      <GlowOrbSecondary style={{ transform: `translate(${-parallaxX}px, ${parallaxY * 0.5}px)` }} />

      <div className="lp-container">
        <HeroGrid>
          {/* COLUMNA IZQUIERDA */}
          <LeftColumn className="lp-reveal is-visible">
            <h1 className="lp-h1">
              {hero.titleLine1} <br />
              <GradientText>{hero.titleAccent}</GradientText>
            </h1>

            <p className="lp-lead">{hero.subtitle}</p>

            <ButtonGroup>
              <Link to="/login" className="lp-btn lp-btn-primary" id="hero-cta-primary">
                {hero.ctaPrimary} <span className="arrow-icon"><Icon icon="mdi:arrow-right" /></span>
              </Link>
              <Link to="/login" className="lp-btn lp-btn-ghost" id="hero-cta-secondary">
                <Icon icon="mdi:play" width={16} /> {hero.ctaSecondary}
              </Link>
            </ButtonGroup>

            <StatsGroup>
              {hero.stats.map((s, i) => (
                <AnimatedStat key={i} value={s.value} label={s.label} delay={i * 120} />
              ))}
            </StatsGroup>
          </LeftColumn>

          {/* COLUMNA DERECHA */}
          <RightColumn className="lp-reveal is-visible" style={{ transitionDelay: "200ms" }}>
            <VisualContainer
              style={{
                transform: `perspective(1200px) rotateY(${-parallaxX * 0.4}deg) rotateX(${parallaxY * 0.3}deg)`,
              }}
            >
              <div className="inner-glow" />

              {/* VENTANA APP */}
              <AppWindow>
                <div className="win-bar">
                  <span className="dot c" /><span className="dot m" /><span className="dot x" />
                  <span className="win-title">Bracket App &middot; Liga Municipal 2025</span>
                </div>

                <TabRow>
                  {TABS.map((tab, i) => (
                    <TabBtn
                      key={tab}
                      active={activeTab === i ? "true" : undefined}
                      onClick={() => setActiveTab(i)}
                      id={`hero-tab-${tab.toLowerCase()}`}
                    >
                      {i === 0 ? "🏆" : "⚽"} {tab}
                    </TabBtn>
                  ))}
                </TabRow>

                <TabContent $noPadding={activeTab === 0}>
                  {activeTab === 0 ? (
                    <div className="hero-table-wrapper" style={{ width: "100%", overflowX: "hidden" }}>
                      <RealStandingsTable tablaGeneral={STANDINGS} config={tableConfig} isPublic={true} hideBottomInfo={true} />
                    </div>
                  ) : (
                    <ScorersList>
                      {SCORERS.map((s, i) => (
                        <ScorerRow key={s.name} isfirst={i === 0 ? "true" : undefined}>
                          <RankBadge rank={i + 1}>{i + 1}</RankBadge>
                          <Avatar avatarcolor={s.color}>{s.initials}</Avatar>
                          <ScorerInfo>
                            <span className="name">{s.name}</span>
                            <span className="team">{s.team}</span>
                          </ScorerInfo>
                          <GoalCount>
                            <span className="num">{s.goals}</span>
                            <span className="icon"><Icon icon="mdi:soccer" /></span>
                          </GoalCount>
                        </ScorerRow>
                      ))}
                    </ScorersList>
                  )}
                </TabContent>
              </AppWindow>

              <div className="hero-toast-wrapper">
                <Toast 
                  show={true} 
                  message="Jornada 12 cerrada con éxito" 
                  type="success" 
                  duration={9999999} 
                  onClose={() => {}} 
                />
              </div>
            </VisualContainer>
          </RightColumn>
        </HeroGrid>
      </div>
    </HeroWrapper>
  );
}

// ─── CANVAS PARTICULAS ────────────────────
function BgCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }));
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = canvas.parentElement ? canvas.parentElement.offsetHeight : window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(28, 176, 246, ${p.alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
}

// ─── KEYFRAMES ───────────────────────────
const floatA = keyframes`
  0%, 100% { transform: translateY(0px) translateX(0px); }
  33%       { transform: translateY(-14px) translateX(6px); }
  66%       { transform: translateY(8px) translateX(-4px); }
`;

const floatB = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(10px); }
`;

const orbFloat = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%       { transform: translate(40px, -30px) scale(1.08); }
`;

const orbFloat2 = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%       { transform: translate(-30px, 20px) scale(0.94); }
`;

const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const liveDotPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(46, 213, 115, 0.7); }
  70%  { box-shadow: 0 0 0 8px rgba(46, 213, 115, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 213, 115, 0); }
`;

const liveBlink = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
`;

// ─── ESTILOS ─────────────────────────────
const HeroWrapper = styled.section`
  position: relative;
  min-height: 100vh;
  
  .hero-toast-wrapper > div {
    position: absolute !important;
    top: auto !important;
    bottom: -20px !important;
    left: -30px !important;
    right: auto !important;
    z-index: 10 !important;
    min-width: 260px !important;
  }

  .hero-table-wrapper #standings-table-card {
    margin: 0 !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    max-width: none !important;
  }
  
  .hero-table-wrapper th,
  .hero-table-wrapper td {
    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
  }
  padding: clamp(120px, 15vh, 150px) 0 clamp(60px, 10vh, 100px);
  overflow: hidden;
  background: var(--lp-bg);
  min-height: 100vh;
  display: flex;
  align-items: center;
  box-sizing: border-box;
`;

const GlowOrb = styled.div`
  position: absolute;
  top: -120px;
  right: 0;
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, rgba(28, 176, 246, 0.18) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  animation: ${orbFloat} 12s ease-in-out infinite;
  transition: transform 0.1s linear;
`;

const GlowOrbSecondary = styled.div`
  position: absolute;
  bottom: -100px;
  left: -100px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  animation: ${orbFloat2} 16s ease-in-out infinite;
  transition: transform 0.1s linear;
`;

const HeroGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 64px;
  align-items: center;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 48px;
    text-align: center;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;

  .lp-h1 {
    font-size: clamp(40px, 5.5vw, 72px);
    font-weight: 900;
    line-height: 1.05;
    color: var(--lp-text);
    margin: 16px 0 24px;
    letter-spacing: -0.035em;
  }

  .lp-lead {
    font-size: 17px;
    color: var(--lp-text-muted);
    max-width: 500px;
    line-height: 1.65;
    margin-bottom: 40px;
  }

  .arrow-icon {
    display: inline-block;
    transition: transform 200ms ease;
  }
  .lp-btn-primary:hover .arrow-icon {
    transform: translateX(4px);
  }

  @media (max-width: 1024px) {
    align-items: center;
    .lp-lead { max-width: 100%; }
  }
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(46, 213, 115, 0.1);
  border: 1px solid rgba(46, 213, 115, 0.3);
  color: #2ed573;
  padding: 7px 14px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  width: fit-content;

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #2ed573;
    animation: ${liveDotPulse} 2s infinite;
  }
`;

const GradientText = styled.span`
  background: linear-gradient(135deg, #1CB0F6 0%, #6366F1 50%, #EC4899 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${gradientShift} 4s ease infinite;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 14px;
  margin-bottom: 52px;
  flex-wrap: wrap;

  @media (max-width: 480px) { flex-direction: column; }
`;

const StatsGroup = styled.div`
  display: flex;
  gap: 36px;
  padding-top: 32px;
  border-top: 1px solid var(--lp-border);

  @media (max-width: 1024px) { justify-content: center; }
  @media (max-width: 480px)  { gap: 24px; }
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;

  .stat-value {
    font-size: clamp(24px, 3vw, 32px);
    font-weight: 900;
    color: var(--lp-text);
    letter-spacing: -0.02em;
  }

  .stat-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--lp-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
`;

const RightColumn = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const VisualContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 650px;
  transition: transform 0.08s linear;

  .inner-glow {
    position: absolute;
    inset: 20%;
    background: radial-gradient(circle, rgba(28, 176, 246, 0.12) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
`;

const AppWindow = styled.div`
  position: relative;
  z-index: 2;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  border-radius: 20px;
  box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.04);
  overflow: hidden;
  animation: ${floatA} 8s ease-in-out infinite;

  .win-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 18px;
    background: var(--lp-bg);
    border-bottom: 1px solid var(--lp-border);

    .dot {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
    }
    .dot.c { background: #ff5f56; }
    .dot.m { background: #ffbd2e; }
    .dot.x { background: #27c93f; }

    .win-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--lp-text-muted);
      margin-left: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

const TabRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 16px 0;
  border-bottom: 1px solid var(--lp-border);
  background: var(--lp-bg);
`;

const TabBtn = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 10px 10px 0 0;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 200ms ease;
  background: ${({ active }) => active ? "var(--lp-surface)" : "transparent"};
  color: ${({ active }) => active ? "var(--lp-primary)" : "var(--lp-text-muted)"};
  border-bottom: ${({ active }) => active ? "2px solid var(--lp-primary)" : "2px solid transparent"};

  &:hover { color: var(--lp-primary); }
`;

const TabContent = styled.div`
  padding: ${({ $noPadding }) => $noPadding ? "0" : "16px"};
  background: var(--lp-surface);
  min-height: 200px;
`;


const ScorersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ScorerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: ${({ isfirst }) => isfirst ? "rgba(28, 176, 246, 0.08)" : "var(--lp-bg)"};
  border: 1px solid ${({ isfirst }) => isfirst ? "rgba(28, 176, 246, 0.2)" : "var(--lp-border)"};
  transition: transform 150ms;
  &:hover { transform: translateX(4px); }
`;

const RankBadge = styled.span`
  font-size: 13px;
  font-weight: 900;
  color: ${({ rank }) =>
    rank === 1 ? "#FFD700" :
    rank === 2 ? "#C0C0C0" : "#CD7F32"};
  width: 20px;
  text-align: center;
`;

const Avatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  background: ${({ avatarcolor }) => avatarcolor}22;
  color: ${({ avatarcolor }) => avatarcolor};
  border: 2px solid ${({ avatarcolor }) => avatarcolor}44;
  flex-shrink: 0;
`;

const ScorerInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  .name { font-weight: 700; font-size: 14px; color: var(--lp-text); }
  .team { font-size: 12px; color: var(--lp-text-muted); }
`;

const GoalCount = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  .num { font-weight: 900; font-size: 18px; color: var(--lp-text); }
  .icon { font-size: 14px; }
`;

const LiveMatchCard = styled.div`
  position: absolute;
  top: -24px;
  right: -20px;
  z-index: 5;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(28, 176, 246, 0.3);
  border-radius: 16px;
  padding: 14px 18px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(28, 176, 246, 0.1);
  min-width: 210px;
  animation: ${floatB} 5s ease-in-out infinite;
  animation-delay: -2s;

  .live-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    font-size: 11px;
    font-weight: 800;
    color: #ff4757;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .live-header .min {
    margin-left: auto;
    color: #94a3b8;
    font-weight: 600;
    font-size: 12px;
  }

  .score-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .score-row .team {
    font-size: 12px;
    font-weight: 700;
    color: #e2e8f0;
    max-width: 70px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .score-row .team.right { text-align: right; }
  .score-row .score {
    font-size: 22px;
    font-weight: 900;
    color: #fff;
    letter-spacing: 0.05em;
  }

  .event {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #64748b;
  }
  .event .ev-icon { font-size: 13px; }
  .event .ev-text { font-weight: 600; }

  @media (max-width: 1024px) {
    top: -16px;
    right: 10px;
  }
`;

const LivePulse = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4757;
  display: inline-block;
  animation: ${liveBlink} 1s step-start infinite;
`;

