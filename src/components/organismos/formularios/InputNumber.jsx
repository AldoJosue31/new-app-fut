import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";

export function InputNumber({ 
  value, 
  onChange, 
  name, 
  min = 0, 
  max = 999, 
  step = 1 
}) {
  const [animate, setAnimate] = useState(false);

  // Efecto de rebote cuando cambia el valor
  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 200);
    return () => clearTimeout(timer);
  }, [value]);

  const emitChange = (newValue) => {
    // Validamos límites
    if (newValue < min) newValue = min;
    if (newValue > max) newValue = max;
    
    // Simulamos evento nativo para que funcione con tus formularios existentes
    const event = {
      target: {
        name: name,
        value: newValue
      }
    };
    onChange(event);
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    emitChange(Number(value) + step);
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    emitChange(Number(value) - step);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Si está vacío permitimos borrar, si no, convertimos
    if (val === "") {
        onChange({ target: { name, value: "" } }); 
        return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) emitChange(num);
  };

  return (
    <Container>
      <StyledInput
        type="text" // Usamos text para control total (evitar scroll del mouse nativo si se desea)
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleInputChange}
        $animate={animate}
        autoComplete="off"
      />
      <Controls>
        <ArrowBtn onClick={handleIncrement} tabIndex="-1">
          <IoIosArrowUp />
        </ArrowBtn>
        <ArrowBtn onClick={handleDecrement} tabIndex="-1">
          <IoIosArrowDown />
        </ArrowBtn>
      </Controls>
    </Container>
  );
}

// --- ESTILOS ---

const popAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.2); color: #1cb0f6; } /* Color de énfasis momentáneo */
  100% { transform: scale(1); }
`;

const Container = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100px; /* Ancho compacto por defecto */
  height: 45px;
  background: ${({ theme }) => theme.bgtotal};
  border: 2px solid ${({ theme }) => theme.color2};
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: ${({ theme }) => theme.primary || "#1cb0f6"};
  }
`;

const StyledInput = styled.input`
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  outline: none;
  padding-right: 25px; /* Espacio para las flechas */
  font-family: inherit;

  /* Animación condicional */
  ${({ $animate }) => $animate && css`
    animation: ${popAnimation} 0.2s ease-in-out;
  `}

  /* Eliminar spinners nativos si cambiamos a type number */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const Controls = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 28px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid ${({ theme }) => theme.color2};
`;

const ArrowBtn = styled.button`
  flex: 1;
  border: none;
  background: ${({ theme }) => theme.bgcards}; 
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background 0.2s;
  outline: none;

  &:hover {
    background: ${({ theme }) => theme.bg4};
  }
  
  &:active {
    background: ${({ theme }) => theme.primary}40; /* Tint suave al click */
  }

  /* Bordes internos para separar botones */
  &:first-child {
    border-bottom: 1px solid ${({ theme }) => theme.color2};
  }
  
  svg { opacity: 0.7; }
  &:hover svg { opacity: 1; }
`;