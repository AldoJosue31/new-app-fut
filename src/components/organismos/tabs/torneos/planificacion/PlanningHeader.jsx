import React from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { RiArrowLeftSLine, RiArrowRightSLine, RiSettings4Line } from "react-icons/ri";
import { ViewToggle } from "../../../../../index"; 

export function PlanningHeader({ 
    jornadaIndex, status, onPrev, onNext, totalJornadas, 
    weekStartDate, setWeekStartDate,
    onConfig, viewMode, onToggleView
}) {
    
    // Función auxiliar para sumar días (retorna objeto Date)
    const addDays = (dateStr, days) => {
        if(!dateStr) return null;
        const d = new Date(dateStr + "T00:00:00");
        d.setDate(d.getDate() + days);
        return d;
    };

    // Función auxiliar para formatear a dd/mm/yy
    const formatCustomDate = (dateInput) => {
        if (!dateInput) return "??/??/??";
        
        // Si viene como string YYYY-MM-DD
        if (typeof dateInput === 'string' && dateInput.includes('-')) {
            const [y, m, d] = dateInput.split('-');
            return `${d}/${m}/${y.slice(-2)}`;
        }
        
        // Si es objeto Date
        if (dateInput instanceof Date) {
            const d = String(dateInput.getDate()).padStart(2, '0');
            const m = String(dateInput.getMonth() + 1).padStart(2, '0');
            const y = String(dateInput.getFullYear()).slice(-2);
            return `${d}/${m}/${y}`;
        }
        return "??/??/??";
    };

    const endDate = addDays(weekStartDate, 6);
    const isConfirmed = status === 'Confirmada';

    return (
        <Container>
            <InfoGroup>
                <NavRow>
                    <NavBtn onClick={onPrev} disabled={jornadaIndex === 0}>
                        <RiArrowLeftSLine size={24}/>
                    </NavBtn>
                    <Title>
                        <span>Jornada {jornadaIndex + 1}</span>
                        <small>{status}</small>
                    </Title>
                    <NavBtn onClick={onNext} disabled={jornadaIndex === totalJornadas - 1}>
                        <RiArrowRightSLine size={24}/>
                    </NavBtn>
                </NavRow>

                <DateRow>
                    <span className="label-text">Semana del</span>
                    
                    {isConfirmed ? (
                        <span className="static-date">{formatCustomDate(weekStartDate)}</span>
                    ) : (
                        <div className="input-wrapper">
                             {/* Texto visible dd/mm/yy */}
                            <span className="fake-input">{formatCustomDate(weekStartDate)}</span>
                            {/* Input invisible que cubre todo el área para clickear */}
                            <input 
                                type="date" 
                                value={weekStartDate || ''} 
                                onChange={(e) => setWeekStartDate(e.target.value)}
                            />
                        </div>
                    )}

                    <span className="label-text">al</span>
                    <span className="static-date">{formatCustomDate(endDate)}</span>
                </DateRow>
            </InfoGroup>

            <ActionsGroup>
                <BtnConfig onClick={onConfig} title="Configuración de Jornada">
                    <RiSettings4Line size={20}/>
                </BtnConfig>
                <div className="separator"></div>
                <ViewToggle currentMode={viewMode} onToggle={onToggleView} />
            </ActionsGroup>
        </Container>
    );
}

// --- Styled Components ---

const Container = styled.div`
  background: ${({theme})=>theme.bg3};
  padding: 15px;
  border-radius: 10px;
  display: flex; flex-direction: column; gap: 15px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  @media (min-width: 768px) { flex-direction: row; justify-content: space-between; align-items: center; }
`;

const InfoGroup = styled.div`
  display: flex; flex-direction: column; gap: 15px; flex: 1;
  @media (min-width: 768px) { flex-direction: row; align-items: center; gap: 25px; }
`;

const ActionsGroup = styled.div`
  display: flex; gap: 12px; align-items: center; justify-content: flex-end;
  .separator { width: 1px; height: 25px; background: ${({theme})=>theme.bg4}; margin: 0 5px; display: none; @media (min-width: 768px) { display: block; } }
  @media (max-width: 768px) { justify-content: space-between; border-top: 1px solid ${({theme})=>theme.bg4}; padding-top: 15px; width: 100%; }
`;

const NavRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 15px;
  @media (min-width: 768px) { justify-content: flex-start; }
`;

const Title = styled.div`
  display: flex; flex-direction: column; align-items: center;
  span { font-weight: 800; font-size: 1.1rem; color: ${({theme})=>theme.text}; }
  small { 
      font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
      color: ${({status, theme})=> status === 'Confirmada' ? '#2ecc71' : theme.text}; opacity: ${({status})=> status === 'Confirmada' ? 1 : 0.6}; 
  }
`;

const NavBtn = styled.button`
  background: ${({theme})=>theme.bg4}; border: none; width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${({theme})=>theme.text}; transition: all 0.2s;
  &:disabled { opacity: 0.3; cursor: not-allowed; }
  &:hover:not(:disabled) { background: ${v.colorPrincipal}; color: white; transform: scale(1.1); }
`;

const DateRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  background: ${({theme})=>theme.bgcards};
  padding: 8px 15px;
  border-radius: 8px;
  border: 1px solid ${({theme})=>theme.bg4};
  font-family: 'Nunito', sans-serif;
  flex-wrap: wrap;

  .label-text { font-size: 0.9rem; font-weight: 600; color: ${({theme})=>theme.text}; opacity: 0.8; }
  .static-date { font-weight: 800; color: ${v.colorPrincipal}; font-size: 0.95rem; }

  .input-wrapper {
      position: relative;
      display: inline-block;
      min-width: 85px; 
      height: 24px;
      text-align: center;
      cursor: pointer;

      .fake-input {
          font-weight: 800; color: ${v.colorPrincipal}; font-size: 0.95rem;
          border-bottom: 2px dashed ${v.colorPrincipal};
          padding-bottom: 2px;
          display: block;
          width: 100%;
      }

      input[type="date"] {
          position: absolute; 
          top: 0; 
          left: 0; 
          width: 100%; 
          height: 100%;
          opacity: 0; 
          cursor: pointer;
          z-index: 10;
          
          &::-webkit-calendar-picker-indicator { 
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            padding: 0;
            margin: 0;
            cursor: pointer; 
          }
      }
  }

  @media (max-width: 768px) { justify-content: center; width: 100%; }
`;

const BtnConfig = styled.button`
  background: ${({theme})=>theme.bg4}; border: none; border-radius: 8px; width: 42px; height: 42px;
  display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${({theme})=>theme.text}; transition: all 0.2s;
  &:hover { background: ${v.colorPrincipal}20; color: ${v.colorPrincipal}; transform: translateY(-2px); }
`;