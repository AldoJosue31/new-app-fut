import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";

// 1. Componente de Navegación (Con el Glider que ya hicimos)
export function TabsNavigation({ tabs, activeTab, setActiveTab }) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const tabsRef = useRef([]);

  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const currentTab = tabsRef.current[activeIndex];

    if (currentTab) {
      setIndicatorStyle({
        left: currentTab.offsetLeft,
        width: currentTab.offsetWidth,
        opacity: 1 
      });
    }
  }, [activeTab, tabs]);

  return (
    <Container>
      <Glider 
        style={{ 
          transform: `translateX(${indicatorStyle.left}px)`, 
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity
        }} 
      />
      {tabs.map((tab, index) => (
        <TabButton
          key={tab.id}
          ref={(el) => (tabsRef.current[index] = el)}
          $active={activeTab === tab.id}
          onClick={() => setActiveTab(tab.id)}
          type="button"
        >
          {tab.icon && <span className="icon">{tab.icon}</span>}
          <span style={{ position: "relative", zIndex: 2 }}>{tab.label}</span>
        </TabButton>
      ))}
    </Container>
  );
}

// --- 2. NUEVO: Wrapper animado para el contenido ---
// Expórtalo para usarlo en tus Templates (Torneos, Equipos, etc.)
export const TabContent = styled.div`
  width: 100%;
  /* Animación de entrada suave: desliza un poco hacia arriba y aparece */
  animation: fadeSlideUp 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;

  @keyframes fadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// --- Estilos del TabsNavigation ---

const Container = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  width: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  padding-bottom: 10px;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const Glider = styled.div`
  position: absolute;
  height: calc(100% - 10px);
  top: 0;
  left: 0;
  background: ${({ theme }) => theme.bg4};
  border: 1px solid ${({ theme }) => theme.color2};
  border-radius: 20px;
  z-index: 0;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  pointer-events: none;
`;

const TabButton = styled.button`
  background: transparent;
  color: ${({ $active, theme }) => ($active ? theme.primary : theme.text)};
  border: 1px solid transparent;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  position: relative;
  z-index: 1;

  &:hover {
    color: ${({ theme }) => theme.primary};
  }

  .icon {
    display: flex;
    align-items: center;
    font-size: 1.1em;
    position: relative;
    z-index: 2;
  }
`;