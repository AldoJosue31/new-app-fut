import styled from "styled-components";

export const ContainerScroll = styled.div`
  /* Ocupa el espacio disponible por defecto, pero puedes limitar con props */
  width: 100%;
  height: ${(props) => props.$height || "100%"};
  max-height: ${(props) => props.$maxHeight || "none"};
  
  /* Configuración del overflow */
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 5px; /* Espacio para que el contenido no pegue con el scroll */

  /* --- Estilización del Scrollbar (Webkit: Chrome, Edge, Safari) --- */
  &::-webkit-scrollbar {
    width: 5px; /* Más delgado para mejor estética */
    height: 5px; /* Para scroll horizontal si hubiera */
  }

  /* El riel (track) */
  &::-webkit-scrollbar-track {
    background: transparent; /* Invisible para sensación de aire */
    border-radius: 4px;
    margin: 5px 0; /* Margen superior/inferior */
  }

  /* La barra (thumb) */
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colorScroll}; /* Usa tu variable de tema existente */
    border-radius: 4px;
    transition: background 0.3s ease;
  }

  /* UX: Feedback al pasar el mouse sobre el scroll */
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.text}; /* Se oscurece ligeramente (según tema) para indicar interacción */
    opacity: 0.8;
  }

  /* --- Soporte Firefox --- */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.colorScroll} transparent;
`;