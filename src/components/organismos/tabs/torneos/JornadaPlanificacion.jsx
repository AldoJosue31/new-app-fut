import React, { useState, useEffect, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { v, Btnsave, Toast, ContainerScroll } from "../../../../index"; 
import { generarFixture } from "../../../../services/torneos"; 
import { RiCalendarLine, RiCheckDoubleLine, RiAddCircleLine, RiLockLine } from "react-icons/ri";

// Subcomponentes modulares
import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PendingMatchCard } from "./planificacion/PendingMatchCard";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ManualMatchModal } from "./planificacion/ManualMatchModal";
import { ResultModal } from "./planificacion/ResultModal";

export function JornadaPlanificacion({ 
  matchesDB = [], 
  globalPendingMatches = [], 
  teams,         
  jornadaIndex,
  activeTournament,
  jornadaData, 
  onConfirm, 
  onChangeJornada,
  totalJornadas,
  onMatchUpdate,
  canConfirm 
}) {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [fixtureMaster, setFixtureMaster] = useState([]);

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

  // --- 1. Fixture ---
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

  // --- 2. Procesamiento de Partidos ---
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
            date: m.date ? m.date.split('T')[0] : getDefaultDate(),
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
            if (m.status === 'Programado' || m.status === 'Finalizado') {
                dbScheduled.push(matchObj);
            } else {
                dbPendingForThisJornada.push(matchObj);
            }
        }
    });
    setScheduledMatches(dbScheduled);

    // Filtro Ajustado: Muestra pendientes globales que NO estén en la lista local
    const formattedGlobalPending = globalPendingMatches
        .map(formatMatch)
        .filter(m => m !== null)
        .filter(m => !dbPendingForThisJornada.some(localM => localM.id === m.id));

    const allPendingReal = [...dbPendingForThisJornada, ...formattedGlobalPending];

    // Sugerencias
    let suggestions = [];
    if (fixtureMaster[jornadaIndex]) {
        const crucesIdeales = fixtureMaster[jornadaIndex];
        crucesIdeales.forEach(cruce => {
            const t1 = teams.find(t => t.id === cruce.home);
            const t2 = teams.find(t => t.id === cruce.away);
            if (!t1 || !t2) return;
            const exists = [...dbScheduled, ...allPendingReal].some(m => 
                (m.local.id === t1.id && m.visitante.id === t2.id) ||
                (m.local.id === t2.id && m.visitante.id === t1.id)
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

  }, [matchesDB, globalPendingMatches, teams, fixtureMaster, jornadaIndex]);

  // --- Helpers ---
  const getDefaultDate = () => {
     if(!activeTournament?.start_date) return new Date().toISOString().split('T')[0];
     const fecha = new Date(activeTournament.start_date);
     fecha.setDate(fecha.getDate() + (jornadaIndex * 7));
     return fecha.toISOString().split('T')[0];
  };

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

  // --- HANDLE DROP (MODIFICADO PARA PERMITIR DOBLE JORNADA) ---
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!draggedMatch || isConfirmed) return;

    // 1. Evitar duplicar EXACTAMENTE el mismo partido (ID match)
    const alreadyExists = scheduledMatches.some(m => m.id === draggedMatch.id);
    if (alreadyExists) {
        setToast({ show: true, msg: 'Este partido específico ya está en la lista.', type: 'warning' });
        return;
    }

    // 2. Validación de Cruces (Opcional: evitar A vs B dos veces el mismo día)
    const duplicateMatchup = scheduledMatches.find(m => 
       (m.local.id === draggedMatch.local.id && m.visitante.id === draggedMatch.visitante.id) ||
       (m.local.id === draggedMatch.visitante.id && m.visitante.id === draggedMatch.local.id)
    );
    if (duplicateMatchup) {
         setToast({ show: true, msg: 'Advertencia: Estos dos equipos ya juegan entre sí hoy.', type: 'warning' });
         // No hacemos return, permitimos que se agregue si el usuario quiere
    }

    // 3. Detectar Doble Jornada (Informativo, NO Bloqueante)
    // Verificamos si alguno de los equipos ya está jugando otro partido
    const isDoubleHeader = scheduledMatches.some(m => 
        m.local.id === draggedMatch.local.id || m.local.id === draggedMatch.visitante.id ||
        m.visitante.id === draggedMatch.local.id || m.visitante.id === draggedMatch.visitante.id
    );

    if (isDoubleHeader) {
        // Mostramos un mensaje de éxito/info indicando que se ha permitido la doble jornada
        setToast({ show: true, msg: 'Doble Jornada: Un equipo jugará más de un partido.', type: 'success' });
    }

    // 4. Calcular hora automática
    let nextTime = "10:00";
    if (scheduledMatches.length > 0) {
        const lastMatch = scheduledMatches[scheduledMatches.length - 1];
        const [h, m] = lastMatch.time.split(':').map(Number);
        const totalMin = h * 60 + m + durationMatch;
        const nh = Math.floor(totalMin / 60);
        const nm = totalMin % 60;
        nextTime = `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
    }

    if (checkTimeCollision(nextTime, draggedMatch.id)) {
        setToast({ show: true, msg: `Horario ajustado (${nextTime})`, type: '' });
    }

    // 5. Agregar el partido
    const newMatch = { 
        ...draggedMatch, 
        time: nextTime, 
        date: draggedMatch.date || getDefaultDate(), 
        status: 'Programado',
        is_rescheduled: true, 
        new_jornada_id: jornadaData?.id 
    };

    setScheduledMatches([...scheduledMatches, newMatch]);
    setPendingMatches(pendingMatches.filter(m => m.id !== draggedMatch.id));
    setDraggedMatch(null);
  };

  const handleManualAdd = (localId, visitaId) => {
      if (!localId || !visitaId) return;
      if (localId === visitaId) { setToast({ show: true, msg: 'Equipos iguales.', type: 'error' }); return; }
      const t1 = teams.find(t => t.id === parseInt(localId));
      const t2 = teams.find(t => t.id === parseInt(visitaId));
      
      // Permitimos agregar cruces manuales incluso si ya juegan otros partidos (Doble jornada manual)
      // Solo validamos que no sea el MISMO cruce exacto
      const matchExists = [...scheduledMatches, ...pendingMatches].some(m => 
        (m.local.id === t1.id && m.visitante.id === t2.id) || (m.local.id === t2.id && m.visitante.id === t1.id)
      );
      
      if (matchExists) { setToast({ show: true, msg: 'Este cruce específico ya existe.', type: 'error' }); return; }
      
      const newManual = { id: `manual-${Date.now()}`, local: t1, visitante: t2, date: getDefaultDate(), status: 'Pendiente' };
      setPendingMatches([...pendingMatches, newManual]);
      setManualModalOpen(false);
      setToast({ show: true, msg: 'Partido agregado.', type: 'success' });
  };

  const handleTryConfirm = () => {
      if(!canConfirm) {
          setToast({ show: true, msg: `Confirma la jornada anterior primero.`, type: 'error' });
          return;
      }
      if (onConfirm) onConfirm({ id: jornadaIndex + 1, matches: scheduledMatches, pendingMatches });
  };

  return (
    <Container>
        <Toast show={toast.show} message={toast.msg} type={toast.type} onClose={()=>setToast({...toast, show:false})}/>
        
        <PlanningHeader 
            jornadaIndex={jornadaIndex} 
            status={jornadaData.status} 
            onPrev={() => onChangeJornada(Math.max(0, jornadaIndex-1))}
            onNext={() => onChangeJornada(Math.min(totalJornadas-1, jornadaIndex+1))}
            totalJornadas={totalJornadas}
        />

        <TransitionWrapper key={jornadaIndex}>
            <Workspace>
                <Sidebar>
                    <div className="sb-header">
                        <span>Por Asignar ({pendingMatches.length})</span>
                        {!isConfirmed && (
                            <button className="btn-add" onClick={() => setManualModalOpen(true)}>
                                <RiAddCircleLine />
                            </button>
                        )}
                    </div>
                    <div className="scroll-wrapper">
                        <ContainerScroll>
                           <div className="list-content">
                                {pendingMatches.map(match => (
                                    <PendingMatchCard 
                                        key={match.id} 
                                        match={match} 
                                        isConfirmed={isConfirmed}
                                        onDragStart={(e) => {
                                            if(isConfirmed) return;
                                            setDraggedMatch(match);
                                            e.dataTransfer.setData("text", match.id);
                                        }}
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
                    onDrop={handleDrop}
                    $isOver={isDragOver}
                >
                    {scheduledMatches.length === 0 ? (
                        <div className="placeholder"><RiCalendarLine size={40}/>
                            {isConfirmed ? "Sin partidos programados." : "Arrastra los partidos aquí"}
                        </div>
                    ) : (
                        <Grid>
                            {scheduledMatches.map((match, idx) => (
                                <ScheduledMatchRow 
                                    key={match.id}
                                    match={match}
                                    isConfirmed={isConfirmed}
                                    onUpdateDate={(val) => { const up=[...scheduledMatches]; up[idx].date=val; setScheduledMatches(up); }}
                                    onUpdateTime={(val) => { if(checkTimeCollision(val, match.id)) setToast({show:true, msg:'Conflicto horario', type:'warning'}); const up=[...scheduledMatches]; up[idx].time=val; setScheduledMatches(up); }}
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

        <ManualMatchModal isOpen={manualModalOpen} onClose={()=>setManualModalOpen(false)} teams={teams} onAdd={handleManualAdd} />
        <ResultModal isOpen={resultModalOpen} onClose={()=>setResultModalOpen(false)} match={selectedMatchResult} onSave={(id, h, a) => { if(onMatchUpdate) onMatchUpdate(id, { status: 'Finalizado', goals1: parseInt(h), goals2: parseInt(a) }); }} />

    </Container>
  );
}

// Estilos
const slideIn = keyframes` from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } `;
const Container = styled.div` display: flex; flex-direction: column; gap: 15px; width: 100%; `;
const TransitionWrapper = styled.div` animation: ${slideIn} 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; width: 100%; `;

const Workspace = styled.div` display: flex; gap: 20px; height: 500px; @media(max-width:768px){flex-direction:column; height:auto;} `;
const Sidebar = styled.div` 
    width: 280px; background: ${({theme})=>theme.bgcards}; border: 1px solid ${({theme})=>theme.bg4}; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden;
    .sb-header { padding: 10px; border-bottom: 1px solid ${({theme})=>theme.bg4}; display: flex; justify-content: space-between; align-items: center; font-weight: 600; 
        .btn-add { background: none; border: none; font-size: 1.5rem; color: ${v.colorPrincipal}; cursor: pointer; transition:0.2s; &:hover{transform:scale(1.1);} } 
    }
    .scroll-wrapper { flex: 1; height: 100%; overflow: hidden; }
    .list-content { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
    .empty { text-align: center; opacity: 0.5; margin-top: 20px; }
`;
const DropZone = styled.div`
    flex: 1; background: ${({theme, $isOver})=> $isOver ? theme.bg4+'40' : theme.bgcards}; 
    border: 2px dashed ${({theme, $isOver})=> $isOver ? v.colorPrincipal : theme.bg4}; border-radius: 10px; padding: 20px; overflow-y: auto; position: relative;
    .placeholder { position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; opacity:0.5; svg{display:block; margin:0 auto 10px;} }
`;
const Grid = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const Footer = styled.div` display: flex; justify-content: space-between; align-items: center; margin-top: 5px; .note{font-size:0.8rem; opacity:0.7;} `;
const WarningTooltip = styled.div`
    position: absolute; bottom: 100%; right: 0; background: #e74c3c; color: white;
    padding: 5px 10px; border-radius: 5px; font-size: 0.8rem; margin-bottom: 8px;
    white-space: nowrap; pointer-events: none; animation: fadeIn 0.2s;
    &:after { content:''; position:absolute; top:100%; right:20px; border:5px solid transparent; border-top-color:#e74c3c; }
`;