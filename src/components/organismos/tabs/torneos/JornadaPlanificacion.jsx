import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
// Asegúrate de que este path sea correcto y src/index exporte estos componentes.
// Si falla, cámbialo a rutas directas como: import { Btnsave } from "../../../moleculas/Btnsave";
import { v, Btnsave, Toast, Modal, TabsNavigation } from "../../../../index"; 
import { 
    RiCalendarLine, RiCheckDoubleLine, RiFileList3Line, 
    RiCoinLine, RiGitMergeLine 
} from "react-icons/ri";
import { IoMdStopwatch } from "react-icons/io";

import { usePlanificacionMatches } from "../../../../hooks/usePlanificacionMatches";

import { TabGeneral, TabScoring, TabFormat, TabGameRules } from "./subcomponents/TorneoFormTabs";
import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PlanningSidebar } from "./planificacion/PlanningSidebar";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ResultModal } from "./planificacion/ResultModal";
import { WeeklyGridView } from "./planificacion/WeeklyGridView";

export function JornadaPlanificacion({ 
  matchesDB = [], globalPendingMatches = [], teams, jornadaIndex, activeTournament,
  jornadaData, onConfirm, onChangeJornada, totalJornadas, onMatchUpdate, canConfirm, onSaveConfig
}) {
  const {
    scheduledMatches, setScheduledMatches,
    allPendingMatches, setAllPendingMatches,
    pendingCurrentJornada,
    weekStartDate, setWeekStartDate,
    durationMatch, autoAdjustTimes,
    currentJornadaName
  } = usePlanificacionMatches(activeTournament, jornadaIndex, teams, matchesDB, globalPendingMatches);

  const [viewMode, setViewMode] = useState('list');
  const [draggedMatch, setDraggedMatch] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });
  
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configTab, setConfigTab] = useState("general");
  const [editedConfig, setEditedConfig] = useState(activeTournament?.config || {});

  const isConfirmed = jornadaData?.status === 'Confirmada';
  const isVueltasLocked = (jornadaIndex + 1) > Math.ceil(totalJornadas / 2);

  // --- LÓGICA DE FECHAS CORREGIDA (MATEMÁTICA PURA) ---
useEffect(() => {
    // Prioridad 1: Si ya hay partidos programados en esta jornada, usar esa fecha.
    if (scheduledMatches && scheduledMatches.length > 0) {
        const existingDate = scheduledMatches[0].date;
        if (existingDate && existingDate !== weekStartDate) {
            setWeekStartDate(existingDate);
        }
        return; 
    }

    // Prioridad 2: Calcular fecha basada en el inicio del torneo
    // CORRECCIÓN 1: Buscar en 'start_date' (nivel raíz de la DB) y como fallback en config.
    const fechaInicioTorneo = activeTournament?.start_date || activeTournament?.config?.startDate;

    if (fechaInicioTorneo) {
        // Parseo manual YYYY-MM-DD
        const [yearStr, monthStr, dayStr] = fechaInicioTorneo.split('-');
        const startDate = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));

        // CORRECCIÓN 2: Cambiar multiplicación de 7 a 8 días según tu requerimiento
        // Jornada 0 = +0 días, Jornada 1 = +8 días, Jornada 2 = +16 días...
        const daysToAdd = jornadaIndex * 8; 
        
        startDate.setDate(startDate.getDate() + daysToAdd);

        // Formateo manual a YYYY-MM-DD
        const y = startDate.getFullYear();
        const m = String(startDate.getMonth() + 1).padStart(2, '0');
        const d = String(startDate.getDate()).padStart(2, '0');
        const calculatedDate = `${y}-${m}-${d}`;

        // Aplicamos la fecha si es diferente y la jornada no está confirmada
        if (weekStartDate !== calculatedDate && !isConfirmed) {
            setWeekStartDate(calculatedDate);
        }
    }
  }, [jornadaIndex, activeTournament, isConfirmed, scheduledMatches]);
  // --------------------------------------------------------

  const handleDrop = (e) => {
    e.preventDefault(); 
    setIsDragOver(false);
    if (!draggedMatch || isConfirmed) return;

    const matchesOfToday = scheduledMatches.filter(m => m.date === weekStartDate);
    let nextTime = "10:00";
    
    if (matchesOfToday.length > 0) {
        const last = matchesOfToday.sort((a,b) => a.time.localeCompare(b.time)).pop();
        const [h, m] = last.time.split(':').map(Number);
        const total = (h * 60) + m + durationMatch;
        nextTime = `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
    }

    const newMatch = { 
        ...draggedMatch, 
        time: nextTime, 
        date: weekStartDate, 
        status: 'Programado',
        isModified: true 
    };
    
    setScheduledMatches(autoAdjustTimes([...scheduledMatches, newMatch], weekStartDate));
    setAllPendingMatches(allPendingMatches.filter(m => m.id !== draggedMatch.id));
    setDraggedMatch(null);
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

        <TransitionWrapper key={jornadaIndex + viewMode}>
            <Workspace>
                <PlanningSidebar 
                    matches={pendingCurrentJornada}
                    isConfirmed={isConfirmed}
                    setDraggedMatch={setDraggedMatch}
                    jornadaIndex={jornadaIndex}
                />

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
                                    <p>{isConfirmed ? "No hay partidos programados." : "Arrastra los partidos aquí para agendar"}</p>
                                </div> 
                            ) : (
                                <GridList>
                                    {scheduledMatches
                                      .sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                                      .map((match) => (
                                        <ScheduledMatchRow 
                                          key={match.id} 
                                          match={match} 
                                          isConfirmed={isConfirmed} 
                                          onUpdateDate={(val) => {
                                            const updated = scheduledMatches.map(m => m.id === match.id ? {...m, date: val} : m);
                                            setScheduledMatches(autoAdjustTimes(updated, val));
                                          }}
                                          onUpdateTime={(val) => {
                                            const updated = scheduledMatches.map(m => m.id === match.id ? {...m, time: val} : m);
                                            setScheduledMatches(autoAdjustTimes(updated, match.date));
                                          }}
                                          onRemove={() => { 
                                            setScheduledMatches(scheduledMatches.filter(m => m.id !== match.id)); 
                                            setAllPendingMatches([...allPendingMatches, { ...match, status: 'Pendiente', originJornada: currentJornadaName, isModified: true }]); 
                                          }} 
                                          onOpenResult={(m) => { setSelectedMatchResult(m); setResultModalOpen(true); }} 
                                          onPostpone={(m) => onMatchUpdate?.(m.id, { status: 'Pendiente', date: null })} 
                                        />
                                    ))}
                                </GridList>
                            )}
                        </DropZone>
                    ) : ( 
                        <WeeklyGridView 
                            weekStartDate={weekStartDate} 
                            scheduledMatches={scheduledMatches} 
                            externalMatches={[]} 
                            divisionActual={activeTournament?.division?.name} 
                            isConfirmed={isConfirmed} 
                        /> 
                    )}
                </MainZone>
            </Workspace>
        </TransitionWrapper>

        <Footer>
            <div className="note">Duración Estimada: {durationMatch} min por encuentro</div>
            {!isConfirmed && ( 
                <Btnsave 
                    titulo="Confirmar Jornada" 
                    funcion={() => onConfirm({ 
                        jornada_numero: jornadaIndex + 1,
                        matches: scheduledMatches, 
                        allPendingMatches: allPendingMatches 
                    })} 
                    icono={<RiCheckDoubleLine/>} 
                    bgcolor={canConfirm ? v.colorPrincipal : '#95a5a6'} 
                />
            )}
        </Footer>

        <Modal isOpen={configModalOpen} onClose={() => setConfigModalOpen(false)} title="Ajustes de Torneo" width="600px">
            <ModalContent>
                <TabsNavigation 
                    tabs={[ 
                        { id: "general", label: "General", icon: <RiFileList3Line/> }, 
                        { id: "scoring", label: "Puntos", icon: <RiCoinLine/> }, 
                        { id: "format", label: "Formato", icon: <RiGitMergeLine/> }, 
                        { id: "gameRules", label: "Reglas", icon: <IoMdStopwatch/> } 
                    ]} 
                    activeTab={configTab} 
                    setActiveTab={setConfigTab} 
                />
                <div style={{marginTop:'15px'}}>
                    {configTab === 'general' && <TabGeneral form={editedConfig} onChange={(e) => setEditedConfig(prev => ({ ...prev, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))} isStarted={true} activeTournament={activeTournament} />}
                    {configTab === 'scoring' && <TabScoring form={editedConfig} onChange={(e) => setEditedConfig(prev => ({ ...prev, [e.target.name]: e.target.value }))} isStarted={true} />}
                    {configTab === 'format' && <TabFormat form={editedConfig} onChange={(e) => setEditedConfig(prev => ({ ...prev, [e.target.name]: e.target.value }))} vueltasDisabled={isVueltasLocked} isStarted={true} />}
                    {configTab === 'gameRules' && <TabGameRules reglas={editedConfig} setReglas={setEditedConfig} />}
                </div>
                <div className="modal-actions">
                    <Btnsave titulo="Guardar Cambios" bgcolor={v.colorPrincipal} funcion={() => { onSaveConfig(editedConfig); setConfigModalOpen(false); }} />
                </div>
            </ModalContent>
        </Modal>

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

const ModalContent = styled.div`
  display: flex; flex-direction: column; gap: 15px;
  .modal-actions { display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px solid ${({theme})=>theme.bg4}; }
`;

const Container = styled.div` display: flex; flex-direction: column; gap: 15px; width: 100%; `;
const TransitionWrapper = styled.div` animation: ${keyframes` from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } `} 0.4s both; width: 100%; flex: 1; display: flex; flex-direction: column; `;
const Workspace = styled.div` display: flex; gap: 20px; height: 550px; @media(max-width:768px){ flex-direction:column; height:auto; } `;
const MainZone = styled.div` flex: 1; overflow: hidden; display: flex; flex-direction: column; `;
const DropZone = styled.div` flex: 1; background: ${({theme, $isOver})=> $isOver ? theme.bg4+'40' : theme.bgcards}; border: 2px dashed ${({theme, $isOver})=> $isOver ? v.colorPrincipal : theme.bg4}; border-radius: 10px; padding: 20px; overflow-y: auto; position: relative; transition: all 0.3s ease; .placeholder { position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; opacity:0.4; p { margin-top: 10px; font-size: 0.9rem; } } `;
const GridList = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const Footer = styled.div` display: flex; justify-content: space-between; align-items: center; margin-top: 5px; .note { font-size: 0.8rem; font-weight: 700; color: ${v.colorPrincipal}; background: ${v.colorPrincipal}15; padding: 8px 12px; border-radius: 8px; } `;