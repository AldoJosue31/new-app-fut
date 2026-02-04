import React from 'react';
import styled from 'styled-components';
import { v } from '../../styles/variables';
import { RiArrowUpLine, RiArrowDownLine, RiSortDesc } from "react-icons/ri";

export function SortControl({ options, currentSort, onSortChange }) {
  return (
    <Container>
        <span className="label" title="Ordenar por">
            <RiSortDesc size={18}/>
            <span className="label-text">Ordenar:</span>
        </span>
        <div className="options-group">
            {options.map((option) => {
                const isActive = currentSort?.key === option.key;
                return (
                    <SortButton 
                        key={option.key} 
                        $active={isActive}
                        onClick={() => onSortChange(option.key, option.customOrder)}
                        title={option.label}
                    >
                        <span className="btn-icon">{option.icon}</span>
                        <span className="btn-text">{option.label}</span>
                        {isActive && (
                            <span className="direction-indicator">
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
    /* Se elimina width: 100% para evitar que empuje otros elementos */

    .label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: ${({theme}) => theme.text};
        opacity: 0.6;
        font-weight: 600;
        font-size: 0.85rem;
        flex-shrink: 0;

        @media (max-width: 480px) {
            .label-text { display: none; } /* Solo icono en móviles muy pequeños */
        }
    }

    .options-group {
        display: flex;
        gap: 6px;
        flex-wrap: wrap; /* Permite que los botones bajen si no hay espacio */
    }
`;

const SortButton = styled.button`
    background: ${({ $active, theme }) => $active ? v.colorPrincipal : theme.bgtotal};
    color: ${({ $active, theme }) => $active ? '#fff' : theme.text};
    border: 1px solid ${({ $active, theme }) => $active ? v.colorPrincipal : theme.bg4};
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        border-color: ${v.colorPrincipal};
        transform: translateY(-1px);
    }

    .btn-icon {
        display: flex;
        align-items: center;
        font-size: 1rem;
    }

    .direction-indicator {
        display: flex;
        align-items: center;
        font-size: 0.9rem;
    }

    @media (max-width: 580px) {
        padding: 6px 10px;
        .btn-text { display: none; } /* Prioridad a los iconos */
        border-radius: 12px;
    }
`;