// src/components/moleculas/Btnsave.jsx
import styled, { keyframes } from "styled-components";
import { Icono } from "../atomos/Icono";
import { RiLoader4Line } from "react-icons/ri"; // Importamos un icono para el loading

export function Btnsave({
    funcion,
    titulo,
    bgcolor,
    icono,
    url,
    color,
    disabled, 
    width,
    loading // <-- Recibimos la prop loading
}) {
    return (
        <Container 
            $width={width}
            disabled={disabled || loading} // Deshabilitamos el botón si está cargando
            $color={color}
            type="submit"
            $bgcolor={bgcolor}
            onClick={funcion}
        >
            <section className="content">
                {loading ? (
                    <>
                        <SpinnerIcon><RiLoader4Line /></SpinnerIcon>
                        <span className="btn">Guardando...</span>
                    </>
                ) : (
                    <>
                        <Icono $color={color}>{icono}</Icono>
                        {titulo && (
                            <span className="btn">
                                {url ? (
                                    <a href={url} target="_blank" rel="noreferrer">
                                        {titulo}
                                    </a>
                                ) : (
                                    titulo
                                )}
                            </span>
                        )}
                    </>
                )}
            </section>
        </Container>
    );
}

// Animación de giro para el loading
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  animation: ${spin} 1s linear infinite; /* Aplica la animación */
`;

const Container = styled.button`
  font-weight: 700;
  display: flex;
  font-size: 15px;
  padding: 10px 25px;
  border-radius: 16px;
  background-color: ${(props) => props.$bgcolor};
  border: 2px solid rgba(50, 50, 50, 0.2);
  border-bottom: 5px solid rgba(50, 50, 50, 0.2);
  transform: translate(0, -3px);
  cursor: pointer;
  transition: 0.2s;
  transition-timing-function: linear;
  color: rgb(${(props) => props.$color});
  align-items: center;
  justify-content: center;
  width: ${(props) => props.$width};
  
  .content {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  
  &:active {
    transform: translate(0, 0);
    border-bottom: 2px solid rgba(50, 50, 50, 0.5);
  }
  
  &[disabled] {
    background-color: #646464;
    cursor: not-allowed;
    box-shadow: none;
    opacity: 0.8;
    transform: translate(0, 0);
    border-bottom: 2px solid rgba(50, 50, 50, 0.2);
  }
`;