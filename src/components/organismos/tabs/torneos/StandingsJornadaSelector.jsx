import React from 'react';
import styled from 'styled-components';
import { v } from '../../../../styles/variables';

export const StandingsJornadaSelector = ({ 
  selected, 
  onChange, 
  effectiveJornada,
  jornadasOptions = [] 
}) => {
  const options = Array.isArray(jornadasOptions) ? jornadasOptions : [];

  return (
    <SelectorContainer>
      <SelectWrapper>
        <StyledSelect
          value={selected}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="recent">Vista Actual (J. {effectiveJornada})</option>

          {options.length > 0 && (
            <optgroup label="Historial de Jornadas">
              {options.map(j => {
                // Formato exacto solicitado: "Jornada X (Con Y partidos pendientes)"
                const textoPendientes = j.pendientes > 0 
                  ? ` (Con ${j.pendientes} partido${j.pendientes > 1 ? 's' : ''} pendiente${j.pendientes > 1 ? 's' : ''})` 
                  : '';

                return (
                  <option key={j.num} value={j.num}>
                    {`Jornada ${j.num}${textoPendientes}`}
                  </option>
                );
              })}
            </optgroup>
          )}
        </StyledSelect>
      </SelectWrapper>
    </SelectorContainer>
  );
};

const SelectorContainer = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
  justify-content: center;
`;

const SelectWrapper = styled.div`
  max-width: 280px;
  min-width: 150px;
  width: 100%;
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.color2};
  background-color: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: all 0.3s ease;
  text-overflow: ellipsis;

  &:focus { border-color: ${v.primary}; }

  @media (max-width: 600px) {
    font-size: 0.75rem;
    padding: 6px 10px;
  }
`;