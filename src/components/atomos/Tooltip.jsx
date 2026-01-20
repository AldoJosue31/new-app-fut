import React, { useState } from "react";
import styled from "styled-components";

export const Tooltip = ({ text, children, position = "top", isActive = true }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Combina hover y la condición activa (límite alcanzado)
  const shouldShow = isHovered && isActive;

  return (
    <TooltipContainer 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)} 
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 1500)}
    >
      {children}
      {shouldShow && (
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
  background: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text};
  border: 1px solid ${({ theme }) => theme.bg4};
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap; /* Evita saltos de línea innecesarios */
  width: max-content;  /* Ajusta al contenido exacto */
  max-width: 200px;    /* Límite para textos muy largos */
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
  pointer-events: none;
  
  /* LÓGICA DE POSICIONAMIENTO Y CERCANÍA */
  ${({ $position }) => {
    switch ($position) {
      case "top": return `
        bottom: 100%; left: 50%; transform: translateX(-50%); 
        margin-bottom: 6px; 
      `;
      case "bottom": return `
        top: 100%; left: 50%; transform: translateX(-50%); 
        margin-top: 6px; 
      `;
      case "left": return `
        right: 100%; top: 50%; transform: translateY(-50%); 
        margin-right: 8px; /* Espacio para flecha */
      `;
      case "right": return `
        left: 100%; top: 50%; transform: translateY(-50%); 
        margin-left: 8px; /* Espacio para flecha */
      `;
      default: return `
        bottom: 100%; left: 50%; transform: translateX(-50%); 
        margin-bottom: 6px; 
      `;
    }
  }}

  /* MÓVIL: Forzar posición ARRIBA si no hay espacio lateral para evitar colapso/scroll */
  @media (max-width: 768px) {
    ${({ $position }) => ($position === 'right' || $position === 'left') && `
       left: 50%; 
       top: auto; 
       bottom: 100%; 
       right: auto;
       transform: translateX(-50%); 
       margin-left: 0; 
       margin-right: 0;
       margin-bottom: 6px;
    `}
  }
`;

const Arrow = styled.div`
  position: absolute;
  width: 0; 
  height: 0; 
  border-style: solid;
  
  ${({ $position, theme }) => {
    // Flecha apuntando hacia ABAJO (para tooltip TOP)
    const arrowTop = `
        border-width: 5px 5px 0 5px; 
        border-color: ${theme.bg2} transparent transparent transparent; 
        top: 100%; left: 50%; transform: translateX(-50%);
        filter: drop-shadow(0 1px 0 ${theme.bg4});
    `;
    
    switch ($position) {
      case "top": return arrowTop;
      case "bottom": return `
        border-width: 0 5px 5px 5px; 
        border-color: transparent transparent ${theme.bg2} transparent; 
        bottom: 100%; left: 50%; transform: translateX(-50%);
        filter: drop-shadow(0 -1px 0 ${theme.bg4});
      `;
      case "left": return `
        border-width: 5px 0 5px 5px; 
        border-color: transparent transparent transparent ${theme.bg2}; 
        left: 100%; top: 50%; transform: translateY(-50%);
        filter: drop-shadow(1px 0 0 ${theme.bg4});
        
        @media (max-width: 768px) { ${arrowTop} } /* En móvil se vuelve Top */
      `;
      case "right": return `
        border-width: 5px 5px 5px 0; 
        border-color: transparent ${theme.bg2} transparent transparent; 
        right: 100%; top: 50%; transform: translateY(-50%);
        filter: drop-shadow(-1px 0 0 ${theme.bg4});

        @media (max-width: 768px) { ${arrowTop} } /* En móvil se vuelve Top */
      `;
      default: return arrowTop;
    }
  }}
`;