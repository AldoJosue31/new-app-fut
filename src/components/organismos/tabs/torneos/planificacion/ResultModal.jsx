import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { 
  v, 
  Modal, 
  BtnNormal, 
  Btnsave, 
  InputNumber, 
  Toast
} from "../../../../../index";
import { supabase } from "../../../../../supabase/supabase.config";
import { 
  RiErrorWarningLine,
  RiCheckDoubleLine,
  RiUserStarFill,
  RiUserAddLine
} from "react-icons/ri";
import { useDivisionStore } from "../../../../../store/DivisionStore";

export function ResultModal({ isOpen, onClose, match, onSave, activeTournament }) {
    
  const { selectedDivision } = useDivisionStore();

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  const [referees, setReferees] = useState([]);
  const [localPlayers, setLocalPlayers] = useState([]);
  const [visitPlayers, setVisitPlayers] = useState([]);
  
  const [selectedReferee, setSelectedReferee] = useState("");
  const [isWalkover, setIsWalkover] = useState(false);
  const [woWinnerId, setWoWinnerId] = useState(null);
  const [penalties, setPenalties] = useState({ local: 0, visit: 0 });

  const [rosterLocal, setRosterLocal] = useState([]);
  const [rosterVisit, setRosterVisit] = useState([]);

  // 1. OBTENER REGLAS DE PUNTUACIÓN DEL TORNEO
  const winPoints = parseInt(activeTournament?.config?.winPoints ?? 3);
  const drawPoints = parseInt(activeTournament?.config?.drawPoints ?? 1);
  const lossPoints = parseInt(activeTournament?.config?.lossPoints ?? 0);
  

  // --- REGLAS Y CÁLCULOS ---
  const minPlayers = parseInt(activeTournament?.config?.minPlayers || 7);
  const halfMinPlayers = Math.ceil(minPlayers / 2); // Mínimo requerido para asistencia
  const maxSubs = 10; 

  // Detecta si la liga define desempate por penales o shout outs
 const isExtraPointEnabled = useMemo(() => {
    const type = activeTournament?.config?.tieBreakType?.toLowerCase();
    return type === 'penalties' || type === 'shoutouts' || type === 'shouts' || type === 'penales';
  }, [activeTournament]);

  useEffect(() => {
    if (isOpen && match) {
      setSelectedReferee(match.referee_id || "");
      setIsWalkover(false);
      setWoWinnerId(null);
      setPenalties({ local: 0, visit: 0 });
      setActiveTab('general');
      fetchInitialData();
    }
  }, [isOpen, match?.id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      let leagueId = 
        activeTournament?.division?.league_id || 
        activeTournament?.league_id || 
        activeTournament?.leagues?.id ||
        selectedDivision?.league_id;

      const divId = activeTournament?.division_id || activeTournament?.id_division || selectedDivision?.id;
      
      if (!leagueId && divId) {
        const { data: divData } = await supabase
          .from('divisions')
          .select('league_id')
          .eq('id', divId)
          .single();
        if (divData) leagueId = divData.league_id;
      }

      if (leagueId) {
        const { data: refs } = await supabase
          .from('referees')
          .select('*')
          .eq('league_id', leagueId)
          .order('full_name');
        setReferees(refs || []);
      }

      const { data: pLocal } = await supabase.from('players').select('*').eq('team_id', match?.local?.id).eq('is_suspended', false).order('first_name');
      const { data: pVisit } = await supabase.from('players').select('*').eq('team_id', match?.visitante?.id).eq('is_suspended', false).order('first_name');
      
      setLocalPlayers(pLocal || []);
      setVisitPlayers(pVisit || []);

      const createInitialRoster = (prefix) => Array.from({ length: minPlayers }, (_, i) => ({ 
        idTemp: `${prefix}-${i}`, 
        playerId: "", 
        goals: 0, 
        yellow: false, 
        red: false, 
        isStarter: true 
      }));

      setRosterLocal(createInitialRoster('l'));
      setRosterVisit(createInitialRoster('v'));

    } catch (error) {
      setToastConfig({ show: true, message: "Error al cargar datos", type: "error" });
    } finally {
      setLoading(false);
    }
  };

const totalGoalsLocal = useMemo(() => {
    if (isWalkover) return woWinnerId === match?.local?.id ? 3 : 0;
    return rosterLocal.reduce((acc, p) => acc + (parseInt(p.goals) || 0), 0);
  }, [rosterLocal, isWalkover, woWinnerId, match]);

const totalGoalsVisit = useMemo(() => {
    if (isWalkover) return woWinnerId === match?.visitante?.id ? 3 : 0;
    return rosterVisit.reduce((acc, p) => acc + (parseInt(p.goals) || 0), 0);
  }, [rosterVisit, isWalkover, woWinnerId, match]);

  const calculatePoints = () => {
    let p1 = 0;
    let p2 = 0;

    if (isWalkover) {
      if (woWinnerId === match?.local?.id) { p1 = winPoints; p2 = lossPoints; }
      else { p1 = lossPoints; p2 = winPoints; }
    } else if (totalGoalsLocal > totalGoalsVisit) {
      p1 = winPoints; p2 = lossPoints;
    } else if (totalGoalsVisit > totalGoalsLocal) {
      p1 = lossPoints; p2 = winPoints;
    } else {
      // Es un empate
      p1 = drawPoints;
      p2 = drawPoints;
      // Aplicar punto extra por penales si aplica
      if (isExtraPointEnabled) {
        if (parseInt(penalties.local) > parseInt(penalties.visit)) p1 += 1;
        else if (parseInt(penalties.visit) > parseInt(penalties.local)) p2 += 1;
      }
    }
    return { p1, p2 };
  };

  const isTie = totalGoalsLocal === totalGoalsVisit && !isWalkover;

  // --- MANEJADORES DE LÓGICA ---

  const handleWalkoverSelect = (teamId) => {
    if (woWinnerId === teamId) {
      setWoWinnerId(null);
      setIsWalkover(false);
    } else {
      setWoWinnerId(teamId);
      setIsWalkover(true);
    }
  };

  const handleUpdateRoster = (team, index, field, value) => {
    const isLocal = team === 'local';
    const roster = isLocal ? rosterLocal : rosterVisit;
    const setter = isLocal ? setRosterLocal : setRosterVisit;

    const newRoster = [...roster];
    newRoster[index] = { ...newRoster[index], [field]: value };
    
    if (field === 'playerId' && value !== "" && index === newRoster.length - 1 && newRoster.length < (minPlayers + maxSubs)) {
        newRoster.push({ 
          idTemp: `${isLocal ? 'l' : 'v'}-${Date.now()}`, 
          playerId: "", goals: 0, yellow: false, red: false, isStarter: false 
        });
    }
    setter(newRoster);
  };

  // --- VALIDACIONES ANTES DE CONFIRMAR ---
  const handleSaveAttempt = () => {
    // 1. Validar Árbitro obligatorio
    if (!selectedReferee) {
      setToastConfig({ show: true, message: "Debe asignar un árbitro para finalizar el partido.", type: "error" });
      return;
    }

    // 2. Validar W.O.
    if (isWalkover && !woWinnerId) {
      setToastConfig({ show: true, message: "Seleccione al equipo ganador por default.", type: "error" });
      return;
    }

    // 3. Validar Mínimo de Jugadores (al menos la mitad de un equipo)
    const countLocal = rosterLocal.filter(p => p.playerId).length;
    const countVisit = rosterVisit.filter(p => p.playerId).length;

    if (countLocal < halfMinPlayers && countVisit < halfMinPlayers) {
      setToastConfig({ 
        show: true, 
        message: `Debe registrar al menos ${halfMinPlayers} jugadores en algún equipo.`, 
        type: "error" 
      });
      return;
    }

    // 4. Validar Penales sin empate
    if (isTie && isExtraPointEnabled) {
      if (parseInt(penalties.local) === parseInt(penalties.visit)) {
        setToastConfig({ show: true, message: "El desempate por penales no puede terminar en empate.", type: "error" });
        return;
      }
    }

    setShowConfirm(true);
  };

  const handleFinalSave = async () => {
    setLoading(true);
    try {
      // 1. Procesar eventos (goles y tarjetas)
      const events = [];
      const processRoster = (r) => {
        r.forEach(p => {
          if (!p.playerId) return;
          if (p.goals > 0) {
            for(let i=0; i < p.goals; i++) {
              events.push({ match_id: match.id, player_id: p.playerId, event_type: 'goal' });
            }
          }
          if (p.yellow) events.push({ match_id: match.id, player_id: p.playerId, event_type: 'yellow_card' });
          if (p.red) events.push({ match_id: match.id, player_id: p.playerId, event_type: 'red_card' });
        });
      };

      if (isWalkover) {
        if (woWinnerId === match?.local?.id) processRoster(rosterLocal);
        else processRoster(rosterVisit);
      } else {
        processRoster(rosterLocal); 
        processRoster(rosterVisit); 
      }

      if (events.length > 0) {
      const { error: eventError } = await supabase.from('match_events').insert(events);
      if (eventError) throw eventError;
    }

      // 2. Calcular puntos según reglas
      const { p1, p2 } = calculatePoints();

      // 3. Notificar al padre con TODOS los datos necesarios
      // El padre se encargará de actualizar la tabla 'matches' y refrescar la tabla general
await onSave(match.id, {
      goals1: totalGoalsLocal,
      goals2: totalGoalsVisit,
      puntos1: p1,
      puntos2: p2,
      referee_id: selectedReferee || null,
      status: 'Finalizado', // Crucial para la vista view_clasificacion
      observations: isWalkover ? 'W.O.' : (isTie ? `Pen: ${penalties.local}-${penalties.visit}` : '')
    });

onClose();
  } catch (e) {
    console.error(e);
    setToastConfig({ show: true, message: "Error al guardar: " + e.message, type: "error" });
  } finally {
    setLoading(false);
  }
};

  // --- COMPONENTES AUXILIARES ---
  const PlayerRow = ({ slot, idx, team, players, globalRoster }) => (
    <div className="player-row" key={slot.idTemp}>
      <select 
        value={slot.playerId} 
        onChange={(e) => handleUpdateRoster(team, idx, 'playerId', e.target.value)}
      >
        <option value="">Seleccionar...</option>
        {players.map(p => (
          <option key={p.id} value={p.id} disabled={globalRoster.some(r => r.playerId == p.id && r.idTemp !== slot.idTemp)}>
            {p.first_name} {p.last_name} {p.dorsal ? `(${p.dorsal})` : ''}
          </option>
        ))}
      </select>

      <input 
        type="number" 
        min="0" 
        value={slot.goals} 
        onChange={(e) => handleUpdateRoster(team, idx, 'goals', e.target.value)} 
        disabled={!slot.playerId || isWalkover} 
      />
      
      <CardCheck 
        $color="#f1c40f" 
        $active={slot.yellow} 
        onClick={() => slot.playerId && !isWalkover && handleUpdateRoster(team, idx, 'yellow', !slot.yellow)}
      />
      <CardCheck 
        $color="#e74c3c" 
        $active={slot.red} 
        onClick={() => slot.playerId && !isWalkover && handleUpdateRoster(team, idx, 'red', !slot.red)}
      />
    </div>
  );

  const RosterSection = ({ team, players, roster }) => {
    return (
      <RosterGrid>
        <div className="section-title"><RiUserStarFill/> Titulares (Mínimo {minPlayers})</div>
        <div className="header-row">
          <span>Jugador</span>
          <span>Goles</span>
          <span>TA</span>
          <span>TR</span>
        </div>
        {roster.map((slot, idx) => slot.isStarter && (
          <PlayerRow key={slot.idTemp} slot={slot} idx={idx} team={team} players={players} globalRoster={roster} />
        ))}

        <div className="section-title subs"><RiUserAddLine/> Suplentes</div>
        {roster.map((slot, idx) => !slot.isStarter && (
          <PlayerRow key={slot.idTemp} slot={slot} idx={idx} team={team} players={players} globalRoster={roster} />
        ))}
      </RosterGrid>
    );
  };

  if (!isOpen || !match) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} width="900px" title="Definir Resultado">
        <Container>
          <ScoreHeader>
            <TeamInfo>
              <img src={match.local?.logo_url || v.iconofotovacia} alt="L" />
              <h3>{match.local?.name}</h3>
              <span className="score">{totalGoalsLocal}</span>
            </TeamInfo>
            <div className="center-info">
              <span className="vs">VS</span>
              <div className="match-data">
                <span>{activeTournament?.division?.name}</span>
                <span>{match.time}</span>
              </div>
            </div>
            <TeamInfo>
              <span className="score">{totalGoalsVisit}</span>
              <h3>{match.visitante?.name}</h3>
              <img src={match.visitante?.logo_url || v.iconofotovacia} alt="V" />
            </TeamInfo>
          </ScoreHeader>

          <TabsHeader>
            <TabItem $active={activeTab === 'general'} onClick={() => setActiveTab('general')}>General</TabItem>
            
            {/* Si es W.O. solo se permite ver el roster del equipo ganador */}
            {(!isWalkover || (isWalkover && woWinnerId === match.local?.id)) && (
              <TabItem $active={activeTab === 'local'} onClick={() => setActiveTab('local')}>Local</TabItem>
            )}
            
            {(!isWalkover || (isWalkover && woWinnerId === match.visitante?.id)) && (
              <TabItem $active={activeTab === 'visit'} onClick={() => setActiveTab('visit')}>Visitante</TabItem>
            )}

            {isTie && isExtraPointEnabled && (
                <TabItem $active={activeTab === 'penalties'} onClick={() => setActiveTab('penalties')}>Penales</TabItem>
            )}
          </TabsHeader>

          <ContentBody>
            {activeTab === 'general' && (
              <div className="form-section">
                <div className="input-group">
                  <label>Árbitro Principal *</label>
                  <select value={selectedReferee} onChange={(e) => setSelectedReferee(e.target.value)}>
                    <option value="">Seleccione...</option>
                    {referees.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                  </select>
                </div>
                <WalkoverBox $active={isWalkover}>
                  <div className="wo-header" onClick={() => {
                      setIsWalkover(!isWalkover);
                      if (isWalkover) setWoWinnerId(null);
                  }}>
                    <RiErrorWarningLine size={24}/><span>Victoria por Default (W.O.)</span>
                  </div>
                  {isWalkover && (
                    <div className="wo-content">
                      <div className="wo-btns">
                        <BtnNormal 
                            titulo={match.local?.name} 
                            bgcolor={woWinnerId === match.local?.id ? v.colorPrincipal : v.bg3} 
                            funcion={() => handleWalkoverSelect(match.local?.id)}
                        />
                        <BtnNormal 
                            titulo={match.visitante?.name} 
                            bgcolor={woWinnerId === match.visitante?.id ? v.colorPrincipal : v.bg3} 
                            funcion={() => handleWalkoverSelect(match.visitante?.id)}
                        />
                      </div>
                      <p style={{fontSize:'0.8rem', opacity:0.6}}>* Declare la asistencia en la pestaña del equipo ganador.</p>
                    </div>
                  )}
                </WalkoverBox>
              </div>
            )}

            {activeTab === 'local' && <RosterSection team="local" players={localPlayers} roster={rosterLocal} />}
            {activeTab === 'visit' && <RosterSection team="visit" players={visitPlayers} roster={rosterVisit} />}

            {activeTab === 'penalties' && (
              <PenaltiesContainer>
                <div className="pen-inputs">
                   <div className="team"><span>{match.local?.name}</span><InputNumber value={penalties.local} onChange={(e) => setPenalties({...penalties, local: e.target.value})} /></div>
                   <div className="team"><span>{match.visitante?.name}</span><InputNumber value={penalties.visit} onChange={(e) => setPenalties({...penalties, visit: e.target.value})} /></div>
                </div>
              </PenaltiesContainer>
            )}
          </ContentBody>
          <Footer>
            <BtnNormal titulo="Cancelar" funcion={onClose} />
            <Btnsave titulo="Guardar Marcador" funcion={handleSaveAttempt} loading={loading} />
          </Footer>
        </Container>

        {showConfirm && (
          <ConfirmOverlay>
            <div className="confirm-card">
              <RiCheckDoubleLine size={50} color={v.colorPrincipal} />
              <h2>¿Confirmar Marcador?</h2>
              <div className="final-score"><span>{totalGoalsLocal}</span> - <span>{totalGoalsVisit}</span></div>
              {isTie && isExtraPointEnabled && (
                  <div style={{fontSize: '0.9rem', opacity: 0.7, marginBottom: '10px'}}>
                      Penales: {penalties.local} - {penalties.visit}
                  </div>
              )}
              {isWalkover && <div style={{color:v.rojo, fontWeight:700, marginBottom:'10px'}}>W.O. CONFIRMADO</div>}
              <div className="confirm-btns">
                <BtnNormal titulo="Revisar" funcion={() => setShowConfirm(false)} />
                <Btnsave titulo="Si, Guardar" funcion={handleFinalSave} loading={loading} />
              </div>
            </div>
          </ConfirmOverlay>
        )}

        {/* EL TOAST SE RENDERIZA AQUÍ (DENTRO DEL MODAL) PARA QUEDAR SIEMPRE ENFRENTE */}
        <ToastContainerFix>
            <Toast 
                show={toastConfig.show} 
                message={toastConfig.message} 
                type={toastConfig.type} 
                onClose={() => setToastConfig({...toastConfig, show: false})} 
            />
        </ToastContainerFix>
      </Modal>
    </>
  );
}

// --- ESTILOS ---
const ToastContainerFix = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 9999; /* Por encima de todo lo demás en el modal */
  pointer-events: none; /* Permite clicks a través si el toast es pequeño */
`;

const Container = styled.div` display: flex; flex-direction: column; gap: 20px; `;
const ScoreHeader = styled.div` display: flex; justify-content: space-between; align-items: center; padding: 20px; background: ${({theme})=>theme.bg3}; border-radius: 15px; border: 1px solid ${({theme})=>theme.bg4}; .center-info { text-align: center; .vs { font-weight: 900; opacity: 0.3; font-size: 1.5rem; } .match-data { display: flex; flex-direction: column; font-size: 0.8rem; opacity: 0.6; } } `;
const TeamInfo = styled.div` display: flex; align-items: center; gap: 15px; width: 35%; img { width: 50px; height: 50px; object-fit: contain; } h3 { font-size: 1rem; flex: 1; text-align: center; } .score { font-size: 2.5rem; font-weight: 800; color: ${v.colorPrincipal}; } `;
const TabsHeader = styled.div` display: flex; border-bottom: 2px solid ${({theme})=>theme.bg4}; gap: 10px; `;
const TabItem = styled.div` padding: 10px 20px; cursor: pointer; font-weight: 600; opacity: ${({$active})=>$active ? 1 : 0.5}; border-bottom: 3px solid ${({$active})=>$active ? v.colorPrincipal : 'transparent'}; transition: 0.3s; color: ${({theme})=>theme.text}; `;
const ContentBody = styled.div` min-height: 300px; padding: 10px 0; `;

const RosterGrid = styled.div` 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
  .section-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: ${v.colorPrincipal};
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    &.subs { color: ${({theme})=>theme.text}; opacity: 0.7; }
  }
  .header-row { display: grid; grid-template-columns: 1fr 80px 50px 50px; padding: 0 10px; font-size: 0.7rem; opacity: 0.5; text-transform: uppercase; } 
  .player-row { display: grid; grid-template-columns: 1fr 80px 50px 50px; gap: 10px; align-items: center; padding: 8px; background: ${({theme})=>theme.bgtotal}; border-radius: 8px; border: 1px solid ${({theme})=>theme.bg4}; select, input { background: ${({theme})=>theme.bg3}; border: 1px solid ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; padding: 5px; border-radius: 5px; width: 100%; outline: none; } } 
`;

const CardCheck = styled.div` width: 20px; height: 28px; border-radius: 3px; cursor: pointer; border: 2px solid ${({$active, $color}) => $active ? $color : 'transparent'}; background: ${({$color, $active}) => $active ? $color : $color + '33'}; transition: 0.2s; `;
const WalkoverBox = styled.div` margin-top: 20px; border: 1px solid ${({$active}) => $active ? '#e74c3c' : 'transparent'}; background: ${({theme, $active}) => $active ? '#e74c3c15' : theme.bg3}; border-radius: 12px; .wo-header { padding: 15px; display: flex; align-items: center; gap: 10px; cursor: pointer; span { font-weight: 700; flex: 1; } } .wo-content { padding: 0 15px 15px 15px; .wo-btns { display: flex; gap: 10px; margin: 10px 0; } } `;
const PenaltiesContainer = styled.div` text-align: center; padding: 20px; .pen-inputs { display: flex; justify-content: center; gap: 40px; margin-top: 20px; .team { display: flex; flex-direction: column; gap: 10px; span { font-weight: 600; } } } `;
const Footer = styled.div` display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px; `;
const ConfirmOverlay = styled.div` position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; .confirm-card { background: ${({theme})=>theme.bgtotal}; padding: 40px; border-radius: 20px; text-align: center; max-width: 450px; .final-score { font-size: 1.5rem; font-weight: 800; margin: 20px 0; span { color: ${v.colorPrincipal}; font-size: 2.2rem; } } .confirm-btns { display: flex; gap: 15px; margin-top: 30px; justify-content: center; } } `;