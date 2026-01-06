import React from "react";
import styled from "styled-components";
import { RiListCheck, RiLayoutGridLine } from "react-icons/ri";
import { v } from "../../../styles/variables"; 

export function ViewToggle({ currentMode, onToggle }) {
  return (
    <ToggleContainer>
      <ToggleButton 
        $active={currentMode === 'list'} 
        onClick={() => onToggle('list')}
        title="Vista de Lista"
      >
        <RiListCheck />
      </ToggleButton>
      <ToggleButton 
        $active={currentMode === 'grid'} 
        onClick={() => onToggle('grid')}
        title="Vista de Grilla Semanal"
      >
        <RiLayoutGridLine />
      </ToggleButton>
    </ToggleContainer>
  );
}

const ToggleContainer = styled.div`
  display: flex;
  background: ${({theme}) => theme.bg3};
  border-radius: 8px;
  padding: 4px;
  border: 1px solid ${({theme}) => theme.bg4};
  gap: 4px;
  align-self: center;
`;

const ToggleButton = styled.button`
  background: ${({ theme, $active }) => $active ? v.colorPrincipal : 'transparent'};
  color: ${({ theme, $active }) => $active ? '#fff' : theme.text};
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background: ${({ theme, $active }) => $active ? v.colorPrincipal : theme.bg4};
  }
`;