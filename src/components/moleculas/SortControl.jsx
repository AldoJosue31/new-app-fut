import React from 'react';
import styled from 'styled-components';
import { v } from '../../styles/variables'; // Asegúrate de que la ruta sea correcta
import { RiArrowUpLine, RiArrowDownLine, RiSortDesc } from "react-icons/ri";

export function SortControl({ options, currentSort, onSortChange }) {
  return (
    <Container>
        <span className="label"><RiSortDesc/> Ordenar por:</span>
        <div className="options-group">
            {options.map((option) => {
                const isActive = currentSort?.key === option.key;
                return (
                    <SortButton 
                        key={option.key} 
                        $active={isActive}
                        onClick={() => onSortChange(option.key, option.customOrder)}
                    >
                        {option.label}
                        {isActive && (
                            <span className="icon">
                                {currentSort.direction === 'ascending' ? <RiArrowUpLine/> : <RiArrowDownLine/>}
                            </span>
                        )}
                    </SortButton>
                );
            })}
        </div>
    </Container>
  );
}

const Container = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;

    .label {
        font-size: 0.85rem;
        font-weight: 600;
        color: ${({theme}) => theme.text};
        opacity: 0.7;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .options-group {
        display: flex;
        gap: 8px;
    }
`;

const SortButton = styled.button`
    background: ${({ $active, theme }) => $active ? v.colorPrincipal : theme.bgcards};
    color: ${({ $active, theme }) => $active ? '#fff' : theme.text};
    border: 1px solid ${({ $active, theme }) => $active ? v.colorPrincipal : theme.bg4};
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s ease;

    &:hover {
        border-color: ${v.colorPrincipal};
        transform: translateY(-1px);
    }

    .icon {
        display: flex;
        align-items: center;
    }
`;