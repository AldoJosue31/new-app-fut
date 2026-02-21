import React, { useState } from "react";
import styled, { css } from "styled-components";
import { RiAddCircleLine } from "react-icons/ri";
import { v } from "../../../../../styles/variables";
import { formatDateWithWeekday, addDaysToDate } from "../../../../../utils/dateUtils";

export const DaySeparatorDropZone = ({ baseDate, onDropAction, isConfirmed }) => {
    const [isOver, setIsOver] = useState(false);
    
    // Calculamos el día siguiente
    const nextDate = addDaysToDate(baseDate, 1);
    const label = formatDateWithWeekday(nextDate);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation(); 
        if (!isConfirmed) setIsOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        if (!isConfirmed) {
            onDropAction(nextDate);
        }
    };

    if (isConfirmed) return <Spacer />;

    return (
        <SeparatorContainer
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            $isOver={isOver}
        >
            <div className="content">
                <div className="line"></div>
                <div className="pill">
                    {isOver ? (
                        <>
                            <RiAddCircleLine size={18} />
                            <span>Crear nuevo grupo: {label}</span>
                        </>
                    ) : (
                        <span className="hint">Arrastra aquí para {label}</span>
                    )}
                </div>
                <div className="line"></div>
            </div>
        </SeparatorContainer>
    );
};

const Spacer = styled.div` height: 10px; `;

const SeparatorContainer = styled.div`
    width: 100%; margin-top: 5px; margin-bottom: 5px; min-height: 15px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; cursor: default;
    .content { width: 100%; display: flex; align-items: center; gap: 10px; opacity: 0; transform: scaleY(0.8); transition: all 0.2s ease; }
    .line { height: 1px; flex: 1; background: ${v.colorPrincipal}; opacity: 0.3; }
    .pill { background: ${({theme}) => theme.bg3}; border: 1px dashed ${v.colorPrincipal}; border-radius: 20px; padding: 4px 15px; font-size: 0.8rem; color: ${v.colorPrincipal}; font-weight: 600; display: flex; align-items: center; gap: 6px; white-space: nowrap; .hint { display: none; } }
    ${({ $isOver }) => $isOver && css` min-height: 50px; .content { opacity: 1; transform: scaleY(1); } .pill { background: ${v.colorPrincipal}20; border-style: solid; transform: scale(1.05); box-shadow: 0 4px 10px rgba(0,0,0,0.1); } `}
    &:hover { ${({ $isOver }) => !$isOver && css` .content { opacity: 0.4; } .pill { border-color: transparent; background: transparent; } .hint { display: block; font-size: 0.7rem; } `} }
`;