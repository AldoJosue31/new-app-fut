// src/components/atomos/ContainerScroll.jsx
import styled from "styled-components";

export const ContainerScroll = styled.div`
  /* Ocupa el espacio disponible por defecto, pero puedes limitar con props */
  width: 100%;
  height: ${(props) => props.$height || "100%"};
  max-height: ${(props) => props.$maxHeight || "none"};
  
  /* Configuración del overflow */
  overflow-y: auto;
  
  /* CORRECCIÓN ÓPTIMA: 
     Cambiamos hidden por auto para permitir que las tablas grandes 
     puedan desplazarse lateralmente en dispositivos móviles. */
  overflow-x: auto; 
  -webkit-overflow-scrolling: touch; /* Mejora la fluidez del scroll en iOS */
  
  padding-right: 5px; /* Espacio para que el contenido no pegue con el scroll */

  /* --- Estilización del Scrollbar (Webkit: Chrome, Edge, Safari) --- */
  &::-webkit-scrollbar {
    width: 5px; /* Más delgado para mejor estética vertical */
    height: 6px; /* Altura del scroll horizontal para que sea fácil de tocar */
  }

  /* El riel (track) */
  &::-webkit-scrollbar-track {
    background: transparent; 
    border-radius: 4px;
    margin: 5px 0;
  }

  /* La barra (thumb) */
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colorScroll}; 
    border-radius: 4px;
    transition: background 0.3s ease;
  }

  /* UX: Feedback al pasar el mouse sobre el scroll */
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.text}; 
    opacity: 0.8;
  }

  /* --- Soporte Firefox --- */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.colorScroll} transparent;
`;