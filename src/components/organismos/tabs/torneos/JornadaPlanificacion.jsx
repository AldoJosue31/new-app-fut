import React, { useState, useEffect, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { v, Btnsave, Toast, ContainerScroll, ViewToggle, Modal, TabsNavigation } from "../../../../index"; 
import { generarFixture } from "../../../../services/torneos"; 
import { supabase } from "../../../../supabase/supabase.config";
import { 
    RiCalendarLine, RiCheckDoubleLine, RiAddCircleLine, RiLockLine, 
    RiSettings4Line, RiInformationLine, RiFileList3Line, RiCoinLine, RiGitMergeLine 
} from "react-icons/ri";
import { IoMdStopwatch } from "react-icons/io";

// Componentes de formulario reutilizados
import { TabGeneral, TabScoring, TabFormat, TabGameRules } from "./subcomponents/TorneoFormTabs";

// Subcomponentes modulares
import { PlanningHeader } from "./planificacion/PlanningHeader";
import { PendingMatchCard } from "./planificacion/PendingMatchCard";
import { ScheduledMatchRow } from "./planificacion/ScheduledMatchRow";
import { ManualMatchModal } from "./planificacion/ManualMatchModal";
import { ResultModal } from "./planificacion/ResultModal";
import { WeeklyGridView } from "./planificacion/WeeklyGridView";

export function JornadaPlanificacion({ 
  matchesDB = [], globalPendingMatches = [], teams, jornadaIndex, activeTournament,
  jornadaData, onConfirm, onChangeJornada, totalJornadas, onMatchUpdate, canConfirm, onSaveConfig
}) {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [externalMatches, setExternalMatches] = useState([]);
  const [fixtureMaster, setFixtureMaster] = useState([]);
  const [weekStartDate, setWeekStartDate] = useState("");

  const [viewMode, setViewMode] = useState('list');
  const [draggedMatch, setDraggedMatch] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });

  // --- ESTADOS PARA MODAL DE REGLAS ---
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configTab, setConfigTab] = useState("general");
  const [editedConfig, setEditedConfig] = useState(activeTournament?.config || {});

  const isConfirmed = jornadaData?.status === 'Confirmada';
  const isVueltasLocked = (jornadaIndex + 1) > Math.ceil(totalJornadas / 2);

  // --- LÓGICA DE TIEMPOS (RESTAURADA) ---
  const durationMatch = useMemo(() => {
    const minPorTiempo = parseInt(activeTournament?.config?.minutosPorTiempo || 45);
    const minDescanso = parseInt(activeTournament?.config?.minutosDescanso || 15);
    return (minPorTiempo * 2) + minDescanso;
  }, [activeTournament]);

  const autoAdjustTimes = (matches, dateToFix) => {
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

        if (currStartMinutes < prevEndMinutes) {
            const newH = Math.floor(prevEndMinutes / 60);
            const newM = prevEndMinutes % 60;
            curr.time = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
            adjusted = true;
        }
    }
    if (adjusted) setToast({ show: true, msg: "Horarios ajustados por traslape.", type: "warning" });
    const otherMatches = matches.filter(m => m.date !== dateToFix);
    return [...otherMatches, ...matchesOfDay];
  };

  // --- MASTER CALENDAR (RESTAURADO) ---
  useEffect(() => {
    if (!weekStartDate) return;
    const fetchCrossDivisionMatches = async () => {
        const start = `${weekStartDate}T00:00:00Z`;
        const endDate = new Date(weekStartDate + "T00:00:00");
        endDate.setDate(endDate.getDate() + 7);
        const { data, error } = await supabase
            .from('matches')
            .select(`id, date, status, team1:teams!matches_team1_id_fkey(name), team2:teams!matches_team2_id_fkey(name), jornada:jornadas!inner( tournament:tournaments!inner( division:divisions!inner(name) ) )`)
            .gte('date', start).lt('date', endDate.toISOString()).neq('jornada_id', jornadaData.id);
        if (!error) setExternalMatches(data || []);
    };
    fetchCrossDivisionMatches();
  }, [weekStartDate, jornadaData.id]);

  // --- SINCRONIZACIÓN DE CONFIGURACIÓN ---
  useEffect(() => { setEditedConfig(activeTournament?.config || {}); }, [activeTournament]);

  const handleConfigChange = (e) => {
      const { name, value, type, checked } = e.target;
      setEditedConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  useEffect(() => {
    if (activeTournament?.start_date) {
        const baseDate = new Date(activeTournament.start_date + "T00:00:00");
        baseDate.setDate(baseDate.getDate() + (jornadaIndex * 7));
        setWeekStartDate(baseDate.toISOString().split('T')[0]);
    }
  }, [activeTournament, jornadaIndex]);

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
            id: m.id, local: localTeam, visitante: visitTeam,
            date: m.date ? m.date.split('T')[0] : weekStartDate,
            time: m.date && m.date.includes('T') ? m.date.split('T')[1].substring(0,5) : "10:00",
            status: m.status, goals1: m.goals1, goals2: m.goals2,
            jornada_id: m.jornada_id, originJornada: m.jornadas?.name 
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
    const formattedGlobalPending = globalPendingMatches.map(formatMatch).filter(m => m !== null && !dbPendingForThisJornada.some(localM => localM.id === m.id));
    const allPendingReal = [...dbPendingForThisJornada, ...formattedGlobalPending];
    let suggestions = [];
    if (fixtureMaster[jornadaIndex]) {
        fixtureMaster[jornadaIndex].forEach(cruce => {
            const t1 = teams.find(t => t.id === cruce.home);
            const t2 = teams.find(t => t.id === cruce.away);
            if (!t1 || !t2) return;
            const exists = [...dbScheduled, ...allPendingReal].some(m => (m.local.id === t1.id && m.visitante.id === t2.id) || (m.local.id === t2.id && m.visitante.id === t1.id));
            if (!exists) suggestions.push({ id: `suggested-${jornadaIndex}-${t1.id}-${t2.id}`, local: t1, visitante: t2, status: 'Pendiente' });
        });
    }
    setPendingMatches([...allPendingReal, ...suggestions]);
  }, [matchesDB, globalPendingMatches, teams, fixtureMaster, jornadaIndex, weekStartDate]);

  // --- MANEJO DE DROP CON INCREMENTO DE HORA (RESTAURADO) ---
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (!draggedMatch || isConfirmed) return;

    let nextTime = "10:00";
    const matchesOfToday = scheduledMatches.filter(m => m.date === weekStartDate);
    if (matchesOfToday.length > 0) {
        const last = matchesOfToday.sort((a,b) => a.time.localeCompare(b.time)).pop();
        const [h, m] = last.time.split(':').map(Number);
        const total = (h * 60) + m + durationMatch;
        nextTime = `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
    }

    const newMatch = { ...draggedMatch, time: nextTime, date: weekStartDate, status: 'Programado' };
    setScheduledMatches(autoAdjustTimes([...scheduledMatches, newMatch], weekStartDate));
    setPendingMatches(pendingMatches.filter(m => m.id !== draggedMatch.id));
    setDraggedMatch(null);
  };

  const onSaveConfigAndClose = () => {
    onSaveConfig(editedConfig);
    setConfigModalOpen(false);
  };

  return (
    <Container>
        <Toast show={toast.show} message={toast.msg} type={toast.type} onClose={()=>setToast({...toast, show:false})} />
        <HeaderWrapper>
            <PlanningHeader 
                jornadaIndex={jornadaIndex} status={jornadaData.status} 
                onPrev={() => onChangeJornada(Math.max(0, jornadaIndex-1))}
                onNext={() => onChangeJornada(Math.min(totalJornadas-1, jornadaIndex+1))}
                totalJornadas={totalJornadas} weekStartDate={weekStartDate}
                setWeekStartDate={setWeekStartDate} lastMatchDate={useMemo(() => {
                  if (scheduledMatches.length === 0) return weekStartDate;
                  const dates = scheduledMatches.map(m => new Date(m.date + "T00:00:00").getTime());
                  return new Date(Math.max(...dates)).toISOString().split('T')[0];
                }, [scheduledMatches, weekStartDate])}
            />
            <BtnConfig onClick={() => setConfigModalOpen(true)}><RiSettings4Line size={20}/></BtnConfig>
            <ViewToggle currentMode={viewMode} onToggle={setViewMode} />
        </HeaderWrapper>

        <TransitionWrapper key={jornadaIndex + viewMode}>
            <Workspace>
                <Sidebar>
                    <div className="sb-header"><span>Por Asignar ({pendingMatches.length})</span>{!isConfirmed && <button className="btn-add" onClick={() => setManualModalOpen(true)}><RiAddCircleLine /></button>}</div>
                    <div className="scroll-wrapper"><ContainerScroll><div className="list-content">
                        {pendingMatches.map(match => ( <PendingMatchCard key={match.id} match={match} isConfirmed={isConfirmed} onDragStart={(e) => { if(!isConfirmed) { setDraggedMatch(match); e.dataTransfer.setData("text", match.id); } }} jornadaIndex={jornadaIndex}/> ))}
                        {pendingMatches.length === 0 && <div className="empty">Todo asignado ✅</div>}
                    </div></ContainerScroll></div>
                </Sidebar>
                <MainZone>
                    {viewMode === 'list' ? (
                        <DropZone onDragOver={(e)=>{e.preventDefault(); if(!isConfirmed) setIsDragOver(true)}} onDragLeave={()=>setIsDragOver(false)} onDrop={handleDrop} $isOver={isDragOver}>
                            {scheduledMatches.length === 0 ? ( <div className="placeholder"><RiCalendarLine size={40}/> {isConfirmed ? "Sin partidos." : "Arrastra partidos aquí"}</div> ) : (
                                <GridList>{scheduledMatches.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map((match, idx) => (
                                    <ScheduledMatchRow 
                                      key={match.id} match={match} isConfirmed={isConfirmed} 
                                      onUpdateDate={(val) => {
                                        const up = [...scheduledMatches];
                                        const mIdx = up.findIndex(m => m.id === match.id);
                                        up[mIdx].date = val;
                                        setScheduledMatches(autoAdjustTimes(up, val));
                                      }}
                                      onUpdateTime={(val) => {
                                        const up = [...scheduledMatches];
                                        const mIdx = up.findIndex(m => m.id === match.id);
                                        up[mIdx].time = val;
                                        setScheduledMatches(autoAdjustTimes(up, match.date));
                                      }}
                                      onRemove={() => { setScheduledMatches(scheduledMatches.filter(m => m.id !== match.id)); setPendingMatches([...pendingMatches, { ...match, status: 'Pendiente' }]); }} 
                                      onOpenResult={(m) => { setSelectedMatchResult(m); setResultModalOpen(true); }} 
                                      onPostpone={(m) => { if(onMatchUpdate) onMatchUpdate(m.id, { status: 'Pendiente', date: null }); }} 
                                    />
                                ))}</GridList>
                            )}
                        </DropZone>
                    ) : ( <WeeklyGridView weekStartDate={weekStartDate} scheduledMatches={scheduledMatches} externalMatches={externalMatches} divisionActual={activeTournament?.division?.name} isConfirmed={isConfirmed} onOpenResult={(m) => { setSelectedMatchResult(m); setResultModalOpen(true); }} onPostpone={(m) => { if(onMatchUpdate) onMatchUpdate(m.id, { status: 'Pendiente', date: null }); }} /> )}
                </MainZone>
            </Workspace>
        </TransitionWrapper>

        <Footer>
            <div className="note">Duración total partido: {durationMatch} min</div>
            {!isConfirmed && ( <Btnsave titulo="Confirmar Jornada" funcion={() => onConfirm({ id: jornadaIndex + 1, matches: scheduledMatches, pendingMatches })} icono={<RiCheckDoubleLine/>} bgcolor={canConfirm ? v.colorPrincipal : '#95a5a6'} /> )}
        </Footer>

        <Modal isOpen={configModalOpen} onClose={() => setConfigModalOpen(false)} title="Editar Reglas de Torneo" width="600px">
            <ModalContent>
                <div className="info-box"><RiInformationLine/><span>Ciertos ajustes están bloqueados por el progreso del torneo.</span></div>
                <TabsNavigation tabs={[ { id: "general", label: "General", icon: <RiFileList3Line/> }, { id: "scoring", label: "Puntuación", icon: <RiCoinLine/> }, { id: "format", label: "Formato", icon: <RiGitMergeLine/> }, { id: "gameRules", label: "Reglas Juego", icon: <IoMdStopwatch/> } ]} activeTab={configTab} setActiveTab={setConfigTab} />
                <div style={{marginTop:'15px'}}>
                    {configTab === 'general' && <TabGeneral form={editedConfig} onChange={handleConfigChange} isStarted={true} activeTournament={activeTournament} />}
                    {configTab === 'scoring' && <TabScoring form={editedConfig} onChange={handleConfigChange} isStarted={true} />}
                    {configTab === 'format' && <TabFormat form={editedConfig} onChange={handleConfigChange} vueltasDisabled={isVueltasLocked} isStarted={true} />}
                    {configTab === 'gameRules' && <TabGameRules reglas={editedConfig} setReglas={setEditedConfig} />}
                </div>
                <div className="modal-actions"><Btnsave titulo="Guardar Cambios" bgcolor={v.colorPrincipal} funcion={onSaveConfigAndClose} /></div>
            </ModalContent>
        </Modal>

        <ManualMatchModal isOpen={manualModalOpen} onClose={()=>setManualModalOpen(false)} teams={teams} />
<ResultModal 
  isOpen={resultModalOpen} 
  onClose={() => setResultModalOpen(false)} 
  match={selectedMatchResult} 
  activeTournament={activeTournament}
  // CAMBIO AQUÍ: Agrega async y await
  onSave={async (id, updates) => { 
    if (onMatchUpdate) {
      await onMatchUpdate(id, updates); 
    }
  }} 
/>
    </Container>
  );
}
// (Styles se mantienen iguales que en tu versión previa)
const BtnConfig = styled.button` background: ${({theme})=>theme.bg4}; border: none; border-radius: 8px; width: 45px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${({theme})=>theme.text}; transition: all 0.2s; &:hover { background: ${v.colorPrincipal}20; color: ${v.colorPrincipal}; } `;
const ModalContent = styled.div` display: flex; flex-direction: column; gap: 15px; .info-box { background: ${v.colorPrincipal}10; padding: 10px; border-radius: 8px; font-size: 0.8rem; display: flex; gap: 10px; color: ${v.colorPrincipal}; align-items: center; } .modal-actions { display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px solid ${({theme})=>theme.bg4}; } `;
const Container = styled.div` display: flex; flex-direction: column; gap: 15px; width: 100%; `;
const HeaderWrapper = styled.div` display: flex; gap: 10px; align-items: stretch; > div:first-child { flex: 1; } `;
const TransitionWrapper = styled.div` animation: ${keyframes` from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } `} 0.4s both; width: 100%; flex: 1; display: flex; flex-direction: column; `;
const Workspace = styled.div` display: flex; gap: 20px; height: 550px; @media(max-width:768px){flex-direction:column; height:auto;} `;
const Sidebar = styled.div` width: 280px; background: ${({theme})=>theme.bgcards}; border: 1px solid ${({theme})=>theme.bg4}; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; .sb-header { padding: 10px; border-bottom: 1px solid ${({theme})=>theme.bg4}; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.9rem; } .scroll-wrapper { flex: 1; height: 100%; overflow: hidden; } .list-content { padding: 10px; display: flex; flex-direction: column; gap: 10px; } .empty { text-align: center; opacity: 0.5; margin-top: 20px; } `;
const MainZone = styled.div` flex: 1; overflow: hidden; display: flex; flex-direction: column; `;
const DropZone = styled.div` flex: 1; background: ${({theme, $isOver})=> $isOver ? theme.bg4+'40' : theme.bgcards}; border: 2px dashed ${({theme, $isOver})=> $isOver ? v.colorPrincipal : theme.bg4}; border-radius: 10px; padding: 20px; overflow-y: auto; position: relative; .placeholder { position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; opacity:0.5; } `;
const GridList = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const Footer = styled.div` display: flex; justify-content: space-between; align-items: center; margin-top: 5px; .note{ font-size: 0.8rem; font-weight: 700; color: ${v.colorPrincipal}; background: ${v.colorPrincipal}15; padding: 5px 10px; border-radius: 6px; } `;