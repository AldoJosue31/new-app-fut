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
    // 1. Bloquear el scroll vertical al montar el componente
    const originalStyle = window.getComputedStyle(document.body).overflowY;
    document.body.style.overflowY = "hidden";

    // 2. Liberar el scroll exactamente cuando termina la animación (400ms)
    const timer = setTimeout(() => {
      document.body.style.overflowY = "auto"; 
    }, 400);

    // 3. Cleanup: Asegurar que el scroll se reactiva si el componente se desmonta antes
    return () => {
      clearTimeout(timer);
      document.body.style.overflowY = "auto";
    };
  }, []);

  return <StyledContainer {...props}>{children}</StyledContainer>;
};

// El estilo original se mantiene, pero ahora es un componente interno
const StyledContainer = styled.div`
  min-height: 100vh;
  padding: 20px;
  padding-top: 100px; 
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  background-color: ${({ theme }) => theme.bgtotal};
  width: 100%; 
  transition: all 0.3s ease;

  /* --- ANIMACIÓN DE ENTRADA GLOBAL --- */
  animation: fadeIn 0.4s ease-in-out;
  /* 'fill-mode: backwards' asegura que el estilo inicial (opacity 0) se aplique antes de que empiece la animación */
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