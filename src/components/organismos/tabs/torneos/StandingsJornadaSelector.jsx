import React from 'react';
import styled from 'styled-components';
import { v } from '../../../../styles/variables';

export const StandingsJornadaSelector = ({ 
  selected, 
  onChange, 
  current, 
  lastConfirmed, 
  jornadas 
}) => {
  if (!jornadas || jornadas.length === 0) return null;

  return (
    <SelectorContainer>
      <TitleBlock>
        <h4>Tabla General</h4>
        <p>Filtrar por jornada</p>
      </TitleBlock>
      
      <SelectWrapper>
        <StyledSelect
          value={selected}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="recent">Lo más reciente (Jornada {current})</option>
          {lastConfirmed && (
             <option value="confirmed">Última confirmada (Jornada {lastConfirmed})</option>
          )}
          <optgroup label="Histórico de Jornadas">
            {jornadas.map(j => (
              <option key={j} value={j}>Jornada {j}</option>
            ))}
          </optgroup>
        </StyledSelect>
      </SelectWrapper>
    </SelectorContainer>
  );
};

const SelectorContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 98%;
  max-width: 900px;
  margin: 0 auto 15px auto;
  background: ${({ theme }) => theme.bg};
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.color2};
  box-shadow: ${v.boxshadowGray};
  gap: 10px;
  flex-wrap: wrap;
`;

const TitleBlock = styled.div`
  h4 { margin: 0; font-size: 1rem; color: ${({ theme }) => theme.text}; font-weight: 700; }
  p { margin: 0; font-size: 0.75rem; color: ${({ theme }) => theme.text}80; }
`;

const SelectWrapper = styled.div`
  flex-grow: 1;
  max-width: 300px;
  min-width: 200px;
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.color2};
  background-color: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  &:focus { border-color: ${v.primary}; }
`;