import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { Device } from "../../styles/breakpoints";

export function TabsNavigation({ tabs, activeTab, setActiveTab }) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const tabsRef = useRef([]);

  const updateIndicator = () => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const currentTab = tabsRef.current[activeIndex];
    if (currentTab) {
      setIndicatorStyle({
        left: currentTab.offsetLeft,
        width: currentTab.offsetWidth,
        opacity: 1 
      });
    }
  };

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    // Un pequeño timeout ayuda a que el layout se estabilice antes de medir (útil para flex:1)
    const timeoutId = setTimeout(updateIndicator, 50);
    return () => {
        window.removeEventListener("resize", updateIndicator);
        clearTimeout(timeoutId);
    };
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
          <span className="label" style={{ position: "relative", zIndex: 2 }}>{tab.label}</span>
        </TabButton>
      ))}
    </Container>
  );
}

export const TabContent = styled.div`
  width: 100%;
  animation: fadeSlideUp 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  overflow-x: hidden; 

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// --- ESTILOS OPTIMIZADOS ---

const Container = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  width: 100%;
  min-width: 0;
  
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  padding-bottom: 10px;
  
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;

  /* Gap pequeño para que se note la separación, pero flex:1 hará el trabajo principal */
  gap: 5px; 

  @media ${Device.tablet} {
    gap: 15px;
  }
`;

const Glider = styled.div`
  position: absolute;
  height: calc(100% - 10px);
  top: 0; left: 0;
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
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  display: flex;
  align-items: center;
  justify-content: center; 
  gap: 8px;
  
  position: relative;
  z-index: 1;

  /* --- ESTILOS GENERALES (MÓVIL Y DESKTOP) --- */
  /* CAMBIO PRINCIPAL: flex: 1 siempre, para ocupar todo el ancho disponible */
  flex: 1; 
  padding: 12px 0; 
  
  .label {
    display: none;
  }
  
  .icon {
    font-size: 1.4rem; 
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* --- AJUSTES ESPECÍFICOS DESKTOP --- */
  @media ${Device.tablet} {
    /* Ya no sobreescribimos flex, se mantiene en 1 */
    padding: 10px 16px; 
    
    .label {
      display: block;
    }
    
    .icon {
      font-size: 1.1em;
    }
  }

  &:hover { color: ${({ theme }) => theme.primary}; }
`;