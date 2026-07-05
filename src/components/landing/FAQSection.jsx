// src/components/landing/FAQSection.jsx
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Icon } from "@iconify/react";
import { landingCopy } from "../../pages/landing/copy";

// FAQ ampliado con más preguntas ricas en contenido
const FAQ_EXTENDED = [
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí, puedes ajustar tu plan en cualquier momento desde el panel de configuración. El cambio se aplica al siguiente ciclo de facturación. Si subes de plan, el acceso a las nuevas funciones es inmediato.",
    icon: "mdi:credit-card",
  },
  {
    q: "¿Necesito tarjeta para empezar?",
    a: "No. Puedes crear tu cuenta y explorar la plataforma de forma gratuita durante el período de prueba sin ingresar ningún método de pago. Solo se solicita al momento de elegir un plan de pago.",
    icon: "mdi:gift",
  },
  {
    q: "¿Puedo compartir la tabla con mi afición?",
    a: "Sí. Cada liga genera un enlace público único que puedes compartir por WhatsApp, redes sociales o incluso pegar en una página web. La tabla se actualiza en tiempo real sin que los visitantes necesiten cuenta.",
    icon: "mdi:link-variant",
  },
  {
    q: "¿Cuántos equipos puedo registrar por división?",
    a: "No hay límite de equipos por división. Puedes registrar desde 4 hasta los que necesites. El sistema genera el calendario de forma automática independientemente del número de participantes.",
    icon: "mdi:account-group",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Totalmente. Todos los datos se almacenan con cifrado de 256 bits en servidores en la nube con respaldo diario automático. Tú eres el dueño de tu información y puedes exportarla en cualquier momento.",
    icon: "mdi:lock",
  },
  {
    q: "¿Funciona en teléfono móvil?",
    a: "Sí, la plataforma está diseñada para ser 100% responsive. Puedes gestionar partidos, ver resultados y actualizar tablas desde cualquier teléfono o tableta sin necesidad de instalar ninguna aplicación.",
    icon: "mdi:cellphone",
  },
];

const CATEGORIES = ["General", "Pagos", "Compartir", "Equipos", "Seguridad", "Dispositivos"];

function useReveal() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

export default function FAQSection() {
  const [hRef, hVisible] = useReveal();
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <Section id="faq">
      <div className="lp-container">
        <SectionHeader ref={hRef} className={hVisible ? "visible" : ""}>
          <h2 className="lp-h2">{landingCopy.faq.title}</h2>
          <SectionLead>Todo lo que necesitas saber antes de empezar. ¿No encuentras tu respuesta? Escríbenos.</SectionLead>
        </SectionHeader>

        <FaqLayout>
          {/* Lista de preguntas */}
          <FaqList>
            {FAQ_EXTENDED.map((item, i) => {
              const isOpen = openIdx === i;
              return (
                <FaqItem
                  key={i}
                  isopen={isOpen ? "true" : undefined}
                  className={hVisible ? "visible" : ""}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <FaqBtn
                    onClick={() => setOpenIdx(isOpen ? -1 : i)}
                    isopen={isOpen ? "true" : undefined}
                  >
                    <FaqIcon><Icon icon={item.icon} /></FaqIcon>
                    <span className="q-text">{item.q}</span>
                    <FaqChevron isopen={isOpen ? "true" : undefined}>▾</FaqChevron>
                  </FaqBtn>

                  <FaqAnswer isopen={isOpen ? "true" : undefined}>
                    <div className="answer-inner">
                      <div className="answer-content">
                        <p>{item.a}</p>
                      </div>
                    </div>
                  </FaqAnswer>
                </FaqItem>
              );
            })}
          </FaqList>

          {/* Panel lateral */}
          <FaqSide className={hVisible ? "visible" : ""}>
            <SideCard>
              <h3>¿Sigues con dudas?</h3>
              <p>Nuestro equipo responde en menos de 24 horas hábiles.</p>
              <ContactBtn href="mailto:soporte@bracketapp.mx">
                <Icon icon="mdi:email" width={18} /> Escríbenos
              </ContactBtn>
            </SideCard>

            <SideCard secondary>
              <h3>Demo gratuita</h3>
              <p>¿Quieres ver cómo funciona antes de registrarte? Agenda una demo con nosotros.</p>
              <ContactBtn href="/login" secondary>
                <Icon icon="mdi:calendar" width={18} /> Agendar demo
              </ContactBtn>
            </SideCard>

            <QuickStats>
              <QuickStat><span className="qs-num">{"<24h"}</span><span className="qs-label">Tiempo de respuesta</span></QuickStat>
              <QuickStat><span className="qs-num">99.9%</span><span className="qs-label">Uptime garantizado</span></QuickStat>
            </QuickStats>
          </FaqSide>
        </FaqLayout>
      </div>
    </Section>
  );
}

// ─── STYLED ──────────────────────────────
const expandAnim = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: none; }
`;

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

const SectionHeader = styled.div`
  text-align: center;
  max-width: 700px;
  margin: 0 auto clamp(32px, 5vh, 64px);
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

const FaqLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 32px;
  align-items: start;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const FaqList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FaqItem = styled.div`
  border-radius: 16px;
  border: 1px solid ${({ isopen }) => isopen ? "rgba(28, 176, 246, 0.4)" : "var(--lp-border)"};
  background: ${({ isopen }) => isopen ? "rgba(28, 176, 246, 0.04)" : "var(--lp-surface)"};
  overflow: hidden;
  transition: border-color 200ms, background 200ms, box-shadow 200ms;
  box-shadow: ${({ isopen }) => isopen ? "0 8px 24px -8px rgba(28, 176, 246, 0.15)" : "none"};
  opacity: 0;
  transform: translateY(16px);

  &.visible { opacity: 1; transform: none; transition: opacity 0.5s ease, transform 0.5s ease, border-color 200ms, background 200ms, box-shadow 200ms; }
`;

const FaqBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;

  .q-text {
    flex: 1;
    font-size: 15px;
    font-weight: 700;
    color: ${({ isopen }) => isopen ? "var(--lp-primary)" : "var(--lp-text)"};
    transition: color 200ms;
    line-height: 1.4;
  }
`;

const FaqIcon = styled.span`
  font-size: 20px;
  flex-shrink: 0;
`;

const FaqChevron = styled.span`
  font-size: 18px;
  color: ${({ isopen }) => isopen ? "var(--lp-primary)" : "var(--lp-text-muted)"};
  transform: ${({ isopen }) => isopen ? "rotate(180deg)" : "none"};
  transition: transform 250ms ease, color 200ms;
  flex-shrink: 0;
`;

const FaqAnswer = styled.div`
  display: grid;
  grid-template-rows: ${({ isopen }) => isopen ? "1fr" : "0fr"};
  transition: grid-template-rows 350ms cubic-bezier(0.16, 1, 0.3, 1);

  .answer-inner {
    overflow: hidden;
  }
  
  .answer-content {
    padding: 0 24px 20px 58px;
    animation: ${({ isopen }) => isopen ? expandAnim : "none"} 0.3s ease;
    
    p {
      font-size: 15px;
      color: var(--lp-text-muted);
      line-height: 1.7;
      margin: 0;
    }
  }
`;

const FaqSide = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  opacity: 0;
  transform: translateX(20px);
  transition: opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s;
  &.visible { opacity: 1; transform: none; }
`;

const SideCard = styled.div`
  padding: 24px;
  background: ${({ secondary }) => secondary ? "rgba(99, 102, 241, 0.06)" : "rgba(28, 176, 246, 0.06)"};
  border: 1px solid ${({ secondary }) => secondary ? "rgba(99, 102, 241, 0.2)" : "rgba(28, 176, 246, 0.2)"};
  border-radius: 16px;

  h3 { font-size: 16px; font-weight: 800; color: var(--lp-text); margin: 0 0 8px; }
  p  { font-size: 13px; color: var(--lp-text-muted); line-height: 1.6; margin: 0 0 16px; }
`;

const ContactBtn = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  background: ${({ secondary }) => secondary ? "rgba(99, 102, 241, 0.15)" : "rgba(28, 176, 246, 0.15)"};
  color: ${({ secondary }) => secondary ? "#6366F1" : "var(--lp-primary)"};
  border: 1px solid ${({ secondary }) => secondary ? "rgba(99, 102, 241, 0.3)" : "rgba(28, 176, 246, 0.3)"};
  transition: all 150ms ease;

  &:hover { transform: translateY(-2px); opacity: 0.85; }
`;

const QuickStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const QuickStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  border-radius: 12px;
  text-align: center;

  .qs-num { font-size: 20px; font-weight: 900; color: var(--lp-text); }
  .qs-label { font-size: 11px; font-weight: 600; color: var(--lp-text-muted); margin-top: 4px; text-align: center; }
`;
