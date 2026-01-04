import React from "react";
import styled from "styled-components";
import { BtnNormal } from "../../../../../index";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";

export function PlanningHeader({ 
  jornadaIndex, 
  status, 
  onPrev, 
  onNext, 
  totalJornadas 
}) {
  const isConfirmed = status === 'Confirmada';
  
  return (
    <Container>
      <div className="step-info">
         <span className="step-title">Jornada {jornadaIndex + 1}</span>
         <span className={`status-pill ${isConfirmed ? 'ok' : 'draft'}`}>
             {status}
         </span>
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
    display: flex; justify-content: space-between; align-items: center; 
    background: ${({theme})=>theme.bgcards}; 
    padding: 10px 20px; border-radius: 10px; border: 1px solid ${({theme})=>theme.bg4};
    .step-info { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.1rem; }
    .status-pill { font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; 
        &.ok{background:#2ecc7120; color:#2ecc71;} &.draft{background:#e74c3c20; color:#e74c3c;} 
    }
    .controls { display: flex; gap: 5px; }
`;