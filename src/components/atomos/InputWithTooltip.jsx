import React from 'react';
import styled from 'styled-components';
import { Tooltip } from '../../components/atomos/Tooltip'; 
import { RiInformationLine, RiAlertFill } from 'react-icons/ri';

/**
 * Componente que envuelve un input y coloca un icono de tooltip 
 * FLOTANDO en el interior del lado derecho, evitando scroll y desbordamientos.
 */
export const InputWithTooltip = ({ 
  children, 
  tooltip, 
  warning, 
  label 
}) => {
  return (
    <Container>
      {/* Label opcional fuera del input */}
      {label && <Label>{label}</Label>}
      
      <RelativeWrapper>
        {/* El Input original (children) */}
        {children}

        {/* LÓGICA DE ICONOS FLOTANTES (Absolute) 
            Se posicionan "dentro" del input visualmente.
        */}
        <FloatingIconWrapper>
            {warning ? (
              <Tooltip text={warning} position="left">
                <IconBox $type="warning">
                  <RiAlertFill />
                </IconBox>
              </Tooltip>
            ) : tooltip ? (
              <Tooltip text={tooltip} position="left">
                <IconBox $type="info">
                  <RiInformationLine />
                </IconBox>
              </Tooltip>
            ) : null}
        </FloatingIconWrapper>
      </RelativeWrapper>
    </Container>
  );
};

// --- STYLES ---

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  opacity: 0.8;
  color: ${({ theme }) => theme.text};
  margin-left: 5px;
`;

const RelativeWrapper = styled.div`
  position: relative; /* Clave para que el icono se posicione respecto a esto */
  width: 100%;
  display: flex; 
  align-items: center;
`;

const FloatingIconWrapper = styled.div`
  position: absolute;
  right: 12px; /* Pegado al borde derecho interno */
  top: 50%;
  transform: translateY(-50%); /* Centrado vertical perfecto */
  z-index: 10; /* Asegura que quede encima del input */
  
  /* Ajuste fino: dependiendo de tu InputText2, puede que necesites subirlo un poco 
     si el input tiene label flotante interno que desplaza el contenido.
     Si se ve muy abajo, prueba cambiar 'top: 50%' por 'top: 40%' */
  margin-top: -2px; 
`;

const IconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px; /* Tamaño del icono */
  cursor: help;
  transition: all 0.2s;
  
  /* Color según tipo */
  color: ${({ theme, $type }) => $type === 'warning' ? '#ffcc00' : theme.text};
  opacity: ${({ $type }) => $type === 'warning' ? 1 : 0.5};
  
  /* Fondo suave para que no se mezcle con texto largo del input */
  background: ${({ theme }) => theme.bgtotal || theme.bg2}; 
  border-radius: 50%;
  padding: 2px;
  box-shadow: -5px 0 10px -5px rgba(0,0,0,0.1); /* Sombra sutil izquierda */

  &:hover {
    opacity: 1;
    transform: scale(1.1);
    color: ${({ theme, $type }) => $type === 'info' ? '#1cb0f6' : '#ffcc00'};
  }
`;

export default InputWithTooltip;