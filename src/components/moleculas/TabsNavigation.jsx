import React from "react";
import styled from "styled-components";

export function TabsNavigation({ tabs, activeTab, setActiveTab }) {
  return (
    <Container>
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          $active={activeTab === tab.id}
          onClick={() => setActiveTab(tab.id)}
          type="button"
        >
          {tab.icon && <span className="icon">{tab.icon}</span>}
          <span>{tab.label}</span>
        </TabButton>
      ))}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  width: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  padding-bottom: 10px;
  overflow-x: auto; /* Permite scroll horizontal en móviles */
  
  /* Ocultar scrollbar visualmente pero permitir scroll */
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const TabButton = styled.button`
  /* Usamos bg4 para que se note tanto en fondo 'bgtotal' como dentro de 'bgcards' (Modals) */
  background: ${({ $active, theme }) => ($active ? theme.bg4 : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.primary : theme.text)};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.color2 : "transparent")};
  
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.bgtotal};
    color: ${({ theme }) => theme.primary};
    transform: translateY(-1px);
  }

  .icon {
    display: flex;
    align-items: center;
    font-size: 1.1em;
  }
`;