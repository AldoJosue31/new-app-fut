import React, { useRef, memo } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { RiArrowLeftSLine, RiArrowRightSLine, RiSettings4Line, RiEdit2Line } from "react-icons/ri";
import { ViewToggle } from "../../../../../index"; 
import { addDaysToDate } from "../../../../../utils/dateUtils";

export const PlanningHeader = memo(({ 
    jornadaIndex, status, onPrev, onNext, totalJornadas, 
    weekStartDate, setWeekStartDate,
    onConfig, viewMode, onToggleView,
    onEditFixture, 
    isTournamentActive 
}) => {
    const dateInputRef = useRef(null);
    
    const formatCustomDate = (dateInput) => {
        if (!dateInput) return "??/??/??";
        if (typeof dateInput === 'string' && dateInput.includes('-')) {
            const [y, m, d] = dateInput.split('-');
            return `${d}/${m}/${y.slice(-2)}`;
        }
        if (dateInput instanceof Date) {
            const d = String(dateInput.getDate()).padStart(2, '0');
            const m = String(dateInput.getMonth() + 1).padStart(2, '0');
            const y = String(dateInput.getFullYear()).slice(-2);
            return `${d}/${m}/${y}`;
        }
        return "??/??/??";
    };

    const endDate = addDaysToDate(weekStartDate, 6);
    const isConfirmed = status === 'Confirmada';

    const triggerDatePicker = () => {
        if(dateInputRef.current) {
            if(dateInputRef.current.showPicker) {
                dateInputRef.current.showPicker();
            } else {
                dateInputRef.current.focus();
                dateInputRef.current.click(); 
            }
        }
    };

    return (
        <Container>
            <InfoGroup>
                <NavRow>
                    <NavBtn onClick={onPrev} disabled={jornadaIndex === 0}>
                        <RiArrowLeftSLine size={24}/>
                    </NavBtn>
                    <Title $status={status}>
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
                        <div className="input-wrapper" onClick={triggerDatePicker}>
                            <span className="fake-input">{formatCustomDate(weekStartDate)}</span>
                            <input 
                                ref={dateInputRef}
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
                {isTournamentActive && (
                    <BtnAction onClick={onEditFixture} title="Reorganizar partidos futuros">
                        <RiEdit2Line size={20}/>
                    </BtnAction>
                )}
                
                <BtnAction onClick={onConfig} title="Configuración de Jornada">
                    <RiSettings4Line size={20}/>
                </BtnAction>
                
                <div className="separator"></div>
                <ViewToggle currentMode={viewMode} onToggle={onToggleView} />
            </ActionsGroup>
        </Container>
    );
});

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
  
  /* Estilo mejorado para el wrapper del input */
  .input-wrapper {
      position: relative; 
      display: inline-flex; /* Flex para mejor alineación */
      align-items: center;
      justify-content: center;
      min-width: 85px; 
      /* Quitamos el height fijo para que se adapte al contenido */
      padding: 0 4px; /* Un poco de padding horizontal extra */
      text-align: center; 
      cursor: pointer;
      
      /* Efecto hover para indicar que es clickeable */
      transition: background 0.2s;
      border-radius: 4px;
      &:hover {
          background: ${({theme}) => theme.bg4};
      }

      .fake-input { 
          font-weight: 800; 
          color: ${v.colorPrincipal}; 
          font-size: 0.95rem; 
          border-bottom: 2px dashed ${v.colorPrincipal}; 
          padding-bottom: 2px; 
          display: block; 
          width: 100%; 
          pointer-events: none; /* Asegura que el click pase al wrapper */
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
      }
  }
  
  @media (max-width: 768px) { justify-content: center; width: 100%; }
`;

const BtnAction = styled.button`
  background: ${({theme})=>theme.bg4}; border: none; border-radius: 8px; width: 42px; height: 42px;
  display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${({theme})=>theme.text}; transition: all 0.2s;
  &:hover { background: ${v.colorPrincipal}20; color: ${v.colorPrincipal}; transform: translateY(-2px); }
`;