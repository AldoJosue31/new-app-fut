import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";

export const Tooltip = ({ text, children, position = "top" }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TooltipContainer 
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <TooltipBox $position={position}>
          {text}
          <Arrow $position={position} />
        </TooltipBox>
      )}
    </TooltipContainer>
  );
};

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipBox = styled.div`
  position: absolute;
  background: ${({ theme }) => theme.bg2}; /* Fondo contraste */
  color: ${({ theme }) => theme.text};
  border: 1px solid ${({ theme }) => theme.bg4};
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 100;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  
  /* Posicionamiento dinámico */
  ${({ $position }) => {
    switch ($position) {
      case "top": return `bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px;`;
      case "bottom": return `top: 100%; left: 50%; transform: translateX(-50%); margin-top: 8px;`;
      case "left": return `right: 100%; top: 50%; transform: translateY(-50%); margin-right: 8px;`;
      case "right": return `left: 100%; top: 50%; transform: translateY(-50%); margin-left: 8px;`;
      default: return `bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px;`;
    }
  }}
`;

const Arrow = styled.div`
  position: absolute;
  width: 0; 
  height: 0; 
  border-style: solid;
  
  ${({ $position, theme }) => {
    const color = theme.bg4; // Color del borde o fondo
    switch ($position) {
      case "top": return `border-width: 5px 5px 0 5px; border-color: ${color} transparent transparent transparent; top: 100%; left: 50%; transform: translateX(-50%);`;
      case "bottom": return `border-width: 0 5px 5px 5px; border-color: transparent transparent ${color} transparent; bottom: 100%; left: 50%; transform: translateX(-50%);`;
      // ... se pueden agregar más flechas
      default: return `border-width: 5px 5px 0 5px; border-color: ${color} transparent transparent transparent; top: 100%; left: 50%; transform: translateX(-50%);`;
    }
  }}
`;