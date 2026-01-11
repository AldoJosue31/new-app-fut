import React from "react";
import styled from "styled-components";
import { BtnNormal } from "../../../../../index";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCalendarEventLine } from "react-icons/ri";

export function PlanningHeader({ 
  jornadaIndex, 
  status, 
  onPrev, 
  onNext, 
  totalJornadas,
  weekStartDate,
  setWeekStartDate,
  lastMatchDate
}) {
  const isConfirmed = status === 'Confirmada';

  // Función para convertir YYYY-MM-DD a DD/MM/YY
  const formatShortDate = (dateStr) => {
    if (!dateStr) return "---";
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year.slice(-2)}`;
  };

  return (
    <Container>
      <div className="left-section">
         <div className="step-info">
            <span className="step-title">Jornada {jornadaIndex + 1}</span>
            <span className={`status-pill ${isConfirmed ? 'ok' : 'draft'}`}>
                {status}
            </span>
         </div>

         <div className="week-range">
            <RiCalendarEventLine />
            <span>Semana del </span>
            {isConfirmed ? (
                <strong className="date-text">{formatShortDate(weekStartDate)}</strong>
            ) : (
                <input 
                    type="date" 
                    className="week-input"
                    value={weekStartDate} 
                    onChange={(e) => setWeekStartDate(e.target.value)}
                />
            )}
            <span> al </span>
            <strong className="date-text">{formatShortDate(lastMatchDate)}</strong>
         </div>
      </div>

      <div className="controls">
         <BtnNormal 
           icono={<RiArrowLeftSLine/>} 
           funcion={onPrev} 
           disabled={jornadaIndex === 0} 
         />
         <BtnNormal 
           icono={<RiArrowRightSLine/>} 
           funcion={onNext} 
           disabled={jornadaIndex === totalJornadas - 1} 
         />
      </div>
    </Container>
  );
}

const Container = styled.div` 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background: ${({theme})=>theme.bgcards}; 
    padding: 15px 20px; 
    border-radius: 12px; 
    border: 1px solid ${({theme})=>theme.bg4};
    gap: 15px;
    width: 100%;
    box-sizing: border-box;

    @media (max-width: 768px) {
        flex-direction: column; /* Apilar en móvil */
        align-items: flex-start;
        padding: 15px;
    }

    .left-section { 
        display: flex; 
        flex-direction: column; 
        gap: 10px; 
        width: 100%;
    }

    .step-info { 
        display: flex; 
        align-items: center; 
        gap: 10px; 
        font-weight: 700; 
        font-size: 1.1rem; 
    }

    .week-range { 
        display: flex; 
        flex-wrap: wrap; /* Permite que la fecha baje si no cabe */
        align-items: center; 
        gap: 8px; 
        font-size: 0.85rem; 
        opacity: 0.9;
        
        .week-input {
            background: ${({theme})=>theme.bg3}; 
            border: 1px solid ${({theme})=>theme.bg4};
            color: ${({theme})=>theme.text}; 
            border-radius: 6px; 
            padding: 4px 8px;
            font-size: 0.85rem;
            outline: none;
        }
    }

    .controls { 
        display: flex; 
        gap: 10px; 
        width: 100%;
        justify-content: flex-end;

        @media (max-width: 768px) {
            justify-content: space-between; /* Botones a los lados en móvil */
            border-top: 1px solid ${({theme})=>theme.bg4};
            padding-top: 10px;
        }
    }
`;