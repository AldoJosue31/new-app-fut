import React, { useState, useEffect, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { v, Btnsave, Toast, ContainerScroll } from "../../../../index"; 
import { generarFixture } from "../../../../services/torneos"; 
import { RiCalendarLine, RiCheckDoubleLine, RiAddCircleLine, RiLockLine } from "react-icons/ri";

import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PendingMatchCard } from "./planificacion/PendingMatchCard";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ManualMatchModal } from "./planificacion/ManualMatchModal";
import { ResultModal } from "./planificacion/ResultModal";

export function JornadaPlanificacion({ 
  matchesDB = [], globalPendingMatches = [], teams, jornadaIndex,
  activeTournament, jornadaData, onConfirm, onChangeJornada,
  totalJornadas, onMatchUpdate, canConfirm 
}) {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [fixtureMaster, setFixtureMaster] = useState([]);
  const [weekStartDate, setWeekStartDate] = useState("");

  // UI States
  const [draggedMatch, setDraggedMatch] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });

  const isConfirmed = jornadaData?.status === 'Confirmada';
  
  const durationMatch = useMemo(() => {
    const minPorTiempo = parseInt(activeTournament?.config?.minutosPorTiempo || 45);
    return (minPorTiempo * 2) + 15;
  }, [activeTournament]);

// Inicializar fecha de semana según configuración del torneo
  useEffect(() => {
    if (activeTournament?.start_date) {
        const baseDate = new Date(activeTournament.start_date + "T00:00:00");
        baseDate.setDate(baseDate.getDate() + (jornadaIndex * 7));
        setWeekStartDate(baseDate.toISOString().split('T')[0]);
    }
  }, [activeTournament, jornadaIndex]);

// AJUSTE AUTOMÁTICO: Si cambia la semana, movemos partidos fuera de rango al nuevo inicio
  useEffect(() => {
    if (!weekStartDate || isConfirmed || scheduledMatches.length === 0) return;
    const start = new Date(weekStartDate + "T00:00:00");
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    let count = 0;
    const adjusted = scheduledMatches.map(m => {
        const curr = new Date(m.date + "T00:00:00");
        if (curr < start || curr > end) {
            count++;
            return { ...m, date: weekStartDate };
        }
        return m;
    });

    if (count > 0) {
        setScheduledMatches(adjusted);
        setToast({ show: true, msg: `Se ajustaron ${count} partidos a la nueva semana definida (DD/MM/YY).`, type: 'warning' });
    }
  }, [weekStartDate]);

  // --- 3. Validación de fecha individual ---
const validateDateInRange = (targetDate) => {
    const start = new Date(weekStartDate + "T00:00:00");
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const current = new Date(targetDate + "T00:00:00");

    if (current < start) {
        setToast({ show: true, msg: 'Fecha ajustada al inicio de la semana.', type: 'warning' });
        return weekStartDate;
    }
    if (current > end) {
        setToast({ show: true, msg: 'La fecha excede la semana. Ajustada al límite de 7 días.', type: 'warning' });
        return end.toISOString().split('T')[0];
    }
    return targetDate;
  };

  // --- 4. Fixture y Procesamiento ---
  useEffect(() => {
    if (teams && teams.length > 1) {
      const vueltas = activeTournament?.config?.vueltas || "1";
      const baseRounds = generarFixture(teams);
      let finalFixture = [...baseRounds];
      if (vueltas === "2") {
          const roundsVuelta = baseRounds.map(r => r.map(m => ({ home: m.away, away: m.home })));
          finalFixture = [...baseRounds, ...roundsVuelta];
      }
      setFixtureMaster(finalFixture);
    }
  }, [teams, activeTournament]);

  useEffect(() => {
    if (!teams) return;
    const dbScheduled = [];
    const dbPendingForThisJornada = [];

    const formatMatch = (m) => {
        const localTeam = teams.find(t => t.id == m.team1_id);
        const visitTeam = teams.find(t => t.id == m.team2_id);
        if (!localTeam || !visitTeam) return null;
        return {
            id: m.id,
            local: localTeam,
            visitante: visitTeam,
            date: m.date ? m.date.split('T')[0] : weekStartDate,
            time: m.date && m.date.includes('T') ? m.date.split('T')[1].substring(0,5) : "10:00",
            status: m.status,
            goals1: m.goals1,
            goals2: m.goals2,
            jornada_id: m.jornada_id,
            originJornada: m.jornadas?.name 
        };
    };

    matchesDB.forEach(m => {
        const matchObj = formatMatch(m);
        if (matchObj) {
            if (m.status === 'Programado' || m.status === 'Finalizado') dbScheduled.push(matchObj);
            else dbPendingForThisJornada.push(matchObj);
        }
    });
    setScheduledMatches(dbScheduled);

    const formattedGlobalPending = globalPendingMatches
        .map(formatMatch)
        .filter(m => m !== null && !dbPendingForThisJornada.some(localM => localM.id === m.id));

    const allPendingReal = [...dbPendingForThisJornada, ...formattedGlobalPending];

    let suggestions = [];
    if (fixtureMaster[jornadaIndex]) {
        fixtureMaster[jornadaIndex].forEach(cruce => {
            const t1 = teams.find(t => t.id === cruce.home);
            const t2 = teams.find(t => t.id === cruce.away);
            if (!t1 || !t2) return;
            const exists = [...dbScheduled, ...allPendingReal].some(m => 
                (m.local.id === t1.id && m.visitante.id === t2.id) || (m.local.id === t2.id && m.visitante.id === t1.id)
            );
            if (!exists) {
                suggestions.push({
                    id: `suggested-${jornadaIndex}-${t1.id}-${t2.id}`,
                    local: t1, visitante: t2, status: 'Pendiente'
                });
            }
        });
    }
    setPendingMatches([...allPendingReal, ...suggestions]);
  }, [matchesDB, globalPendingMatches, teams, fixtureMaster, jornadaIndex, weekStartDate]);

    const lastMatchDate = useMemo(() => {
    if (scheduledMatches.length === 0) return weekStartDate;
    const dates = scheduledMatches.map(m => new Date(m.date + "T00:00:00").getTime());
    return new Date(Math.max(...dates)).toISOString().split('T')[0];
  }, [scheduledMatches, weekStartDate]);

  const checkTimeCollision = (newTime, matchIdToIgnore) => {
      const [h, m] = newTime.split(':').map(Number);
      const newStart = h * 60 + m;
      const newEnd = newStart + durationMatch;
      for (const match of scheduledMatches) {
          if (match.id === matchIdToIgnore) continue;
          const [mh, mm] = match.time.split(':').map(Number);
          const existStart = mh * 60 + mm;
          const existEnd = existStart + durationMatch;
          if (newStart < existEnd && newEnd > existStart) return true; 
      }
      return false;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!draggedMatch || isConfirmed) return;

    if (scheduledMatches.some(m => m.id === draggedMatch.id)) {
        setToast({ show: true, msg: 'Este partido ya está programado.', type: 'warning' });
        return;
    }

    let nextTime = "10:00";
    if (scheduledMatches.length > 0) {
        const lastMatch = scheduledMatches[scheduledMatches.length - 1];
        const [h, m] = lastMatch.time.split(':').map(Number);
        const totalMin = h * 60 + m + durationMatch;
        nextTime = `${String(Math.floor(totalMin/60)).padStart(2,'0')}:${String(totalMin%60).padStart(2,'0')}`;
    }

    const newMatch = { 
        ...draggedMatch, 
        time: nextTime, 
        date: weekStartDate, // Por defecto al inicio de la semana seleccionada
        status: 'Programado'
    };

    setScheduledMatches([...scheduledMatches, newMatch]);
    setPendingMatches(pendingMatches.filter(m => m.id !== draggedMatch.id));
    setDraggedMatch(null);
  };

const handleTryConfirm = () => {
      if(!canConfirm) { setToast({ show: true, msg: `Confirma la jornada anterior primero.`, type: 'error' }); return; }
      if (onConfirm) onConfirm({ id: jornadaIndex + 1, matches: scheduledMatches, pendingMatches });
  };

  return (
    <Container>
        <Toast show={toast.show} message={toast.msg} type={toast.type} onClose={()=>setToast({...toast, show:false})}/>
        <PlanningHeader 
            jornadaIndex={jornadaIndex} status={jornadaData.status} 
            onPrev={() => onChangeJornada(Math.max(0, jornadaIndex-1))}
            onNext={() => onChangeJornada(Math.min(totalJornadas-1, jornadaIndex+1))}
            totalJornadas={totalJornadas}
            weekStartDate={weekStartDate} setWeekStartDate={setWeekStartDate} lastMatchDate={lastMatchDate}
        />

        <TransitionWrapper key={jornadaIndex}>
            <Workspace>
                <Sidebar>
                    <div className="sb-header">
                        <span>Por Asignar ({pendingMatches.length})</span>
                        {!isConfirmed && <button className="btn-add" onClick={() => setManualModalOpen(true)}><RiAddCircleLine /></button>}
                    </div>
                    <div className="scroll-wrapper">
                        <ContainerScroll>
                           <div className="list-content">
                                {pendingMatches.map(match => (
                                    <PendingMatchCard 
                                        key={match.id} match={match} isConfirmed={isConfirmed}
                                        onDragStart={(e) => { if(!isConfirmed) { setDraggedMatch(match); e.dataTransfer.setData("text", match.id); } }}
                                        jornadaIndex={jornadaIndex}
                                    />
                                ))}
                                {pendingMatches.length === 0 && <div className="empty">Todo asignado ✅</div>}
                           </div>
                        </ContainerScroll>
                    </div>
                </Sidebar>

                <DropZone 
                    onDragOver={(e)=>{e.preventDefault(); if(!isConfirmed) setIsDragOver(true)}} 
                    onDragLeave={()=>setIsDragOver(false)}
                    onDrop={handleDrop} $isOver={isDragOver}
                >
                    {scheduledMatches.length === 0 ? (
                        <div className="placeholder"><RiCalendarLine size={40}/> {isConfirmed ? "Sin partidos." : "Arrastra partidos aquí"}</div>
                    ) : (
                        <Grid>
                            {scheduledMatches.map((match, idx) => (
                                <ScheduledMatchRow 
                                    key={match.id} match={match} isConfirmed={isConfirmed}
onUpdateDate={(val) => { 
                        const validated = validateDateInRange(val);
                        const up=[...scheduledMatches]; up[idx].date=validated; setScheduledMatches(up); 
                    }}
                                    onUpdateTime={(val) => { 
                                        if(checkTimeCollision(val, match.id)) setToast({show:true, msg:'Conflicto horario', type:'warning'}); 
                                        const up=[...scheduledMatches]; up[idx].time=val; setScheduledMatches(up); 
                                    }}
                                    onRemove={() => { 
                                        setScheduledMatches(scheduledMatches.filter(m => m.id !== match.id)); 
                                        setPendingMatches([...pendingMatches, { ...match, status: 'Pendiente' }]); 
                                    }}
                                    onOpenResult={(m) => { setSelectedMatchResult(m); setResultModalOpen(true); }}
                                    onPostpone={(m) => { if(onMatchUpdate) onMatchUpdate(m.id, { status: 'Pendiente', date: null }); }}
                                />
                            ))}
                        </Grid>
                    )}
                </DropZone>
            </Workspace>
        </TransitionWrapper>

        <Footer>
            <div className="note">Duración: {durationMatch} min</div>
            {!isConfirmed && (
                <div style={{position:'relative'}}>
                    {!canConfirm && <WarningTooltip>Confirma jornada previa.</WarningTooltip>}
                    <Btnsave titulo="Confirmar Jornada" funcion={handleTryConfirm} icono={canConfirm ? <RiCheckDoubleLine/> : <RiLockLine/>} bgcolor={canConfirm ? v.colorPrincipal : '#95a5a6'} />
                </div>
            )}
        </Footer>

        <ManualMatchModal isOpen={manualModalOpen} onClose={()=>setManualModalOpen(false)} teams={teams} onAdd={(l,v)=>setToast({show:true, msg:'Partido agregado', type:'success'})} />
        <ResultModal isOpen={resultModalOpen} onClose={()=>setResultModalOpen(false)} match={selectedMatchResult} onSave={(id, h, a) => { if(onMatchUpdate) onMatchUpdate(id, { status: 'Finalizado', goals1: h, goals2: a }); }} />
    </Container>
  );
}

// Estilos
const slideIn = keyframes` from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } `;
const Container = styled.div` display: flex; flex-direction: column; gap: 15px; width: 100%; `;
const TransitionWrapper = styled.div` animation: ${slideIn} 0.4s both; width: 100%; `;
const Workspace = styled.div` display: flex; gap: 20px; height: 500px; @media(max-width:768px){flex-direction:column; height:auto;} `;
const Sidebar = styled.div` 
    width: 280px; background: ${({theme})=>theme.bgcards}; border: 1px solid ${({theme})=>theme.bg4}; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden;
    .sb-header { padding: 10px; border-bottom: 1px solid ${({theme})=>theme.bg4}; display: flex; justify-content: space-between; align-items: center; font-weight: 600; 
        .btn-add { background: none; border: none; font-size: 1.5rem; color: ${v.colorPrincipal}; cursor: pointer; } 
    }
    .scroll-wrapper { flex: 1; height: 100%; overflow: hidden; }
    .list-content { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
    .empty { text-align: center; opacity: 0.5; margin-top: 20px; }
`;
const DropZone = styled.div`
    flex: 1; background: ${({theme, $isOver})=> $isOver ? theme.bg4+'40' : theme.bgcards}; 
    border: 2px dashed ${({theme, $isOver})=> $isOver ? v.colorPrincipal : theme.bg4}; border-radius: 10px; padding: 20px; overflow-y: auto; position: relative;
    .placeholder { position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; opacity:0.5; }
`;
const Grid = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const Footer = styled.div` display: flex; justify-content: space-between; align-items: center; margin-top: 5px; .note{font-size:0.8rem; opacity:0.7;} `;
const WarningTooltip = styled.div`
    position: absolute; bottom: 100%; right: 0; background: #e74c3c; color: white;
    padding: 5px 10px; border-radius: 5px; font-size: 0.8rem; margin-bottom: 8px; white-space: nowrap;
`;