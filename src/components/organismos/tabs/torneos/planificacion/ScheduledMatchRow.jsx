import React, { memo, useMemo, useState, useRef } from "react";
import styled, { css } from "styled-components";
import { v } from "../../../../../index";
import { 
  RiDeleteBinLine, 
  RiTrophyLine, 
  RiTimeLine, 
  RiEditLine, 
  RiFileTextLine,
  RiPrinterLine 
} from "react-icons/ri";
import { Device } from "../../../../../styles/breakpoints";
import { formatTimeTo12Hour, formatDateWithWeekday } from "../../../../../utils/dateUtils";
// Importar los modales
import MatchSheetModal from "../exports/match-sheets/MatchSheetModal";
import { PreMatchSheetModal } from "../exports/match-sheets/PreMatchSheetModal";

const getPenaltyScore = (observations) => {
    if (!observations) return null;
    const regex = /Pen.*:\s*(\d+)\s*-\s*(\d+)/i;
    const match = observations.match(regex);
    if (match) {
        return { local: match[1], visit: match[2] };
    }
    return null;
};

export const ScheduledMatchRow = memo(function ScheduledMatchRow({ 
    match, 
    isConfirmed, 
    onUpdateDate, 
    onUpdateTime, 
    onRemove, 
    onOpenResult, 
    onPostpone,
    groupLabel,
    onDropOnDate 
}) {
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [showPreSheet, setShowPreSheet] = useState(false);
  
  // Referencia para evitar parpadeos en DnD
  const dragCounter = useRef(0);

  const penalties = useMemo(() => {
      if (isConfirmed && match.status === 'Finalizado') {
          return getPenaltyScore(match.observations);
      }
      return null;
  }, [match.observations, match.status, isConfirmed]);

  // --- MANEJADORES DE DRAG & DROP SIN PARPADEOS ---
  const handleDragEnter = (e) => {
      e.preventDefault();
      if (!isConfirmed) {
          dragCounter.current += 1;
          if (dragCounter.current === 1) setIsDragOver(true);
      }
  };

  const handleDragOver = (e) => {
      e.preventDefault(); 
  };

  const handleDragLeave = (e) => {
      e.preventDefault();
      if (!isConfirmed) {
          dragCounter.current -= 1;
          if (dragCounter.current === 0) setIsDragOver(false);
      }
  };

  const handleDrop = (e) => {
      e.preventDefault();
      dragCounter.current = 0; 
      setIsDragOver(false);
      
      if (!isConfirmed && onDropOnDate && match.date) {
          e.stopPropagation();
          onDropOnDate(match.date);
      }
  };

  const handleSaveSheet = (sheetData) => {
    console.log("Cédula guardada/actualizada:", sheetData);
    setShowSheet(false);
  };

  // Prevenir que intente mostrar 'Invalid Date' en el separador
  const displayLabel = (!match.date || String(groupLabel).includes('Invalid') || String(groupLabel).includes('NaN')) 
      ? 'Partidos definidos sin fecha (Default)' 
      : groupLabel;

  return (
    <>
        <Wrapper 
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {groupLabel && (
                <DateDivider>
                    <span>{displayLabel}</span>
                    <div className="line"></div>
                </DateDivider>
            )}

            <Container $isConfirmed={isConfirmed} $isDragOver={isDragOver}>
                {isDragOver && match.date && <DropOverlay>Añadir a esta fecha (+{formatDateWithWeekday(match.date)})</DropOverlay>}

                <div className="info">
                    {/* EQUIPO LOCAL */}
                    <div className="team local">
                        <span className="name">{match.homeTeam?.name || match.local?.name || "Equipo Local"}</span>
                        {isConfirmed && match.status === 'Finalizado' && (
                            <ScoreWrapper>
                                <span className="main-score">{match.goals1 || match.homeScore || 0}</span>
                                {penalties && <span className="pen-score">({penalties.local})</span>}
                            </ScoreWrapper>
                        )}
                    </div>

                    <span className="vs">VS</span>

                    {/* EQUIPO VISITANTE */}
                    <div className="team visit">
                        {isConfirmed && match.status === 'Finalizado' && (
                            <ScoreWrapper>
                                <span className="main-score">{match.goals2 || match.awayScore || 0}</span>
                                {penalties && <span className="pen-score">({penalties.visit})</span>}
                            </ScoreWrapper>
                        )}
                        <span className="name">{match.awayTeam?.name || match.visitante?.name || "Equipo Visitante"}</span>
                    </div>
                </div>

                <div className="settings">
                    {isConfirmed ? (
                        <div className="confirmed-actions">
                            <div className="datetime-display">
                                {match.date ? (
                                    <>
                                        <span className="date-text mobile-only">{formatDateWithWeekday(match.date)}</span>
                                        <small>{formatTimeTo12Hour(match.time)}</small>
                                    </>
                                ) : (
                                    <span className="no-date-badge">
                                        {match.observations === 'Victoria por default' ? 'Victoria Default' : 'Sin Fecha'}
                                    </span>
                                )}
                            </div>
                            <div className="btns-row">
                                <button className="action-btn result" onClick={() => onOpenResult(match)}>
                                    {match.status === 'Finalizado' ? <RiEditLine /> : <RiTrophyLine />}
                                    {match.status === 'Finalizado' ? 'Editar' : 'Resultado'}
                                </button>
                                
                                {match.status === 'Finalizado' ? (
                                    <button className="action-btn sheet" onClick={() => setShowSheet(true)}>
                                        <RiFileTextLine />
                                        Ver Cédula
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            className="action-btn print" 
                                            onClick={() => setShowPreSheet(true)}
                                            title="Imprimir Hoja de Alineación para Árbitro"
                                        >
                                            <RiPrinterLine />
                                            Pre-Cédula
                                        </button>

                                        <button className="action-btn postpone" onClick={() => onPostpone(match)}>       
                                            <RiTimeLine />
                                            Aplazar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {match.date ? (
                                <>
                                    <input 
                                        type="date" 
                                        className="input-date" 
                                        value={match.date || ''} 
                                        onChange={(e)=> onUpdateDate(e.target.value)} 
                                    />
                                    <input 
                                        type="time" 
                                        className="input-time" 
                                        value={match.time || ''} 
                                        onChange={(e)=> onUpdateTime(e.target.value)} 
                                    />
                                </>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <span className="no-date-badge" style={{ margin: '0 auto' }}>Victoria Default</span>
                                </div>
                            )}
                            <button className="del" onClick={onRemove} title="Desagendar">
                                <RiDeleteBinLine/>
                            </button>
                        </>
                    )}
                </div>
            </Container>
        </Wrapper>

        {/* Modal de Cédula Final */}
        <MatchSheetModal 
            isOpen={showSheet} 
            onClose={() => setShowSheet(false)} 
            match={match}
            onSaveSheet={handleSaveSheet}
        />

        {/* Modal de Pre-Cédula */}
        {showPreSheet && (
             <PreMatchSheetModal 
                isOpen={showPreSheet}
                onClose={() => setShowPreSheet(false)}
                matchId={match.id}
            />
        )}
    </>
  );
});

// --- ESTILOS ---
const Wrapper = styled.div`
    width: 100%;
    display: flex; flex-direction: column; gap: 10px; position: relative; 
    flex-shrink: 0; 
`;

const DateDivider = styled.div`
    display: flex; align-items: center; gap: 15px; padding-top: 15px; padding-bottom: 5px; width: 100%;
    span { font-weight: 800; color: ${({theme})=>theme.text1}; font-size: 1rem; text-transform: capitalize; white-space: nowrap; }
    .line { height: 1px; background: ${({theme})=>theme.bg4}; width: 100%; flex: 1; }
`;

const ScoreWrapper = styled.div`
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: ${({theme})=>theme.bg3}; padding: 2px 8px; border-radius: 4px; min-width: 30px;
    .main-score { font-size: 1.1rem; font-weight: 700; line-height: 1.2; }
    .pen-score { font-size: 0.75rem; font-weight: 600; color: ${({theme})=>theme.text}; opacity: 0.7; margin-top: -2px; }
`;

const DropOverlay = styled.div`
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: ${v.colorPrincipal}20; border: 2px dashed ${v.colorPrincipal}; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; font-weight: 800; color: ${v.colorPrincipal};
    z-index: 10; backdrop-filter: blur(2px); pointer-events: none; 
`;

const Container = styled.div`
    display: flex; flex-direction: column; 
    gap: 8px; 
    background: ${({theme})=>theme.bgtotal}; 
    padding: 10px; 
    border-radius: 8px; 
    border: 1px solid ${({theme, $isConfirmed})=> $isConfirmed ? '#2ecc7140' : theme.bg4}; width: 100%;
    position: relative; transition: all 0.2s ease;

    ${({ $isDragOver, theme }) => $isDragOver && css`
        border-color: ${v.colorPrincipal}; transform: scale(1.01); box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `}
    
    @media ${Device.tablet} {
        display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; padding: 10px;
    }

    .info { 
        display: flex; gap: 10px; font-weight: 600; justify-content: space-between; align-items: center; width: 100%;
        .team { display: flex; align-items: center; gap: 8px; flex:1; overflow: hidden; }
        .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.9rem;}
        .local { justify-content: flex-start; text-align: left; order: 1; }
        .visit { justify-content: flex-end; text-align: right; order: 3; }
        .vs { order: 2; font-size: 0.8rem; opacity: 0.6; }
        @media ${Device.tablet} {
            justify-content: center;
            .local { justify-content: flex-end; text-align: right; }
            .visit { justify-content: flex-start; text-align: left; }
        }
    }

    .settings { 
        display: flex; gap: 8px; width: 100%; justify-content: space-between;
        @media ${Device.tablet} { width: auto; justify-content: flex-end; }
        input { 
            background: ${({theme})=>theme.bg3}; border: 1px solid ${({theme})=>theme.bg4}; 
            color: ${({theme})=>theme.text}; padding: 8px; border-radius: 6px; flex: 1; font-size: 0.9rem;
            @media ${Device.tablet} { padding: 5px; flex: none; width: auto; font-size: 1rem; }
            &:focus { outline: 1px solid ${v.colorPrincipal}; }
        } 
        .del { 
            background: #e74c3c20; color: #e74c3c; border: none; border-radius: 6px; cursor: pointer; padding: 8px 12px;
            display: flex; align-items: center; justify-content: center; transition: 0.2s;
            &:hover { background: #e74c3c; color: white; }
        } 
        .confirmed-actions { 
            display: flex; align-items: center; gap: 10px; width: 100%; flex-direction: column; 
            @media (min-width: 450px) { flex-direction: row; justify-content: space-between; }
            @media ${Device.tablet} { width: auto; gap: 15px; }
            
            .datetime-display { 
                display: flex; flex-direction: row; gap: 8px; align-items: center; font-size: 0.85rem; opacity: 0.9; width: 100%;
                justify-content: center; background: ${({theme})=>theme.bg3}; padding: 5px 10px; border-radius: 6px;
                @media ${Device.tablet} { background: transparent; padding: 0; flex-direction: column; align-items: flex-end; width: auto; gap: 2px; }
                .date-text { font-weight: 500; text-transform: capitalize; &.mobile-only { @media ${Device.tablet} { display: none; } } }
                small { font-weight: 700; color: ${v.colorPrincipal}; font-size: 0.95rem; } 
                
                .no-date-badge {
                    font-weight: 800; color: #e74c3c; background: #e74c3c20; padding: 4px 10px; border-radius: 6px;
                    font-size: 0.8rem; text-align: center; white-space: nowrap; border: 1px solid #e74c3c40;
                }
            }
            .btns-row { display: flex; gap: 5px; width: 100%; @media ${Device.tablet} { width: auto; } }
            .action-btn { 
                border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                gap: 5px; font-weight: 600; font-size: 0.8rem; flex: 1; transition: 0.2s;
                @media ${Device.tablet} { padding: 6px 12px; flex: none; }
                &.result { background: ${v.colorPrincipal}; color: white; &:hover{ filter: brightness(1.1); } }
                &.postpone { background: #f1c40f20; color: #f1c40f; &:hover{ background: #f1c40f; color: black; } }
                &.sheet { background: #3498db20; color: #3498db; &:hover{ background: #3498db; color: white; } }
                &.print { background: #95a5a620; color: #7f8c8d; &:hover{ background: #95a5a6; color: white; } }
            }
        }
    }
`;