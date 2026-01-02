import React from 'react';
import styled, { keyframes, css } from 'styled-components';
// Asegúrate de que esta ruta sea correcta hacia tu imagen
import logo from '../../../public/logo_app.png'; 

const PantallaCarga = () => {
  return (
    <Container>
      <LogoWrapper>
        <Cuadrante $pos="tl" />
        <Cuadrante $pos="tr" />
        <Cuadrante $pos="bl" />
        <Cuadrante $pos="br" />
        <Glow />
      </LogoWrapper>
      <LoadingText>Cargando Bracket app...</LoadingText>
    </Container>
  );
};

export default PantallaCarga;

// --- Keyframes ---
const assembleTL = keyframes`
  0% { transform: translate(-60px, -60px); opacity: 0; }
  35% { transform: translate(0, 0); opacity: 1; }
  75% { transform: translate(0, 0); opacity: 1; }
  100% { transform: translate(-60px, -60px); opacity: 0; }
`;

const assembleTR = keyframes`
  0% { transform: translate(60px, -60px); opacity: 0; }
  35% { transform: translate(0, 0); opacity: 1; }
  75% { transform: translate(0, 0); opacity: 1; }
  100% { transform: translate(60px, -60px); opacity: 0; }
`;

const assembleBL = keyframes`
  0% { transform: translate(-60px, 60px); opacity: 0; }
  35% { transform: translate(0, 0); opacity: 1; }
  75% { transform: translate(0, 0); opacity: 1; }
  100% { transform: translate(-60px, 60px); opacity: 0; }
`;

const assembleBR = keyframes`
  0% { transform: translate(60px, 60px); opacity: 0; }
  35% { transform: translate(0, 0); opacity: 1; }
  75% { transform: translate(0, 0); opacity: 1; }
  100% { transform: translate(60px, 60px); opacity: 0; }
`;

const flash = keyframes`
  0%, 30% { opacity: 0; transform: scale(0.8); }
  35% { opacity: 0.8; transform: scale(1.1); box-shadow: 0 0 30px rgba(255, 255, 255, 0.8); }
  45% { opacity: 0; transform: scale(1); }
  100% { opacity: 0; }
`;

const pulseText = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

// --- Styled Components ---
const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #0f0f0f;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const LogoWrapper = styled.div`
  position: relative;
  width: 180px; 
  height: 180px;
  margin-bottom: 2rem;
`;

// Aquí estaba el error. Usamos el helper 'css' en cada caso.
const Cuadrante = styled.div`
  position: absolute;
  width: 50%;
  height: 50%;
  background-image: url(${logo});
  background-size: 200% 200%;
  background-repeat: no-repeat;
  
  ${({ $pos }) => {
    switch ($pos) {
      case 'tl': // Top Left
        return css`
          top: 0; left: 0;
          background-position: top left;
          animation: ${assembleTL} 2.5s ease-in-out infinite;
        `;
      case 'tr': // Top Right
        return css`
          top: 0; right: 0;
          background-position: top right;
          animation: ${assembleTR} 2.5s ease-in-out infinite;
        `;
      case 'bl': // Bottom Left
        return css`
          bottom: 0; left: 0;
          background-position: bottom left;
          animation: ${assembleBL} 2.5s ease-in-out infinite;
        `;
      case 'br': // Bottom Right
        return css`
          bottom: 0; right: 0;
          background-position: bottom right;
          animation: ${assembleBR} 2.5s ease-in-out infinite;
        `;
      default: return '';
    }
  }}
`;

const Glow = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 50%;
  animation: ${flash} 2.5s ease-in-out infinite;
  pointer-events: none;
`;

const LoadingText = styled.h2`
  color: #ffffff;
  font-family: 'Arial', sans-serif;
  font-size: 1.2rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  animation: ${pulseText} 2.5s ease-in-out infinite;
`;