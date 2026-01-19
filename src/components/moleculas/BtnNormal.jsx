import React from 'react';
import styled from "styled-components";
import { Icono } from "../atomos/Icono"; // <--- CORRECCIÓN: Importación directa para evitar ciclo

export const BtnNormal = ({ // <--- Exportación nombrada
  onClick,  // Cambiamos 'funcion' por el estándar 'onClick'
  children, // Usamos children para que puedas escribir dentro del botón
  titulo,   // Mantenemos compatibilidad por si acaso
  icono,
  disabled,
  width,
  type = "button"
}) => {
  return (
    <Container
      $width={width}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      <section className="content">
        {icono && <Icono>{icono}</Icono>}
        {/* Renderiza children si existe, si no, usa titulo */}
        <span className="btn">{children || titulo}</span>
      </section>
    </Container>
  );
}

const Container = styled.button`
  font-weight: 700;
  display: flex;
  font-size: 15px;
  padding: 10px 25px;
  border-radius: 16px;
  
  background-color: ${({ theme }) => theme.bg4};
  color: ${({ theme }) => theme.text};
  border: 2px solid ${({ theme }) => theme.color2};
  border-bottom: 5px solid ${({ theme }) => theme.color2};
  
  transform: translate(0, -3px);
  cursor: pointer;
  transition: 0.2s;
  transition-timing-function: linear;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.$width};

  .content {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  &:hover {
    filter: brightness(0.95);
    transform: translate(0, -4px);
  }

  &:active {
    transform: translate(0, 0);
    border-bottom: 2px solid ${({ theme }) => theme.color2};
  }

  &[disabled] {
    background-color: #646464;
    color: #ccc;
    cursor: no-drop;
    border-color: #444;
    box-shadow: none;
    transform: none;
  }
`;