import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { v, Btnsave, Toast } from "../../../../index";
import { 
    RiCalendarLine, RiCheckDoubleLine, RiEyeLine, RiEyeOffLine, RiAddCircleLine, RiArrowDownLine
} from "react-icons/ri";

import { usePlanificacionMatches } from "../../../../hooks/usePlanificacionMatches";
import { formatDateWithWeekday, addDaysToDate } from "../../../../utils/dateUtils";

import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PlanningSidebar } from "./planificacion/PlanningSidebar";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ResultModal } from "./planificacion/ResultModal";
import { WeeklyGridView } from "./planificacion/WeeklyGridView";
import { TournamentConfigModal } from "./subcomponents/TournamentConfigModal";

// --- COMPONENTE INTERNO PARA ZONA DE NUEVO DÍA ---
const DaySeparatorDropZone = ({ baseDate, onDropAction, isConfirmed }) => {
    const [isOver, setIsOver] = useState(false);
    
    // Calcular el día siguiente
    const nextDate = addDaysToDate(baseDate, 1);
    const label = formatDateWithWeekday(nextDate);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Evitar que burbujee al contenedor principal
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

export function JornadaPlanificacion({ 
  matchesDB = [], globalPendingMatches = [], teams, jornadaIndex, activeTournament,
  jornadaData, onConfirm, onChangeJornada, totalJornadas, onMatchUpdate, canConfirm, onSaveConfig,
  onEditFixture, isTournamentActive, dataVersion, jornadas = []
}) {
  const {
    scheduledMatches, setScheduledMatches,
    allPendingMatches, setAllPendingMatches,
    sidebarMatches,
    weekStartDate, setWeekStartDate,
    durationMatch, autoAdjustTimes, 
    clearDraft,
    showExternalMatches, toggleExternalMatches,
    externalMatches, loadingExternal
  } = usePlanificacionMatches(
      activeTournament, 
      jornadaIndex, 
      teams, 
      matchesDB, 
      globalPendingMatches, 
      jornadaData?.status,
      dataVersion,
      jornadas 
  );

  const [viewMode, setViewMode] = useState('list');
  const [draggedMatch, setDraggedMatch] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false); // Para el DropZone general
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });
  
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const isConfirmed = jornadaData?.status === 'Confirmada';
  const isVueltasLocked = (jornadaIndex + 1) > Math.ceil(totalJornadas / 2);

  const isFirstJornadaConfirmed = activeTournament?.jornadas?.some(
      j => j.name === 'Jornada 1' && j.status === 'Confirmada'
  );

  useEffect(() => {
    if (activeTournament?.start_date && !isConfirmed) {
        const [yearStr, monthStr, dayStr] = activeTournament.start_date.split('-');
        const startDate = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
        startDate.setDate(startDate.getDate() + (jornadaIndex * 7));
        
        const y = startDate.getFullYear();
        const m = String(startDate.getMonth() + 1).padStart(2, '0');
        const d = String(startDate.getDate()).padStart(2, '0');
        const calculatedDate = `${y}-${m}-${d}`;
        
        if (weekStartDate !== calculatedDate) {
            setWeekStartDate(calculatedDate);
        }
    }
  }, [jornadaIndex, activeTournament, isConfirmed]); 

  /**
   * MANEJO CENTRALIZADO DEL DROP
   * @param {Event} e - Evento del drop
   * @param {string|null} targetDate - Fecha objetivo. Si es null, usa weekStartDate.
   */
  const handleDrop = (e, targetDate = null) => {
    e.preventDefault(); 
    // Detenemos propagación para que no se ejecute dos veces (hijo y padre)
    if(e.stopPropagation) e.stopPropagation();

    setIsDragOver(false);
    if (!draggedMatch || isConfirmed) return;

    // 1. Determinar fecha final
    const finalDate = targetDate || weekStartDate;

    // 2. Calcular hora basada en los partidos existentes DE ESA FECHA
    const matchesOfTargetDate = scheduledMatches.filter(m => m.date === finalDate);
    const configStartHour = activeTournament?.config?.horaInicio || "10:00";
    let nextTime = configStartHour;

    if (matchesOfTargetDate.length > 0) {
        // Buscar el último partido por hora
        const last = matchesOfTargetDate.sort((a,b) => (a.time||"").localeCompare(b.time||"")).pop();
        if(last && last.time) {
            const [h, m] = last.time.split(':').map(Number);
            const total = (h * 60) + m + durationMatch;
            nextTime = `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
        }
    } 

    const newMatch = { 
        ...draggedMatch, 
        time: nextTime, 
        date: finalDate, 
        status: 'Programado', 
        isModified: true 
    };

    const newList = [...scheduledMatches, newMatch];
    setScheduledMatches(autoAdjustTimes(newList, finalDate));
    
    setAllPendingMatches(allPendingMatches.filter(m => m.id !== draggedMatch.id));
    setDraggedMatch(null);
  };

  const handleUpdateDate = (matchId, newDate) => {
      const updatedList = scheduledMatches.map(m => m.id === matchId ? { ...m, date: newDate, isModified: true } : m);
      setScheduledMatches(autoAdjustTimes(updatedList, newDate));
  };

  const handleConfirmJornada = async () => {
      clearDraft();
      onConfirm({ 
          jornada_numero: jornadaIndex + 1, 
          matches: scheduledMatches, 
          allPendingMatches: allPendingMatches 
      });
  };

  // Ordenar partidos para renderizado: Fecha ASC, Hora ASC
  const sortedMatches = [...scheduledMatches].sort((a,b) => {
      if(a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
  });

  return (
    <Container>
        <Toast show={toast.show} message={toast.msg} type={toast.type} onClose={()=>setToast({...toast, show:false})} />
        <PlanningHeader 
            jornadaIndex={jornadaIndex} status={jornadaData.status} 
            onPrev={() => onChangeJornada(Math.max(0, jornadaIndex-1))}
            onNext={() => onChangeJornada(Math.min(totalJornadas-1, jornadaIndex+1))}
            totalJornadas={totalJornadas} weekStartDate={weekStartDate} setWeekStartDate={setWeekStartDate}
            onConfig={() => setConfigModalOpen(true)} viewMode={viewMode} onToggleView={setViewMode}
            onEditFixture={onEditFixture} isTournamentActive={isTournamentActive}
        />
        
        {viewMode === 'grid' && (
            <ControlsBar>
                <GhostButton onClick={toggleExternalMatches} $active={showExternalMatches}>
                    {showExternalMatches ? <RiEyeOffLine/> : <RiEyeLine/>}
                    {showExternalMatches ? 'Ocultar otras divisiones' : 'Ver otras divisiones'}
                    {loadingExternal && <span className="spinner">...</span>}
                </GhostButton>
                <span className="info-text">
                    {showExternalMatches 
                        ? "Mostrando ocupación de canchas de TODAS las divisiones." 
                        : "Solo se muestran partidos de esta división."}
                </span>
            </ControlsBar>
        )}

        <TransitionWrapper key={jornadaIndex + viewMode}>
            <Workspace>
                {viewMode === 'list' && (
                    <PlanningSidebar matches={sidebarMatches} isConfirmed={isConfirmed} setDraggedMatch={setDraggedMatch} jornadaIndex={jornadaIndex}/>
                )}
                <MainZone>
                    {viewMode === 'list' ? (
                        <DropZone 
                            onDragOver={(e)=>{e.preventDefault(); if(!isConfirmed) setIsDragOver(true)}} 
                            onDragLeave={()=>setIsDragOver(false)} 
                            onDrop={(e) => handleDrop(e, null)} // Drop genérico (container)
                            $isOver={isDragOver}
                        >
                            {sortedMatches.length === 0 ? ( 
                                <div className="placeholder"><RiCalendarLine size={40}/> <p>{isConfirmed ? "No hay partidos programados." : "Arrastra los partidos aquí"}</p></div> 
                            ) : (
                                <GridList>
                                    {sortedMatches.map((match, idx, arr) => {
                                            const prevMatch = arr[idx - 1];
                                            const nextMatch = arr[idx + 1];
                                            
                                            // Agrupación visual por fecha
                                            const isNewDay = !prevMatch || match.date !== prevMatch.date;
                                            const groupLabel = isNewDay ? formatDateWithWeekday(match.date) : null;
                                            
                                            // Lógica para el separador "Nuevo Día"
                                            // Se muestra si es el último partido de un bloque de fecha
                                            const isLastOfDate = !nextMatch || nextMatch.date !== match.date;

                                            return (
                                              <React.Fragment key={match.id}>
                                                  <ScheduledMatchRow 
                                                    match={match} 
                                                    groupLabel={groupLabel} 
                                                    isConfirmed={isConfirmed} 
                                                    // Drop sobre la fila (Añadir a ESTE día)
                                                    onDropOnDate={(targetDate) => handleDrop({ preventDefault: ()=>{} }, targetDate)}
                                                    
                                                    onUpdateDate={(val) => handleUpdateDate(match.id, val)}
                                                    onUpdateTime={(val) => {
                                                        const updated = scheduledMatches.map(m => m.id === match.id ? {...m, time: val, isModified: true} : m);
                                                        setScheduledMatches(updated);
                                                    }}
                                                    onRemove={() => { 
                                                        setScheduledMatches(scheduledMatches.filter(m => m.id !== match.id)); 
                                                        setAllPendingMatches([...allPendingMatches, { ...match, status: 'Pendiente', date: null, time: null, isModified: true }]); 
                                                    }} 
                                                    onOpenResult={(m) => { setSelectedMatchResult(m); setResultModalOpen(true); }} 
                                                    onPostpone={(m) => onMatchUpdate?.(m.id, { status: 'Pendiente', date: null })} 
                                                  />
                                                  
                                                  {/* AQUÍ ESTÁ LA NUEVA FUNCIONALIDAD: DropZone para día siguiente */}
                                                  {isLastOfDate && (
                                                      <DaySeparatorDropZone 
                                                          baseDate={match.date}
                                                          onDropAction={(d) => handleDrop({ preventDefault: ()=>{} }, d)}
                                                          isConfirmed={isConfirmed}
                                                      />
                                                  )}
                                              </React.Fragment>
                                            );
                                    })}
                                </GridList>
                            )}
                        </DropZone>
                    ) : ( 
                        <WeeklyGridView 
                            weekStartDate={weekStartDate} 
                            scheduledMatches={scheduledMatches} 
                            externalMatches={externalMatches} 
                            divisionActual={activeTournament?.division?.name} 
                            isConfirmed={isConfirmed} 
                        /> 
                    )}
                </MainZone>
            </Workspace>
        </TransitionWrapper>
        <Footer>
            <div className="note">Duración Estimada: {durationMatch} min</div>
            {!isConfirmed && ( <Btnsave titulo="Confirmar Jornada" funcion={handleConfirmJornada} icono={<RiCheckDoubleLine/>} bgcolor={canConfirm ? v.colorPrincipal : '#95a5a6'} /> )}
        </Footer>
        <TournamentConfigModal isOpen={configModalOpen} onClose={() => setConfigModalOpen(false)} activeTournament={activeTournament} onSave={onSaveConfig} isVueltasLocked={isVueltasLocked} isStartDateLocked={isFirstJornadaConfirmed} />
        <ResultModal isOpen={resultModalOpen} onClose={() => setResultModalOpen(false)} match={selectedMatchResult} activeTournament={activeTournament} onSave={async (id, updates) => await onMatchUpdate?.(id, updates)} />
    </Container>
  );
}

// --- ESTILOS ---

// Animación suave para el separador
const fadeIn = keyframes` from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } `;

const Spacer = styled.div` height: 10px; `;

const SeparatorContainer = styled.div`
    width: 100%;
    margin-top: 5px;
    margin-bottom: 5px;
    min-height: 15px; /* Altura mínima para ser "droppable" sin molestar */
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    cursor: default;

    .content {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0; /* Invisible por defecto */
        transform: scaleY(0.8);
        transition: all 0.2s ease;
    }

    .line {
        height: 1px;
        flex: 1;
        background: ${v.colorPrincipal};
        opacity: 0.3;
    }

    .pill {
        background: ${({theme}) => theme.bg3};
        border: 1px dashed ${v.colorPrincipal};
        border-radius: 20px;
        padding: 4px 15px;
        font-size: 0.8rem;
        color: ${v.colorPrincipal};
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        
        .hint { display: none; }
    }

    /* ESTADO DRAG OVER: Se expande y se hace visible */
    ${({ $isOver }) => $isOver && css`
        min-height: 50px;
        .content { opacity: 1; transform: scaleY(1); }
        .pill { 
            background: ${v.colorPrincipal}20; 
            border-style: solid;
            transform: scale(1.05);
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
    `}

    /* Aunque no estemos "over", si estamos arrastrando algo cerca, podríamos mostrar una pista sutil (opcional) */
    /* Para esto necesitaríamos saber si hay un drag global activo, pero con CSS puro :hover funciona para mouse */
    &:hover {
        /* Solo mostramos pista si no estamos en drag over activo (que ya lo maneja arriba) */
        ${({ $isOver }) => !$isOver && css`
            .content { opacity: 0.4; }
            .pill { border-color: transparent; background: transparent; }
            .hint { display: block; font-size: 0.7rem; }
        `}
    }
`;

const Container = styled.div` display: flex; flex-direction: column; gap: 15px; width: 100%; `;
const TransitionWrapper = styled.div` animation: ${keyframes` from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } `} 0.4s both; width: 100%; flex: 1; display: flex; flex-direction: column; `;
const Workspace = styled.div` display: flex; gap: 20px; min-height: 75vh; @media(max-width:768px){ flex-direction:column; height:auto; min-height: auto; } `;
const MainZone = styled.div` flex: 1; overflow: hidden; display: flex; flex-direction: column; `;
const DropZone = styled.div` flex: 1; background: ${({theme, $isOver})=> $isOver ? theme.bg4+'40' : theme.bgcards}; border: 2px dashed ${({theme, $isOver})=> $isOver ? v.colorPrincipal : theme.bg4}; border-radius: 10px; padding: 20px; overflow-y: auto; position: relative; transition: all 0.3s ease; .placeholder { position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; opacity:0.4; p { margin-top: 10px; font-size: 0.9rem; } } `;
const GridList = styled.div` display: flex; flex-direction: column; gap: 10px; padding-bottom: 50px; `;
const Footer = styled.div` display: flex; justify-content: space-between; align-items: center; margin-top: 5px; .note { font-size: 0.8rem; font-weight: 700; color: ${v.colorPrincipal}; background: ${v.colorPrincipal}15; padding: 8px 12px; border-radius: 8px; } `;
const ControlsBar = styled.div` display: flex; align-items: center; gap: 15px; padding: 0 5px; animation: ${keyframes`from{opacity:0}to{opacity:1}`} 0.3s ease; .info-text { font-size: 0.85rem; color: ${({theme})=>theme.text}; opacity: 0.7; font-style: italic; } `;
const GhostButton = styled.button` display: flex; align-items: center; gap: 8px; background: ${({ $active, theme }) => $active ? theme.bgtotal : theme.bgcards}; color: ${({ $active, theme }) => $active ? v.colorPrincipal : theme.text}; border: 1px solid ${({ $active, theme }) => $active ? v.colorPrincipal : theme.bg4}; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); &:hover { transform: translateY(-1px); border-color: ${v.colorPrincipal}; color: ${v.colorPrincipal}; } .spinner { animation: ${keyframes`0%{opacity:0} 50%{opacity:1} 100%{opacity:0}`} 1s infinite; }`;