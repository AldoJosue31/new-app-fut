// src/components/organismos/tabs/torneos/JornadaPlanificacion.jsx
import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { v, Btnsave, Toast } from "../../../../index";
import { 
    RiCalendarLine, RiCheckDoubleLine, RiEyeLine, RiEyeOffLine, RiTimeLine
} from "react-icons/ri";

import { usePlanificacionMatches } from "../../../../hooks/usePlanificacionMatches";
import { formatDateWithWeekday } from "../../../../utils/dateUtils";

import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PlanningSidebar } from "./planificacion/PlanningSidebar";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ResultModal } from "./planificacion/ResultModal";
import { WeeklyGridView } from "./planificacion/WeeklyGridView";
import { TournamentConfigModal } from "./subcomponents/TournamentConfigModal";
import { ConflictModal } from "./subcomponents/ConflictModal"; 
import { BatchPrintModal } from "./exports/match-sheets/BatchPrintModal";
import { DaySeparatorDropZone } from "./planificacion/DaySeparatorDropZone";
import { EmptyDropZone } from "./planificacion/EmptyDropZone"; 
import { findScheduleConflicts, checkOverlap } from "../../../../utils/matchValidation";
import { ConfirmModal } from "../../ConfirmModal"; 
import { MatchResolutionModal } from "./planificacion/MatchResolutionModal"; 

export function JornadaPlanificacion({ 
  matchesDB = [], globalPendingMatches = [], teams, jornadaIndex, activeTournament,
  jornadaData, onConfirm, onChangeJornada, totalJornadas, onMatchUpdate, canConfirm, onSaveConfig,
  onEditFixture, isTournamentActive, dataVersion, jornadas = [],
  onUpdateDates, onAutoFill
}) {
  const {
    scheduledMatches, setScheduledMatches,
    allPendingMatches, setAllPendingMatches,
    sidebarMatches,
    weekStartDate, setWeekStartDate,
    durationMatch, autoAdjustTimes, 
    currentJornadaName,
    clearDraft,
    showExternalMatches, toggleExternalMatches,
    externalMatches, loadingExternal,
    fetchExternalMatches 
  } = usePlanificacionMatches(
      activeTournament, 
      jornadaIndex, 
      teams, 
      matchesDB, 
      globalPendingMatches, 
      jornadaData, 
      dataVersion,
      jornadas 
  );

  const [viewMode, setViewMode] = useState('list');
  const [draggedMatch, setDraggedMatch] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false); 
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });
  
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);

  const [confirmJornadaModalOpen, setConfirmJornadaModalOpen] = useState(false);
  const [matchToPostpone, setMatchToPostpone] = useState(null); 

  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [matchToResolve, setMatchToResolve] = useState(null);

  const [conflictsFound, setConflictsFound] = useState([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  const isConfirmed = jornadaData?.status === 'Confirmada';
  const isVueltasLocked = (jornadaIndex + 1) > Math.ceil(totalJornadas / 2);
  const isFirstJornadaConfirmed = activeTournament?.jornadas?.some(
      j => j.name === 'Jornada 1' && j.status === 'Confirmada'
  );

  const matchesWithoutResult = scheduledMatches.filter(m => {
      const isSaved = m.id && !String(m.id).startsWith('temp');
      const isPendingResult = m.status !== 'Finalizado'; 
      return isSaved && isPendingResult;
  });

  const pendientesEstaJornada = sidebarMatches.filter(m => m.originJornada === currentJornadaName && !m.isByeMatch);

  const handleOpenResolution = (match) => {
    setMatchToResolve(match);
    setResolutionModalOpen(true);
  };

  const handleResolveMatch = (resolution) => {
    if (!matchToResolve) return;
    const updated = allPendingMatches.map(m =>
      m.id === matchToResolve.id ? { ...m, resolution, isModified: true } : m
    );
    setAllPendingMatches(updated);
  };

  const handleClearResolution = (matchId) => {
    const updated = allPendingMatches.map(m =>
      m.id === matchId ? { ...m, resolution: null, isModified: true } : m
    );
    setAllPendingMatches(updated);
  };

  const handleDrop = (e, targetDate = null) => {
    e.preventDefault(); 
    if(e.stopPropagation) e.stopPropagation();

    setIsDragOver(false);
    if (!draggedMatch || isConfirmed) return;

    const baseStartDate = jornadaData?.start_date || weekStartDate;
    const finalDate = targetDate || baseStartDate;
    
    const matchesOfTargetDate = scheduledMatches.filter(m => m.date === finalDate);
    const configStartHour = activeTournament?.config?.horaInicio || "10:00";
    let nextTime = configStartHour;

    if (matchesOfTargetDate.length > 0) {
        const last = matchesOfTargetDate.sort((a,b) => (a.time||"").localeCompare(b.time||"")).pop();
        if(last && last.time) {
            const [h, m] = last.time.split(':').map(Number);
            const total = (h * 60) + m + durationMatch;
            nextTime = `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
        }
    } 

    const newMatch = { ...draggedMatch, time: nextTime, date: finalDate, status: 'Programado', isModified: true };

    const newList = [...scheduledMatches, newMatch];
    setScheduledMatches(autoAdjustTimes(newList, finalDate));
    
    setAllPendingMatches(allPendingMatches.filter(m => m.id !== draggedMatch.id));
    setDraggedMatch(null);
  };

  const handleUpdateDate = (matchId, newDate) => {
      const updatedList = scheduledMatches.map(m => m.id === matchId ? { ...m, date: newDate, isModified: true } : m);
      setScheduledMatches(autoAdjustTimes(updatedList, newDate));
  };

  const parseDateTimeFromServerMessage = (msg) => {
    if (!msg) return null;
    const re = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/;
    const m = String(msg).match(re);
    if (!m) return null;
    return { date: m[1], time: m[2].slice(0,5) };
  };

  const handleConfirmJornada = async () => {
      setIsCheckingConflicts(true);
      try {
        const rawExternalData = await fetchExternalMatches(weekStartDate);
        const currentJornadaId = jornadaData?.id;
        const currentTournamentId = activeTournament?.id;

        const filteredExternalData = rawExternalData.filter(ext => {
             if (currentJornadaId && String(ext.jornada_id) === String(currentJornadaId)) return false;
             if (currentTournamentId && String(ext.original_id).includes(currentTournamentId)) return false;
             return true;
        });

        const detectedConflicts = findScheduleConflicts(scheduledMatches, filteredExternalData, durationMatch);

        if (detectedConflicts.length > 0) {
            setConflictsFound(detectedConflicts);
            setConflictModalOpen(true);
            setIsCheckingConflicts(false);
            return;
        }

        try {
            await Promise.resolve(onConfirm({ 
                jornada_numero: jornadaIndex + 1, 
                matches: scheduledMatches, 
                allPendingMatches: allPendingMatches 
            }));
            clearDraft();
            setToast({ show: true, msg: 'Jornada confirmada correctamente', type: 'success' });
        } catch (serverErr) {
            console.error("Error guardando:", serverErr);
            const serverMessage = serverErr?.message || serverErr?.error || String(serverErr);
            const dt = parseDateTimeFromServerMessage(serverMessage);
            if (dt) {
                const syntheticConflicts = scheduledMatches
                    .filter(internal => checkOverlap(internal, { date: dt.date, time: dt.time, duration: durationMatch }, durationMatch))
                    .map(internal => ({
                        internal,
                        external: { date: dt.date, time: dt.time, local_name: 'Partido en BD', visitante_name: '', division_name: 'Otra División' },
                        duration: durationMatch
                    }));

                if (syntheticConflicts.length > 0) {
                    setConflictsFound(syntheticConflicts);
                    setConflictModalOpen(true);
                } else {
                    setToast({ show: true, msg: serverMessage, type: 'error' });
                }
            } else {
                setToast({ show: true, msg: serverMessage, type: 'error' });
            }
            return;
        }

      } catch (err) {
        console.error(err);
        setToast({ show: true, msg: 'Error verificando horarios', type: 'error' });
      } finally {
        setIsCheckingConflicts(false);
      }
  };

  // --- CORRECCIÓN DEL ORDENAMIENTO (TOLERANTE A NULL) ---
  const sortedMatches = [...scheduledMatches].sort((a, b) => {
      // Si la fecha es null (ej: victoria por default), le damos un string lejano para mandarlo al final
      const dateA = a.date || "9999-99-99";
      const dateB = b.date || "9999-99-99";
      
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      
      const timeA = a.time || "99:99";
      const timeB = b.time || "99:99";
      return timeA.localeCompare(timeB);
  });

  const handleAutoFillWrapper = () => {
    if(window.confirm("¿Calcular fechas automáticamente?")) {
        onAutoFill(activeTournament.id, activeTournament.start_date);
    }
  };

  return (
    <Container>
        <Toast show={toast.show} message={toast.msg} type={toast.type} onClose={()=>setToast({...toast, show:false})} />
        
        <PlanningHeader 
            jornadaIndex={jornadaIndex} 
            jornadaData={jornadaData} 
            status={jornadaData?.status || 'Pendiente'} 
            onPrev={() => onChangeJornada(Math.max(0, jornadaIndex-1))}
            onNext={() => onChangeJornada(Math.min(totalJornadas-1, jornadaIndex+1))}
            totalJornadas={totalJornadas} 
            onSaveDates={onUpdateDates} 
            onAutoFill={handleAutoFillWrapper}
            onConfig={() => setConfigModalOpen(true)} viewMode={viewMode} onToggleView={setViewMode}
            onEditFixture={onEditFixture} isTournamentActive={isTournamentActive}
            onPrintBatch={() => setBatchPrintOpen(true)}
            matchesWithoutResultCount={matchesWithoutResult.length}
        />
        
        {viewMode === 'grid' && (
            <ControlsBar>
                <GhostButton onClick={toggleExternalMatches} $active={showExternalMatches}>
                    {showExternalMatches ? <RiEyeOffLine/> : <RiEyeLine/>}
                    {showExternalMatches ? 'Ocultar partidos de otras divisiones' : 'Ver partidos de otras divisiones'}
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
                    <PlanningSidebar 
                        matches={sidebarMatches} 
                        isConfirmed={isConfirmed} 
                        setDraggedMatch={setDraggedMatch} 
                        jornadaIndex={jornadaIndex}
                        onOpenResolution={handleOpenResolution}
                        onClearResolution={handleClearResolution}
                    />
                )}
                <MainZone>
                    {viewMode === 'list' ? (
                        <DropZone 
                            onDragOver={(e)=>{e.preventDefault(); if(!isConfirmed) setIsDragOver(true)}} 
                            onDragLeave={()=>setIsDragOver(false)} 
                            onDrop={(e) => handleDrop(e, null)} 
                            $isOver={isDragOver}
                        >
                            {sortedMatches.length === 0 ? ( 
                                <EmptyDropZone isConfirmed={isConfirmed} isDragOver={isDragOver} />
                            ) : (
                                <GridList>
                                    {sortedMatches.map((match, idx, arr) => {
                                            const prevMatch = arr[idx - 1];
                                            const nextMatch = arr[idx + 1];
                                            const isNewDay = !prevMatch || match.date !== prevMatch.date;
                                            
                                            // Corrección visual para agrupar partidos sin fecha
                                            let groupLabel = null;
                                            if (isNewDay) {
                                                groupLabel = match.date ? formatDateWithWeekday(match.date) : "Partidos definidos sin fecha";
                                            }

                                            const isLastOfDate = !nextMatch || nextMatch.date !== match.date;

                                            return (
                                              <React.Fragment key={match.id}>
                                                  <ScheduledMatchRow 
                                                    match={match} 
                                                    groupLabel={groupLabel} 
                                                    isConfirmed={isConfirmed} 
                                                    onDropOnDate={(targetDate) => handleDrop({ preventDefault: ()=>{} }, targetDate)}
                                                    onUpdateDate={(val) => handleUpdateDate(match.id, val)}
                                                    onUpdateTime={(val) => {
                                                        const updated = scheduledMatches.map(m => m.id === match.id ? {...m, time: val, isModified: true} : m);
                                                        setScheduledMatches(updated);
                                                    }}
                                                    onRemove={() => { 
                                                        setScheduledMatches(scheduledMatches.filter(m => m.id !== match.id)); 
                                                        setAllPendingMatches([...allPendingMatches, { ...match, status: 'Pendiente', date: null, time: null, isModified: true, resolution: null }]); 
                                                    }} 
                                                    onOpenResult={(m) => { setSelectedMatchResult(m); setResultModalOpen(true); }} 
                                                    onPostpone={(m) => setMatchToPostpone(m)} 
                                                  />
                                                  {isLastOfDate && match.date && (
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
                        <WeeklyGridView weekStartDate={weekStartDate} scheduledMatches={scheduledMatches} externalMatches={externalMatches} divisionActual={activeTournament?.division?.name || activeTournament?.divisions?.name} isConfirmed={isConfirmed} /> 
                    )}
                </MainZone>
            </Workspace>
        </TransitionWrapper>
        <Footer>
            <div className="note">Duración Estimada: {durationMatch} min (Partido + Descanso)</div>
            {!isConfirmed && ( 
                <Btnsave 
                    titulo={isCheckingConflicts ? "Verificando..." : "Confirmar Jornada"} 
                    funcion={() => setConfirmJornadaModalOpen(true)} 
                    icono={!isCheckingConflicts && <RiCheckDoubleLine/>} 
                    bgcolor={canConfirm && !isCheckingConflicts ? v.colorPrincipal : '#95a5a6'} 
                /> 
            )}
        </Footer>

        <TournamentConfigModal isOpen={configModalOpen} onClose={() => setConfigModalOpen(false)} activeTournament={activeTournament} onSave={onSaveConfig} isVueltasLocked={isVueltasLocked} isStartDateLocked={isFirstJornadaConfirmed} />
        <ResultModal isOpen={resultModalOpen} onClose={() => setResultModalOpen(false)} match={selectedMatchResult} activeTournament={activeTournament} onSave={async (id, updates) => await onMatchUpdate?.(id, updates)} />
        <ConflictModal isOpen={conflictModalOpen} onClose={() => setConflictModalOpen(false)} conflicts={conflictsFound} />
        <BatchPrintModal isOpen={batchPrintOpen} onClose={() => setBatchPrintOpen(false)} matchesToPrint={matchesWithoutResult} />

        <MatchResolutionModal 
            isOpen={resolutionModalOpen} 
            onClose={() => setResolutionModalOpen(false)} 
            match={matchToResolve} 
            onResolve={handleResolveMatch} 
        />

        <ConfirmModal 
            isOpen={confirmJornadaModalOpen}
            onClose={() => setConfirmJornadaModalOpen(false)}
            onConfirm={() => {
                setConfirmJornadaModalOpen(false);
                handleConfirmJornada(); 
            }}
            title="Confirmar Jornada"
            message="¿Estás seguro de confirmar y publicar esta jornada?"
            confirmText="Publicar Jornada"
            confirmColor={v.colorPrincipal}
            confirmIcon={<RiCheckDoubleLine />}
            thinButtons={true} 
        >
            <StatsContainer>
                <StatBox $color="#2ecc71">
                    <span className="num">{scheduledMatches.length}</span>
                    <span className="lbl">A Confirmar</span>
                </StatBox>
                <StatBox $color="#f39c12">
                    <span className="num">{pendientesEstaJornada.length}</span>
                    <span className="lbl" style={{textAlign: "center"}}>Sin Asignar<br/>(Esta Jornada)</span>
                </StatBox>
            </StatsContainer>
        </ConfirmModal>

        <ConfirmModal 
            isOpen={!!matchToPostpone}
            onClose={() => setMatchToPostpone(null)}
            onConfirm={async () => {
                if (matchToPostpone) {
                    await onMatchUpdate?.(matchToPostpone.id, { status: 'Pendiente', date: null });
                    setMatchToPostpone(null);
                }
            }}
            title="Aplazar Partido"
            message="¿Deseas aplazar este partido?"
            subMessage={matchToPostpone ? `${matchToPostpone.local?.name || 'Local'} VS ${matchToPostpone.visitante?.name || 'Visitante'} regresará a la lista de pendientes.` : ''}
            confirmText="Aplazar"
            confirmColor="#f1c40f"
            confirmIcon={<RiTimeLine />}
            thinButtons={true} 
        />
    </Container>
  );
}

// --- ESTILOS PRINCIPALES ---
const Container = styled.div` display: flex; flex-direction: column; gap: 10px; width: 100%; flex: 1; height: 100%; min-height: 0; `;
const TransitionWrapper = styled.div` animation: ${keyframes` from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } `} 0.4s both; width: 100%; flex: 1; display: flex; flex-direction: column; min-height: 0; `;
const Workspace = styled.div` display: flex; gap: 15px; flex: 1; min-height: 0; @media(max-width: 768px){ flex-direction: column; } `;
const MainZone = styled.div` flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; `;
const DropZone = styled.div` flex: 1; background: ${({theme, $isOver})=> $isOver ? theme.bg4+'40' : theme.bgcards}; border: 2px dashed ${({theme, $isOver})=> $isOver ? v.colorPrincipal : theme.bg4}; border-radius: 10px; padding: 10px; overflow-y: auto; position: relative; transition: all 0.3s ease; @media (min-width: 768px) { padding: 15px; }`;
const GridList = styled.div` display: flex; flex-direction: column; gap: 8px; padding-bottom: 5px; `;
const Footer = styled.div` display: flex; justify-content: space-between; align-items: center; padding: 5px 0 0 0; flex-shrink: 0; gap: 10px; @media(max-width: 768px){ flex-direction: column; align-items: stretch; .note { text-align: center; } } .note { font-size: 0.8rem; font-weight: 700; color: ${v.colorPrincipal}; background: ${v.colorPrincipal}15; padding: 8px 12px; border-radius: 8px; } `;
const ControlsBar = styled.div` display: flex; align-items: center; gap: 15px; padding: 0 5px; animation: ${keyframes`from{opacity:0}to{opacity:1}`} 0.3s ease; .info-text { font-size: 0.85rem; color: ${({theme})=>theme.text}; opacity: 0.7; font-style: italic; } `;
const GhostButton = styled.button` display: flex; align-items: center; gap: 8px; background: ${({ $active, theme }) => $active ? theme.bgtotal : theme.bgcards}; color: ${({ $active, theme }) => $active ? v.colorPrincipal : theme.text}; border: 1px solid ${({ $active, theme }) => $active ? v.colorPrincipal : theme.bg4}; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); &:hover { transform: translateY(-1px); border-color: ${v.colorPrincipal}; color: ${v.colorPrincipal}; } .spinner { animation: ${keyframes`0%{opacity:0} 50%{opacity:1} 100%{opacity:0}`} 1s infinite; }`;

const StatsContainer = styled.div`
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 10px;
    width: 100%;
`;

const StatBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: ${({theme}) => theme.bg3};
    padding: 15px 15px;
    border-radius: 12px;
    border: 2px solid ${({$color}) => $color}40;
    min-width: 120px;

    .num {
        font-size: 2.5rem;
        font-weight: 800;
        color: ${({$color}) => $color};
        line-height: 1;
        margin-bottom: 5px;
    }

    .lbl {
        font-size: 0.75rem;
        font-weight: 700;
        color: ${({theme}) => theme.text};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.8;
    }
`;