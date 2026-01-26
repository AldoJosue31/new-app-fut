import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { v, Btnsave, Toast } from "../../../../index";
import { 
    RiCalendarLine, RiCheckDoubleLine, RiEyeLine, RiEyeOffLine
} from "react-icons/ri";
import { supabase } from "../../../../supabase/supabase.config"; 

import { usePlanificacionMatches } from "../../../../hooks/usePlanificacionMatches";
import { formatDateWithWeekday } from "../../../../utils/dateUtils";

import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PlanningSidebar } from "./planificacion/PlanningSidebar";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ResultModal } from "./planificacion/ResultModal";
import { WeeklyGridView } from "./planificacion/WeeklyGridView";
import { TournamentConfigModal } from "./subcomponents/TournamentConfigModal";

export function JornadaPlanificacion({ 
  matchesDB = [], globalPendingMatches = [], teams, jornadaIndex, activeTournament,
  jornadaData, onConfirm, onChangeJornada, totalJornadas, onMatchUpdate, canConfirm, onSaveConfig
}) {
  const {
    scheduledMatches, setScheduledMatches,
    allPendingMatches, setAllPendingMatches,
    sidebarMatches,
    weekStartDate, setWeekStartDate,
    durationMatch, autoAdjustTimes, 
    clearDraft 
  } = usePlanificacionMatches(
      activeTournament, 
      jornadaIndex, 
      teams, 
      matchesDB, 
      globalPendingMatches, 
      jornadaData?.status // IMPORTANTE: Pasamos el status
  );

  const [viewMode, setViewMode] = useState('list');
  const [draggedMatch, setDraggedMatch] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });
  
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [showGhosts, setShowGhosts] = useState(false);
  const [externalMatches, setExternalMatches] = useState([]);
  const [loadingGhosts, setLoadingGhosts] = useState(false);

  const isConfirmed = jornadaData?.status === 'Confirmada';
  const isVueltasLocked = (jornadaIndex + 1) > Math.ceil(totalJornadas / 2);

  const isFirstJornadaConfirmed = activeTournament?.jornadas?.some(
      j => j.name === 'Jornada 1' && j.status === 'Confirmada'
  );

  // Sincronizar fecha inicial con la config del torneo
  useEffect(() => {
    if (activeTournament?.start_date && !isConfirmed) {
        const [yearStr, monthStr, dayStr] = activeTournament.start_date.split('-');
        // Crear fecha usando componentes UTC o locales para evitar desfases
        const startDate = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
        const daysToAdd = jornadaIndex * 7; 
        
        startDate.setDate(startDate.getDate() + daysToAdd);
        
        const y = startDate.getFullYear();
        const m = String(startDate.getMonth() + 1).padStart(2, '0');
        const d = String(startDate.getDate()).padStart(2, '0');
        const calculatedDate = `${y}-${m}-${d}`;
        
        // Solo actualizar si es diferente para evitar loops
        if (weekStartDate !== calculatedDate) {
            setWeekStartDate(calculatedDate);
        }
    }
  }, [jornadaIndex, activeTournament, isConfirmed]); 

  // Fetch de partidos fantasma (otras divisiones)
  useEffect(() => {
    if (!showGhosts || !weekStartDate || !activeTournament?.division_id) return;

    const fetchExternal = async () => {
        setLoadingGhosts(true);
        try {
            const start = new Date(weekStartDate);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            const endDateStr = end.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('matches')
                .select(`
                    id, date, time, status,
                    team1:teams!team1_id(name),
                    team2:teams!team2_id(name),
                    jornadas!inner(
                        tournament_id,
                        tournaments!inner(division_id, divisions(name))
                    )
                `)
                .gte('date', weekStartDate) 
                .lte('date', endDateStr)
                .eq('status', 'Programado')
                .neq('jornadas.tournaments.division_id', activeTournament.division_id);

            if (error) throw error;

            const formatted = data.map(m => ({
                id: `ext-${m.id}`, 
                date: m.date,
                time: m.time ? m.time.substring(0, 5) : '00:00',
                team1: { name: m.team1?.name || 'Eq1' },
                team2: { name: m.team2?.name || 'Eq2' },
                divisionName: m.jornadas?.tournaments?.divisions?.name || 'Otra',
                isExternal: true
            }));

            setExternalMatches(formatted);
        } catch (err) {
            console.error("Error fetching ghost matches:", err);
            setToast({ show: true, msg: "Error cargando otras divisiones", type: "error" });
        } finally {
            setLoadingGhosts(false);
        }
    };

    fetchExternal();
  }, [showGhosts, weekStartDate, activeTournament]);

  const handleDrop = (e) => {
    e.preventDefault(); 
    setIsDragOver(false);
    if (!draggedMatch || isConfirmed) return;

    const matchesOfToday = scheduledMatches.filter(m => m.date === weekStartDate);
    const configStartHour = activeTournament?.config?.horaInicio || "10:00";
    let nextTime = configStartHour;
    
    if (matchesOfToday.length > 0) {
        const last = matchesOfToday.sort((a,b) => (a.time||"").localeCompare(b.time||"")).pop();
        if(last && last.time) {
            const [h, m] = last.time.split(':').map(Number);
            const total = (h * 60) + m + durationMatch;
            nextTime = `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
        }
    }

    const newMatch = { 
        ...draggedMatch, 
        time: nextTime, 
        date: weekStartDate, 
        status: 'Programado',
        isModified: true 
    };
    
    const newList = [...scheduledMatches, newMatch];
    setScheduledMatches(autoAdjustTimes(newList, weekStartDate));
    setAllPendingMatches(allPendingMatches.filter(m => m.id !== draggedMatch.id));
    setDraggedMatch(null);
  };

  const handleUpdateDate = (matchId, newDate) => {
      const updatedList = scheduledMatches.map(m => 
          m.id === matchId ? { ...m, date: newDate, isModified: true } : m
      );
      setScheduledMatches(autoAdjustTimes(updatedList, newDate));
  };

  const handleConfirmJornada = async () => {
      // 1. Limpiamos el borrador local inmediatamente para prevenir inconsistencias
      clearDraft();
      
      // 2. Enviamos la data al padre
      onConfirm({ 
          jornada_numero: jornadaIndex + 1,
          matches: scheduledMatches, 
          allPendingMatches: allPendingMatches 
      });
  };

  return (
    <Container>
        <Toast show={toast.show} message={toast.msg} type={toast.type} onClose={()=>setToast({...toast, show:false})} />
        
        <PlanningHeader 
            jornadaIndex={jornadaIndex} 
            status={jornadaData.status} 
            onPrev={() => onChangeJornada(Math.max(0, jornadaIndex-1))}
            onNext={() => onChangeJornada(Math.min(totalJornadas-1, jornadaIndex+1))}
            totalJornadas={totalJornadas} 
            weekStartDate={weekStartDate}
            setWeekStartDate={setWeekStartDate}
            onConfig={() => setConfigModalOpen(true)}
            viewMode={viewMode}
            onToggleView={setViewMode}
        />

        {viewMode === 'grid' && (
            <ControlsBar>
                <GhostButton onClick={() => setShowGhosts(!showGhosts)} $active={showGhosts}>
                    {showGhosts ? <RiEyeOffLine/> : <RiEyeLine/>}
                    {showGhosts ? 'Ocultar otras divisiones' : 'Ver otras divisiones'}
                    {loadingGhosts && <span className="spinner">...</span>}
                </GhostButton>
                <span className="info-text">
                    {showGhosts ? "Viendo partidos de TODAS las divisiones." : "Viendo solo esta división."}
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
                    />
                )}

                <MainZone>
                    {viewMode === 'list' ? (
                        <DropZone 
                            onDragOver={(e)=>{e.preventDefault(); if(!isConfirmed) setIsDragOver(true)}} 
                            onDragLeave={()=>setIsDragOver(false)} 
                            onDrop={handleDrop} 
                            $isOver={isDragOver}
                        >
                            {scheduledMatches.length === 0 ? ( 
                                <div className="placeholder">
                                    <RiCalendarLine size={40}/> 
                                    <p>{isConfirmed ? "No hay partidos programados." : "Arrastra los partidos aquí"}</p>
                                </div> 
                            ) : (
                                <GridList>
                                    {scheduledMatches
                                      .sort((a,b) => {
                                          if(a.date !== b.date) return a.date.localeCompare(b.date);
                                          return (a.time || "").localeCompare(b.time || "");
                                      })
                                      .map((match, idx, arr) => {
                                          const prevMatch = arr[idx - 1];
                                          const isNewDay = !prevMatch || match.date !== prevMatch.date;
                                          const groupLabel = isNewDay ? formatDateWithWeekday(match.date) : null;

                                          return (
                                            <ScheduledMatchRow 
                                              key={match.id} 
                                              match={match} 
                                              groupLabel={groupLabel}
                                              isConfirmed={isConfirmed} 
                                              onUpdateDate={(val) => handleUpdateDate(match.id, val)}
                                              onUpdateTime={(val) => {
                                                const updated = scheduledMatches.map(m => 
                                                    m.id === match.id ? {...m, time: val, isModified: true} : m
                                                );
                                                setScheduledMatches(updated);
                                              }}
                                              onRemove={() => { 
                                                setScheduledMatches(scheduledMatches.filter(m => m.id !== match.id)); 
                                                setAllPendingMatches([...allPendingMatches, { 
                                                    ...match, 
                                                    status: 'Pendiente', 
                                                    date: null, 
                                                    time: null,
                                                    isModified: true 
                                                }]); 
                                              }} 
                                              onOpenResult={(m) => { setSelectedMatchResult(m); setResultModalOpen(true); }} 
                                              onPostpone={(m) => onMatchUpdate?.(m.id, { status: 'Pendiente', date: null })} 
                                            />
                                          );
                                      })}
                                </GridList>
                            )}
                        </DropZone>
                    ) : ( 
                        <WeeklyGridView 
                            weekStartDate={weekStartDate} 
                            scheduledMatches={scheduledMatches} 
                            externalMatches={showGhosts ? externalMatches : []}
                            divisionActual={activeTournament?.division?.name} 
                            isConfirmed={isConfirmed} 
                        /> 
                    )}
                </MainZone>
            </Workspace>
        </TransitionWrapper>

        <Footer>
            <div className="note">Duración Estimada: {durationMatch} min</div>
            {!isConfirmed && ( 
                <Btnsave 
                    titulo="Confirmar Jornada" 
                    funcion={handleConfirmJornada} 
                    icono={<RiCheckDoubleLine/>} 
                    bgcolor={canConfirm ? v.colorPrincipal : '#95a5a6'} 
                />
            )}
        </Footer>

        <TournamentConfigModal 
            isOpen={configModalOpen}
            onClose={() => setConfigModalOpen(false)}
            activeTournament={activeTournament}
            onSave={onSaveConfig}
            isVueltasLocked={isVueltasLocked}
            isStartDateLocked={isFirstJornadaConfirmed} 
        />

        <ResultModal 
            isOpen={resultModalOpen} 
            onClose={() => setResultModalOpen(false)} 
            match={selectedMatchResult} 
            activeTournament={activeTournament} 
            onSave={async (id, updates) => await onMatchUpdate?.(id, updates)} 
        />
    </Container>
  );
}

// --- ESTILOS ---
const Container = styled.div` display: flex; flex-direction: column; gap: 15px; width: 100%; `;
const TransitionWrapper = styled.div` animation: ${keyframes` from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } `} 0.4s both; width: 100%; flex: 1; display: flex; flex-direction: column; `;

const Workspace = styled.div` 
    display: flex; gap: 20px; min-height: 75vh; 
    @media(max-width:768px){ flex-direction:column; height:auto; min-height: auto; } 
`;
const MainZone = styled.div` flex: 1; overflow: hidden; display: flex; flex-direction: column; `;
const DropZone = styled.div` flex: 1; background: ${({theme, $isOver})=> $isOver ? theme.bg4+'40' : theme.bgcards}; border: 2px dashed ${({theme, $isOver})=> $isOver ? v.colorPrincipal : theme.bg4}; border-radius: 10px; padding: 20px; overflow-y: auto; position: relative; transition: all 0.3s ease; .placeholder { position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; opacity:0.4; p { margin-top: 10px; font-size: 0.9rem; } } `;
const GridList = styled.div` display: flex; flex-direction: column; gap: 10px; padding-bottom: 50px; `;
const Footer = styled.div` display: flex; justify-content: space-between; align-items: center; margin-top: 5px; .note { font-size: 0.8rem; font-weight: 700; color: ${v.colorPrincipal}; background: ${v.colorPrincipal}15; padding: 8px 12px; border-radius: 8px; } `;
const ControlsBar = styled.div` display: flex; align-items: center; gap: 15px; padding: 0 5px; animation: ${keyframes`from{opacity:0}to{opacity:1}`} 0.3s ease; .info-text { font-size: 0.85rem; color: ${({theme})=>theme.text}; opacity: 0.7; font-style: italic; } `;
const GhostButton = styled.button` display: flex; align-items: center; gap: 8px; background: ${({ $active, theme }) => $active ? theme.bgtotal : theme.bgcards}; color: ${({ $active, theme }) => $active ? v.colorPrincipal : theme.text}; border: 1px solid ${({ $active, theme }) => $active ? v.colorPrincipal : theme.bg4}; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); &:hover { transform: translateY(-1px); border-color: ${v.colorPrincipal}; color: ${v.colorPrincipal}; } `;