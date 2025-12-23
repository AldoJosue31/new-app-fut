import React from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { useDivisionStore } from "../../store/DivisionStore";
import { IoIosArrowDown } from "react-icons/io";

export function DivisionSelector({ isOpen }) {
  const { selectedDivision, setDivision } = useDivisionStore();

  // En el futuro, podrías traer esto de una tabla 'divisions' en Supabase
  const divisiones = ["Primera", "Segunda", "Femenil", "Copa"];

  return (
    <Container $isOpen={isOpen}>
      <div className="label">División Actual:</div>
      <SelectWrapper>
        <select 
          value={selectedDivision} 
          onChange={(e) => setDivision(e.target.value)}
        >
          {divisiones.map((div) => (
            <option key={div} value={div}>{div}</option>
          ))}
        </select>
        <div className="icon">
          <IoIosArrowDown />
        </div>
      </SelectWrapper>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  padding: ${({ $isOpen }) => $isOpen ? "0 12px" : "0"};
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  
  /* Truco para ocultarlo suavemente si el sidebar se cierra */
  opacity: ${({ $isOpen }) => $isOpen ? "1" : "0"};
  height: ${({ $isOpen }) => $isOpen ? "auto" : "0"};
  pointer-events: ${({ $isOpen }) => $isOpen ? "all" : "none"};
  overflow: hidden;

  .label {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.text};
    opacity: 0.6;
    margin-bottom: 6px;
    font-weight: 600;
    white-space: nowrap;
  }
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
  background: ${({ theme }) => theme.bg3}; 
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.bg4};
  
  &:hover {
    border-color: ${({ theme }) => theme.primary || v.colorPrincipal};
  }

  select {
    width: 100%;
    padding: 10px 35px 10px 12px;
    appearance: none;
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.text};
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    outline: none;

    option {
      background: ${({ theme }) => theme.bgcards};
      color: ${({ theme }) => theme.text};
    }
  }

  .icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: ${({ theme }) => theme.primary || v.colorPrincipal};
    font-size: 1.1rem;
  }
`;