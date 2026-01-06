import React, { useState, useEffect, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { v, Btnsave, Toast, ContainerScroll, ViewToggle } from "../../../../index"; 
import { generarFixture } from "../../../../services/torneos"; 
import { supabase } from "../../../../supabase/supabase.config";
import { RiCalendarLine, RiCheckDoubleLine, RiAddCircleLine, RiLockLine } from "react-icons/ri";

// Subcomponentes modulares
import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PendingMatchCard } from "./planificacion/PendingMatchCard";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ManualMatchModal } from "./planificacion/ManualMatchModal";
import { ResultModal } from "./planificacion/ResultModal";
import { WeeklyGridView } from "./planificacion/WeeklyGridView";

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
  // --- Estados de Datos ---
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [externalMatches, setExternalMatches] = useState([]); // Partidos de otras divisiones
  const [fixtureMaster, setFixtureMaster] = useState([]);
  const [weekStartDate, setWeekStartDate] = useState("");

  // --- Estados de UI ---
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [draggedMatch, setDraggedMatch] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });

  const isConfirmed = jornadaData?.status === 'Confirmada';
  
  // Cálculo de duración total: (Mins x 2) + Descanso
  const durationMatch = useMemo(() => {
    const minPorTiempo = parseInt(activeTournament?.config?.minutosPorTiempo || 45);
    const minDescanso = parseInt(activeTournament?.config?.minutosDescanso || 15);
    return (minPorTiempo * 2) + minDescanso;
  }, [activeTournament]);

  // --- Lógica de Ajuste Automático de Horarios ---
  const autoAdjustTimes = (matches, dateToFix) => {
    // Filtramos los partidos del día que se modificó y los ordenamos por hora
    let matchesOfDay = matches
      .filter(m => m.date === dateToFix)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (matchesOfDay.length <= 1) return matches;

    let adjusted = false;
    for (let i = 1; i < matchesOfDay.length; i++) {
        const prev = matchesOfDay[i - 1];
        const curr = matchesOfDay[i];

        const [ph, pm] = prev.time.split(':').map(Number);
        const prevEndMinutes = (ph * 60) + pm + durationMatch;
        
        const [ch, cm] = curr.time.split(':').map(Number);
        const currStartMinutes = (ch * 60) + cm;

        // Si el actual empieza antes de que termine el anterior, lo movemos automáticamente
        if (currStartMinutes < prevEndMinutes) {
            const newH = Math.floor(prevEndMinutes / 60);
            const newM = prevEndMinutes % 60;
            curr.time = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
            adjusted = true;
        }
    }

    if (adjusted) {
        setToast({ 
          show: true, 
          msg: "Horarios ajustados automáticamente para evitar traslapes.", 
          type: "warning" 
        });
    }

    const otherMatches = matches.filter(m => m.date !== dateToFix);
    return [...otherMatches, ...matchesOfDay];
  };

  // --- Búsqueda de partidos de TODAS las divisiones (Master Calendar) ---
  useEffect(() => {
    if (!weekStartDate) return;
    const fetchCrossDivisionMatches = async () => {
        const start = `${weekStartDate}T00:00:00Z`;
        const endDate = new Date(weekStartDate + "T00:00:00");
        endDate.setDate(endDate.getDate() + 7);
        const end = endDate.toISOString();

        // Buscamos partidos de cualquier división en el rango de esta semana
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id, date, status, 
                team1:teams!matches_team1_id_fkey(name),
                team2:teams!matches_team2_id_fkey(name),
                jornada:jornadas!inner(
                    tournament:tournaments!inner(
                        division:divisions!inner(name)
                    )
                )
            `)
            .gte('date', start)
            .lt('date', end)
            .neq('jornada_id', jornadaData.id); // Excluimos los de la jornada actual para no duplicar

        if (!error) setExternalMatches(data || []);
    };
    fetchCrossDivisionMatches();
  }, [weekStartDate, jornadaData.id]);

  // --- Gestión de Fechas y Semanas ---
  useEffect(() => {
    if (activeTournament?.start_date) {
        const baseDate = new Date(activeTournament.start_date + "T00:00:00");
        baseDate.setDate(baseDate.getDate() + (jornadaIndex * 7));
        setWeekStartDate(baseDate.toISOString().split('T')[0]);
    }
  }, [activeTournament, jornadaIndex]);

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
        setToast({ 
            show: true, 
            msg: `Se ajustaron ${count} partidos al nuevo rango semanal.`, 
            type: 'warning' 
        });
    }
  }, [weekStartDate, isConfirmed, scheduledMatches]);

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
        setToast({ show: true, msg: 'La fecha excede el límite de 7 días.', type: 'warning' });
        return end.toISOString().split('T')[0];
    }
    return targetDate;
  };

  const lastMatchDate = useMemo(() => {
    if (scheduledMatches.length === 0) return weekStartDate;
    const dates = scheduledMatches.map(m => new Date(m.date + "T00:00:00").getTime());
    return new Date(Math.max(...dates)).toISOString().split('T')[0];
  }, [scheduledMatches, weekStartDate]);

  // --- Lógica de Fixture y Procesamiento de Datos ---
  useEffect(() => {
    if (teams && teams.length > 1) {
      const baseRounds = generarFixture(teams);
      let finalFixture = [...baseRounds];
      if (activeTournament?.config?.vueltas === "2") {
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

  // --- Manejadores de Interacción ---
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!draggedMatch || isConfirmed) return;

    if (scheduledMatches.some(m => m.id === draggedMatch.id)) {
        setToast({ show: true, msg: 'Este partido ya está programado.', type: 'warning' });
        return;
    }

    let nextTime = "10:00";
    const matchesOfToday = scheduledMatches.filter(m => m.date === weekStartDate);
    if (matchesOfToday.length > 0) {
        const last = matchesOfToday.sort((a,b) => a.time.localeCompare(b.time)).pop();
        const [h, m] = last.time.split(':').map(Number);
        const total = (h * 60) + m + durationMatch;
        nextTime = `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
    }

    const newMatch = { ...draggedMatch, time: nextTime, date: weekStartDate, status: 'Programado' };
    const allMatches = [...scheduledMatches, newMatch];
    
    // Al agregar uno nuevo, validamos automáticamente los traslapes
    setScheduledMatches(autoAdjustTimes(allMatches, weekStartDate));
    setPendingMatches(pendingMatches.filter(m => m.id !== draggedMatch.id));
    setDraggedMatch(null);
  };

  const handleTryConfirm = () => {
      if(!canConfirm) { setToast({ show: true, msg: `Confirma la jornada anterior primero.`, type: 'error' }); return; }
      if (onConfirm) onConfirm({ id: jornadaIndex + 1, matches: scheduledMatches, pendingMatches });
  };

  return (
    <Container>
        <Toast 
          show={toast.show} 
          message={toast.msg} 
          type={toast.type} 
          onClose={()=>setToast({...toast, show:false})}
        />
        
        <HeaderWrapper>
            <PlanningHeader 
                jornadaIndex={jornadaIndex} 
                status={jornadaData.status} 
                onPrev={() => onChangeJornada(Math.max(0, jornadaIndex-1))}
                onNext={() => onChangeJornada(Math.min(totalJornadas-1, jornadaIndex+1))}
                totalJornadas={totalJornadas}
                weekStartDate={weekStartDate}
                setWeekStartDate={setWeekStartDate}
                lastMatchDate={lastMatchDate}
            />
            <ViewToggle currentMode={viewMode} onToggle={setViewMode} />
        </HeaderWrapper>

        <TransitionWrapper key={jornadaIndex + viewMode}>
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

                <MainZone>
                    {viewMode === 'list' ? (
                        <DropZone 
                            onDragOver={(e)=>{e.preventDefault(); if(!isConfirmed) setIsDragOver(true)}} 
                            onDragLeave={()=>setIsDragOver(false)}
                            onDrop={handleDrop} 
                            $isOver={isDragOver}
                        >
                            {scheduledMatches.length === 0 ? (
                                <div className="placeholder"><RiCalendarLine size={40}/> {isConfirmed ? "Sin partidos." : "Arrastra partidos aquí"}</div>
                            ) : (
                                <GridList>
                                    {scheduledMatches
                                      .sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                                      .map((match, idx) => (
                                        <ScheduledMatchRow 
                                            key={match.id} match={match} isConfirmed={isConfirmed}
                                            onUpdateDate={(val) => { 
                                                const validated = validateDateInRange(val);
                                                const up = [...scheduledMatches];
                                                up[idx].date = validated;
                                                setScheduledMatches(autoAdjustTimes(up, validated)); 
                                            }}
                                            onUpdateTime={(val) => { 
                                                const up = [...scheduledMatches];
                                                up[idx].time = val;
                                                setScheduledMatches(autoAdjustTimes(up, up[idx].date));
                                            }}
                                            onRemove={() => { 
                                                setScheduledMatches(scheduledMatches.filter(m => m.id !== match.id)); 
                                                setPendingMatches([...pendingMatches, { ...match, status: 'Pendiente' }]); 
                                            }}
                                            onOpenResult={(m) => { setSelectedMatchResult(m); setResultModalOpen(true); }}
                                            onPostpone={(m) => { if(onMatchUpdate) onMatchUpdate(m.id, { status: 'Pendiente', date: null }); }}
                                        />
                                    ))}
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
                            onOpenResult={(m) => { setSelectedMatchResult(m); setResultModalOpen(true); }}
                            onPostpone={(m) => { if(onMatchUpdate) onMatchUpdate(m.id, { status: 'Pendiente', date: null }); }}
                        />
                    )}
                </MainZone>
            </Workspace>
        </TransitionWrapper>

        <Footer>
            <div className="note">Duración total partido: {durationMatch} min</div>
            {!isConfirmed && (
                <div style={{position:'relative'}}>
                    {!canConfirm && <WarningTooltip>Confirma jornada previa.</WarningTooltip>}
                    <Btnsave 
                      titulo="Confirmar Jornada" 
                      funcion={handleTryConfirm} 
                      icono={canConfirm ? <RiCheckDoubleLine/> : <RiLockLine/>} 
                      bgcolor={canConfirm ? v.colorPrincipal : '#95a5a6'} 
                    />
                </div>
            )}
        </Footer>

        <ManualMatchModal isOpen={manualModalOpen} onClose={()=>setManualModalOpen(false)} teams={teams} onAdd={(l,v)=>setToast({show:true, msg:'Partido agregado', type:'success'})} />
        <ResultModal isOpen={resultModalOpen} onClose={()=>setResultModalOpen(false)} match={selectedMatchResult} onSave={(id, h, a) => { if(onMatchUpdate) onMatchUpdate(id, { status: 'Finalizado', goals1: h, goals2: a }); }} />
    </Container>
  );
}

const slideIn = keyframes` from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } `;
const Container = styled.div` display: flex; flex-direction: column; gap: 15px; width: 100%; `;
const HeaderWrapper = styled.div` display: flex; gap: 10px; align-items: stretch; > div:first-child { flex: 1; } `;
const TransitionWrapper = styled.div` animation: ${slideIn} 0.4s both; width: 100%; flex: 1; display: flex; flex-direction: column; `;
const Workspace = styled.div` display: flex; gap: 20px; height: 550px; @media(max-width:768px){flex-direction:column; height:auto;} `;
const Sidebar = styled.div` 
    width: 280px; background: ${({theme})=>theme.bgcards}; border: 1px solid ${({theme})=>theme.bg4}; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden;
    .sb-header { padding: 10px; border-bottom: 1px solid ${({theme})=>theme.bg4}; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.9rem; }
    .scroll-wrapper { flex: 1; height: 100%; overflow: hidden; }
    .list-content { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
    .empty { text-align: center; opacity: 0.5; margin-top: 20px; }
`;
const MainZone = styled.div` flex: 1; overflow: hidden; display: flex; flex-direction: column; `;
const DropZone = styled.div`
    flex: 1; background: ${({theme, $isOver})=> $isOver ? theme.bg4+'40' : theme.bgcards}; 
    border: 2px dashed ${({theme, $isOver})=> $isOver ? v.colorPrincipal : theme.bg4}; border-radius: 10px; padding: 20px; overflow-y: auto; position: relative;
    .placeholder { position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; opacity:0.5; }
`;
const GridList = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const Footer = styled.div` display: flex; justify-content: space-between; align-items: center; margin-top: 5px; .note{ font-size: 0.8rem; font-weight: 700; color: ${v.colorPrincipal}; background: ${v.colorPrincipal}15; padding: 5px 10px; border-radius: 6px; } `;
const WarningTooltip = styled.div`
    position: absolute; bottom: 100%; right: 0; background: #e74c3c; color: white;
    padding: 5px 10px; border-radius: 5px; font-size: 0.8rem; margin-bottom: 8px; white-space: nowrap;
`;