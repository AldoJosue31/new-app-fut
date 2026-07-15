import styled from "styled-components";
import { Icono } from "../atomos/Icono";
import { v } from "../../styles/variables";

export function BtnGreen({
  funcion,
  onClick,   // Agregamos soporte para onClick estándar
  titulo,
  children,  // Agregamos soporte para texto como hijo
  icono,
  disabled,
  width
}) {
  return (
    <Container
      $width={width}
      disabled={disabled}
      // Priorizamos onClick, si no existe usa funcion
      onClick={onClick || funcion} 
      type="button"
    >
      <section className="content">
        {icono && <Icono>{icono}</Icono>}
        {/* Renderiza children (ej. <Btn>Texto</Btn>) o titulo (ej. titulo="Texto") */}
        <span className="btn">{children ? children : titulo}</span>
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
  
  /* --- COLORES VERDES --- */
  background-color: ${v.verde}; 
  color: #ffffff;
  border: 2px solid ${v.verde};
  border-bottom: 5px solid #3a8e3d; 
  
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
    filter: brightness(1.1); 
    transform: translate(0, -4px);
  }

  &:active {
    transform: translate(0, 0);
    border-bottom: 2px solid #3a8e3d;
  }

  &[disabled] {
    background-color: #646464;
    color: #ccc;
    cursor: no-drop;
    border-color: #444;
    border-bottom-color: #333;
    box-shadow: none;
    transform: none;
  }
`;
