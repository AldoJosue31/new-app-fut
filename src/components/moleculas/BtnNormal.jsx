import styled from "styled-components";
import { Icono } from "../../index";

export function BtnNormal({
  funcion,
  titulo,
  icono,
  disabled,
  width
}) {
  return (
    <Container
      $width={width}
      disabled={disabled}
      onClick={funcion}
      type="button"
    >
      <section className="content">
        {icono && <Icono>{icono}</Icono>}
        {titulo && <span className="btn">{titulo}</span>}
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
  
  /* --- COLORES DINÁMICOS DEL TEMA --- */
  background-color: ${({ theme }) => theme.bg4}; /* Gris claro en Light, Gris oscuro en Dark */
  color: ${({ theme }) => theme.text};           /* Texto oscuro en Light, Blanco en Dark */
  border: 2px solid ${({ theme }) => theme.color2};
  border-bottom: 5px solid ${({ theme }) => theme.color2}; /* Efecto 3D sutil */
  
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

  /* Efecto Hover para mejorar feedback */
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