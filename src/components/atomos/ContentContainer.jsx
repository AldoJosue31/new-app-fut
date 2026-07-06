import React, { useLayoutEffect } from "react";
import styled from "styled-components";
import { Device } from "../../styles/breakpoints";

/**
 * Componente Wrapper Inteligente
 * Bloquea el scroll vertical durante la animación de entrada para evitar
 * saltos visuales o doble scrollbar temporal.
 */
export const ContentContainer = ({ children, ...props }) => {
  
  useLayoutEffect(() => {
    const originalOverflowY = document.body.style.overflowY;
    document.body.style.overflowY = "hidden";

    const timer = setTimeout(() => {
      document.body.style.overflowY = originalOverflowY; 
    }, 400);

    return () => {
      clearTimeout(timer);
      document.body.style.overflowY = originalOverflowY;
    };
  }, []);

  return <StyledContainer {...props}>{children}</StyledContainer>;
};

const StyledContainer = styled.div`
  min-height: calc(100vh - 100px); /* FIX: Sustituido el 100vh directo que causaba huecos abajo y scrollbars forzados */
  padding: 20px;
  padding-top: 100px; 
  padding-bottom: 30px; /* Reducción de margen en el inferior global */
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  background-color: ${({ theme }) => theme.bgtotal};
  width: 100%; 
  transition: all 0.3s ease;

  /* --- ANIMACIÓN DE ENTRADA GLOBAL --- */
  animation: fadeIn 0.4s ease-in-out;
  animation-fill-mode: backwards; 

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media ${Device.tablet} {
    padding-top: 40px;
    padding-left: 20px;
    padding-right: 20px;
    margin-left: 0; 
    width: 100%; 
  }
`;
