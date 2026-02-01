import React, { useState, useEffect, useMemo, useCallback } from "react";
import styled from "styled-components";
import { 
  v, 
  Modal, 
  BtnNormal, 
  Btnsave, 
  InputNumber, 
  Toast,
  TabsNavigation
} from "../../../../../index";
import { TabContent } from "../../../../moleculas/TabsNavigation";
import { supabase } from "../../../../../supabase/supabase.config";
import { 
  RiErrorWarningLine,
  RiCheckDoubleLine,
  RiUserStarFill,
  RiUserAddLine,
  RiFileList3Line,
  RiNumbersLine
} from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
import { useDivisionStore } from "../../../../../store/DivisionStore";

// --- COMPONENTE DE FILA OPTIMIZADO ---
const PlayerRow = React.memo(({ slot, idx, team, players, globalRoster, isWalkover, onUpdate }) => {
    return (
        <div className="player-row">
            <select 
                value={slot.playerId} 
                onChange={(e) => onUpdate(team, idx, 'playerId', e.target.value)}
                disabled={isWalkover}
            >
                <option value="">Seleccionar...</option>
                {players.map(p => (
                    <option 
                        key={p.id} 
                        value={p.id} 
                        // Deshabilitar si ya está seleccionado en OTRA fila (no en esta misma)
                        disabled={globalRoster.some(r => String(r.playerId) === String(p.id) && r.idTemp !== slot.idTemp)}
                    >
                        {p.first_name} {p.last_name} {p.dorsal ? `(${p.dorsal})` : ''}
                    </option>
                ))}
            </select>
            
            <input 
                type="number" 
                min="0" 
                value={slot.goals} 
                onChange={(e) => onUpdate(team, idx, 'goals', e.target.value)} 
                disabled={!slot.playerId || isWalkover} 
            />
            
            <CardCheck 
                $color="#f1c40f" 
                $active={slot.yellow} 
                onClick={() => slot.playerId && !isWalkover && onUpdate(team, idx, 'yellow', !slot.yellow)} 
            />
            
            <CardCheck 
                $color="#e74c3c" 
                $active={slot.red} 
                onClick={() => slot.playerId && !isWalkover && onUpdate(team, idx, 'red', !slot.red)} 
            />
        </div>
    );
});

export function ResultModal({ isOpen, onClose, match, onSave, activeTournament }) {
    
  const { selectedDivision } = useDivisionStore();

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
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

  // --- REGLAS ---
  const tournamentConfig = useMemo(() => {
      let config = {};
      try {
          if (activeTournament?.config) {
              config = typeof activeTournament.config === 'string' 
                  ? JSON.parse(activeTournament.config) 
                  : activeTournament.config;
          }
      } catch (e) {
          console.error("Error parsing config", e);
      }
      return config;
  }, [activeTournament]);

  const winPoints = parseInt(tournamentConfig.winPoints ?? 3);
  const drawPoints = parseInt(tournamentConfig.drawPoints ?? 1);
  const lossPoints = parseInt(tournamentConfig.lossPoints ?? 0);
  
  const minPlayers = parseInt(
      tournamentConfig.minPlayers || 
      activeTournament?.min_players || 
      activeTournament?.minPlayers || 
      7
  );
  
  const halfMinPlayers = Math.ceil(minPlayers / 2);
  const maxSubs = 15; 

  // Detectar si el torneo tiene desempate por penales configurado
  const isExtraPointEnabled = useMemo(() => {
    const type = (tournamentConfig.tieBreakType || "").toLowerCase();
    return ['penalties', 'shoutouts', 'shouts', 'penales'].includes(type);
  }, [tournamentConfig]);

  // --- CÁLCULOS DE GOLES EN VIVO ---
  const totalGoalsLocal = useMemo(() => {
    if (isWalkover) return woWinnerId === match?.local?.id ? 3 : 0;
    return rosterLocal.reduce((acc, p) => acc + (parseInt(p.goals) || 0), 0);
  }, [rosterLocal, isWalkover, woWinnerId, match]);

  const totalGoalsVisit = useMemo(() => {
    if (isWalkover) return woWinnerId === match?.visitante?.id ? 3 : 0;
    return rosterVisit.reduce((acc, p) => acc + (parseInt(p.goals) || 0), 0);
  }, [rosterVisit, isWalkover, woWinnerId, match]);

  // --- CONFIG TABS ---
  const modalTabs = useMemo(() => {
    const tabs = [{ id: "general", label: "General", icon: <RiFileList3Line/> }];
    if (!isWalkover || (isWalkover && woWinnerId === match?.local?.id)) {
      tabs.push({ id: "local", label: match?.local?.name || "Local", icon: <IoMdFootball/> });
    }
    if (!isWalkover || (isWalkover && woWinnerId === match?.visitante?.id)) {
      tabs.push({ id: "visit", label: match?.visitante?.name || "Visitante", icon: <IoMdFootball/> });
    }
    // Mostrar tab de penales si hay empate y está activada la regla
    if (totalGoalsLocal === totalGoalsVisit && isExtraPointEnabled && !isWalkover) {
      tabs.push({ id: "penalties", label: "Penales/Shouts", icon: <RiNumbersLine/> });
    }
    return tabs;
  }, [match, isWalkover, woWinnerId, totalGoalsLocal, totalGoalsVisit, isExtraPointEnabled]);

  // --- EFECTO DE APERTURA ---
  useEffect(() => {
    if (isOpen && match?.id) {
      setActiveTab('general');
      setShowConfirm(false);
      setLoading(true);
      fetchAllData();
    }
  }, [isOpen, match?.id]);

  // --- LÓGICA DE CARGA DE DATOS ---
  const fetchAllData = async () => {
    try {
      // 1. Obtener Datos Frescos del Partido
      const { data: freshMatch, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', match.id)
        .single();
        
      if (matchError) throw matchError;

      // 2. Obtener Árbitros
      let leagueId = activeTournament?.division?.league_id || activeTournament?.league_id;
      if (!leagueId && activeTournament?.division_id) {
        const { data: divData } = await supabase.from('divisions').select('league_id').eq('id', activeTournament.division_id).single();
        if (divData) leagueId = divData.league_id;
      }
      
      const refereePromise = leagueId 
        ? supabase.from('referees').select('*').eq('league_id', leagueId).order('full_name')
        : Promise.resolve({ data: [] });

      // 3. Obtener Jugadores
      const localPlayersPromise = supabase.from('players').select('*').eq('team_id', match.local.id).eq('is_suspended', false).order('first_name');
      const visitPlayersPromise = supabase.from('players').select('*').eq('team_id', match.visitante.id).eq('is_suspended', false).order('first_name');

      // 4. Obtener Eventos Guardados
      const eventsPromise = supabase.from('match_events').select('*').eq('match_id', match.id);

      const [refsRes, localRes, visitRes, eventsRes] = await Promise.all([
        refereePromise, localPlayersPromise, visitPlayersPromise, eventsPromise
      ]);

      setReferees(refsRes.data || []);
      setLocalPlayers(localRes.data || []);
      setVisitPlayers(visitRes.data || []);

      // SETEAR ESTADO DEL PARTIDO DESDE DB
      setSelectedReferee(freshMatch.referee_id || "");
      
      // Parsear Observaciones
      const obs = freshMatch.observations || "";
      const isWO = obs.includes('W.O.');
      setIsWalkover(isWO);
      
      if(isWO) {
        setWoWinnerId(freshMatch.goals1 > freshMatch.goals2 ? match.local.id : match.visitante.id);
      } else {
        setWoWinnerId(null);
      }

      // Lógica de lectura de penales (debe coincidir con la lógica de escritura)
      if (obs.includes('Pen')) {
        try {
            const matchPen = obs.match(/Pen.*:\s*(\d+)\s*-\s*(\d+)/i);
            if (matchPen) {
                setPenalties({ local: parseInt(matchPen[1]), visit: parseInt(matchPen[2]) });
            } else {
                setPenalties({ local: 0, visit: 0 });
            }
        } catch(e) { setPenalties({ local: 0, visit: 0 }); }
      } else {
        setPenalties({ local: 0, visit: 0 });
      }

      // RECONSTRUIR ROSTERS
      const existingEvents = eventsRes.data || [];
      const isEditMode = freshMatch.status === 'Finalizado';
      
      setRosterLocal(reconstructRoster(localRes.data || [], existingEvents, 'l', isEditMode));
      setRosterVisit(reconstructRoster(visitRes.data || [], existingEvents, 'v', isEditMode));

    } catch (error) {
      console.error("Error loading result data:", error);
      setToastConfig({ show: true, message: "Error cargando datos del partido", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const reconstructRoster = (players, events, prefix, isEditMode) => {
      // 1. Mapa de estadísticas por jugador (Normalizado a String ID)
      const statsMap = {};
      events.forEach(ev => {
          const sId = String(ev.player_id); // CLAVE: Convertir a string para evitar errores de tipo
          if (!statsMap[sId]) statsMap[sId] = { goals: 0, yellow: false, red: false, played: true };
          
          if (ev.event_type === 'goal') statsMap[sId].goals++;
          if (ev.event_type === 'yellow_card') statsMap[sId].yellow = true;
          if (ev.event_type === 'red_card') statsMap[sId].red = true;
      });

      // 2. Identificar jugadores activos
      const activePlayers = [];
      
      players.forEach(p => {
          const sId = String(p.id);
          if (statsMap[sId]) {
              activePlayers.push({
                  playerId: p.id,
                  ...statsMap[sId]
              });
          }
      });

      // 3. Construir Roster Final
      const roster = [];
      
      if (isEditMode && activePlayers.length > 0) {
          // MODO EDICIÓN
          activePlayers.forEach((pData, index) => {
              roster.push({
                  idTemp: `${prefix}-loaded-${index}`,
                  isStarter: index < minPlayers, 
                  playerId: pData.playerId,
                  goals: pData.goals,
                  yellow: pData.yellow,
                  red: pData.red
              });
          });

          // Rellenar hasta el mínimo
          while (roster.length < minPlayers) {
              roster.push({
                  idTemp: `${prefix}-fill-${roster.length}`,
                  isStarter: true,
                  playerId: "", goals: 0, yellow: false, red: false
              });
          }

          // Añadir slot para suplente extra
          if (roster.length < (minPlayers + maxSubs)) {
               roster.push({ 
                  idTemp: `${prefix}-extra-${Date.now()}`, 
                  isStarter: false,
                  playerId: "", goals: 0, yellow: false, red: false 
              });
          }

      } else {
          // MODO NUEVO
          for (let i = 0; i < minPlayers; i++) {
              roster.push({
                  idTemp: `${prefix}-${i}`,
                  isStarter: true,
                  playerId: "", goals: 0, yellow: false, red: false
              });
          }
          roster.push({ 
              idTemp: `${prefix}-new-sub`, 
              playerId: "", goals: 0, yellow: false, red: false, isStarter: false 
          });
      }

      return roster;
  };

  // --- HANDLERS ---
  const handleUpdateRoster = useCallback((team, index, field, value) => {
    const isLocal = team === 'local';
    const setter = isLocal ? setRosterLocal : setRosterVisit;
    
    setter(prevRoster => {
        const newRoster = [...prevRoster];
        newRoster[index] = { ...newRoster[index], [field]: value };

        // Auto-agregar fila
        if (field === 'playerId' && value !== "" && index === newRoster.length - 1 && newRoster.length < (minPlayers + maxSubs)) {
            newRoster.push({ 
                idTemp: `${isLocal ? 'l' : 'v'}-${Date.now()}`, 
                playerId: "", 
                goals: 0, 
                yellow: false, 
                red: false, 
                isStarter: false 
            });
        }
        return newRoster;
    });
  }, [minPlayers, maxSubs]);

  const handleWalkoverSelect = (teamId) => {
    if (woWinnerId === teamId) {
      setWoWinnerId(null);
      setIsWalkover(false);
    } else {
      setWoWinnerId(teamId);
      setIsWalkover(true);
    }
  };

  const handleSaveAttempt = () => {
    if (!selectedReferee) return setToastConfig({ show: true, message: "Debe asignar un árbitro.", type: "error" });
    if (isWalkover && !woWinnerId) return setToastConfig({ show: true, message: "Seleccione al ganador por default.", type: "error" });
    
    if (!isWalkover) {
        const countLocal = rosterLocal.filter(p => p.playerId).length;
        const countVisit = rosterVisit.filter(p => p.playerId).length;
        if (countLocal < halfMinPlayers && countVisit < halfMinPlayers) {
             return setToastConfig({ show: true, message: `Advertencia: Pocos jugadores registrados.`, type: "warning" });
        }
    }
    
    // Validación de penales
    if (totalGoalsLocal === totalGoalsVisit && isExtraPointEnabled && !isWalkover) {
      if (parseInt(penalties.local) === parseInt(penalties.visit)) {
        return setToastConfig({ show: true, message: "Los penales no pueden terminar en empate.", type: "error" });
      }
    }
    
    setShowConfirm(true);
  };

  const handleFinalSave = async () => {
    setLoading(true);
    try {
      // 1. ELIMINAR EVENTOS ANTERIORES
      const { error: delError } = await supabase.from('match_events').delete().eq('match_id', match.id);
      if(delError) throw delError;

      // 2. PROCESAR NUEVOS EVENTOS
      const events = [];
      const processRoster = (r) => {
        r.forEach(p => {
          if (!p.playerId) return;
          
          events.push({ match_id: match.id, player_id: p.playerId, event_type: 'participation' });

          if (p.goals > 0) {
            for(let i=0; i < p.goals; i++) events.push({ match_id: match.id, player_id: p.playerId, event_type: 'goal' });
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

      // 3. CALCULAR PUNTOS
      let p1 = 0, p2 = 0;
      let obs = "";

      if (isWalkover) {
        if (woWinnerId === match?.local?.id) { p1 = winPoints; p2 = lossPoints; }
        else { p1 = lossPoints; p2 = winPoints; }
        obs = "W.O.";
      } else if (totalGoalsLocal > totalGoalsVisit) {
        p1 = winPoints; p2 = lossPoints;
      } else if (totalGoalsVisit > totalGoalsLocal) {
        p1 = lossPoints; p2 = winPoints;
      } else {
        p1 = drawPoints; p2 = drawPoints;
        if (isExtraPointEnabled) {
          if (parseInt(penalties.local) > parseInt(penalties.visit)) p1 += 1;
          else p2 += 1;
          
          // FORMATO ESTÁNDAR PARA PENALES
          obs = `Pen: ${penalties.local}-${penalties.visit}`;
        }
      }

      await onSave(match.id, {
        goals1: totalGoalsLocal,
        goals2: totalGoalsVisit,
        puntos1: p1,
        puntos2: p2,
        referee_id: selectedReferee,
        status: 'Finalizado',
        observations: obs
      });
      onClose();
    } catch (e) {
      setToastConfig({ show: true, message: "Error al guardar: " + e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !match) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="950px" title="Definir Resultado" closeOnOverlayClick={false}>
      <Container>
        <ScoreHeader>
          <TeamInfo>
            <img src={match.local?.logo_url || v.iconofotovacia} alt="L" />
            <h3>{match.local?.name}</h3>
            <span className="score">{totalGoalsLocal}</span>
          </TeamInfo>
          <div className="center-info">
            <span className="vs">VS</span>
            <div className="match-data"><span>{activeTournament?.division?.name}</span><span>{match.time}</span></div>
          </div>
          <TeamInfo>
            <span className="score">{totalGoalsVisit}</span>
            <h3>{match.visitante?.name}</h3>
            <img src={match.visitante?.logo_url || v.iconofotovacia} alt="V" />
          </TeamInfo>
        </ScoreHeader>

        {loading ? (
            <LoadingState>Cargando datos del partido...</LoadingState>
        ) : (
            <>
                <TabsWrapper><TabsNavigation tabs={modalTabs} activeTab={activeTab} setActiveTab={setActiveTab} /></TabsWrapper>

                <ContentBody>
                {activeTab === 'general' && (
                    <TabContent>
                    <InputGroup>
                        <label><RiUserStarFill/> Árbitro Principal *</label>
                        <select value={selectedReferee} onChange={(e) => setSelectedReferee(e.target.value)}>
                        <option value="">Seleccione un árbitro...</option>
                        {referees.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                        </select>
                    </InputGroup>
                    <WalkoverBox $active={isWalkover}>
                        <div className="wo-header" onClick={() => { setIsWalkover(!isWalkover); if (!isWalkover) setWoWinnerId(null); }}>
                        <RiErrorWarningLine size={24}/><span>Victoria por Default (W.O.)</span>
                        </div>
                        {isWalkover && (
                        <div className="wo-content">
                            <div className="wo-btns">
                            <BtnNormal titulo={match.local?.name} bgcolor={woWinnerId === match.local?.id ? v.colorPrincipal : v.bg3} funcion={() => handleWalkoverSelect(match.local?.id)} />
                            <BtnNormal titulo={match.visitante?.name} bgcolor={woWinnerId === match.visitante?.id ? v.colorPrincipal : v.bg3} funcion={() => handleWalkoverSelect(match.visitante?.id)} />
                            </div>
                        </div>
                        )}
                    </WalkoverBox>
                    </TabContent>
                )}

                {activeTab === 'local' && (
                    <TabContent>
                    <RosterGrid>
                        <div className="section-title"><RiUserStarFill/> Titulares (Mínimo {minPlayers})</div>
                        <div className="header-row"><span>Jugador</span><span>Goles</span><span>TA</span><span>TR</span></div>
                        {rosterLocal.map((slot, idx) => slot.isStarter && (
                            <PlayerRow key={slot.idTemp} slot={slot} idx={idx} team="local" players={localPlayers} globalRoster={rosterLocal} isWalkover={isWalkover} onUpdate={handleUpdateRoster} />
                        ))}
                        <div className="section-title subs"><RiUserAddLine/> Suplentes</div>
                        {rosterLocal.map((slot, idx) => !slot.isStarter && (
                             <PlayerRow key={slot.idTemp} slot={slot} idx={idx} team="local" players={localPlayers} globalRoster={rosterLocal} isWalkover={isWalkover} onUpdate={handleUpdateRoster} />
                        ))}
                    </RosterGrid>
                    </TabContent>
                )}

                {activeTab === 'visit' && (
                    <TabContent>
                    <RosterGrid>
                        <div className="section-title"><RiUserStarFill/> Titulares</div>
                        <div className="header-row"><span>Jugador</span><span>Goles</span><span>TA</span><span>TR</span></div>
                        {rosterVisit.map((slot, idx) => slot.isStarter && (
                            <PlayerRow key={slot.idTemp} slot={slot} idx={idx} team="visit" players={visitPlayers} globalRoster={rosterVisit} isWalkover={isWalkover} onUpdate={handleUpdateRoster} />
                        ))}
                        <div className="section-title subs"><RiUserAddLine/> Suplentes</div>
                        {rosterVisit.map((slot, idx) => !slot.isStarter && (
                            <PlayerRow key={slot.idTemp} slot={slot} idx={idx} team="visit" players={visitPlayers} globalRoster={rosterVisit} isWalkover={isWalkover} onUpdate={handleUpdateRoster} />
                        ))}
                    </RosterGrid>
                    </TabContent>
                )}

                {activeTab === 'penalties' && (
                    <TabContent>
                    <PenaltiesContainer>
                        <h3>Definición por Penales / Shootouts</h3>
                        <div className="pen-inputs">
                        <div className="team"><span>{match.local?.name}</span><InputNumber value={penalties.local} onChange={(e) => setPenalties({...penalties, local: e.target.value})} /></div>
                        <div className="team"><span>{match.visitante?.name}</span><InputNumber value={penalties.visit} onChange={(e) => setPenalties({...penalties, visit: e.target.value})} /></div>
                        </div>
                    </PenaltiesContainer>
                    </TabContent>
                )}
                </ContentBody>
            </>
        )}

        <Footer>
          <BtnNormal titulo="Cancelar" funcion={onClose} />
          <Btnsave titulo="Guardar Marcador" bgcolor={v.colorPrincipal} icono={<RiCheckDoubleLine/>} funcion={handleSaveAttempt} loading={loading} />
        </Footer>
      </Container>

      {showConfirm && (
        <ConfirmOverlay>
          <div className="confirm-card">
            <RiCheckDoubleLine size={50} color={v.colorPrincipal} />
            <h2>¿Confirmar Marcador?</h2>
            <div className="final-score"><span>{totalGoalsLocal}</span> - <span>{totalGoalsVisit}</span></div>
            {totalGoalsLocal === totalGoalsVisit && isExtraPointEnabled && !isWalkover && (
                <div className="pen-score">Penales: {penalties.local} - {penalties.visit}</div>
            )}
            <div className="confirm-btns">
              <BtnNormal titulo="Revisar" funcion={() => setShowConfirm(false)} />
              <Btnsave titulo="Si, Guardar" funcion={handleFinalSave} loading={loading} />
            </div>
          </div>
        </ConfirmOverlay>
      )}

      <ToastContainerFix>
        <Toast show={toastConfig.show} message={toastConfig.message} type={toastConfig.type} onClose={() => setToastConfig({...toastConfig, show: false})} />
      </ToastContainerFix>
    </Modal>
  );
}

// --- ESTILOS ---
const Container = styled.div` display: flex; flex-direction: column; gap: 15px; `;
const TabsWrapper = styled.div` width: 100%; `;
const InputGroup = styled.div` display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; label { font-weight: 700; display: flex; align-items: center; gap: 8px; color: ${({theme})=>theme.text}; } select { padding: 12px; border-radius: 10px; background: ${({theme})=>theme.bg3}; border: 2px solid ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; outline: none; transition: 0.3s; &:focus { border-color: ${v.colorPrincipal}; } } `;
const ScoreHeader = styled.div` display: flex; justify-content: space-between; align-items: center; padding: 20px; background: ${({theme})=>theme.bg3}; border-radius: 15px; border: 1px solid ${({theme})=>theme.bg4}; .center-info { text-align: center; .vs { font-weight: 900; opacity: 0.3; font-size: 1.5rem; } .match-data { display: flex; flex-direction: column; font-size: 0.8rem; opacity: 0.6; } } `;
const TeamInfo = styled.div` display: flex; align-items: center; gap: 15px; width: 35%; img { width: 45px; height: 45px; object-fit: contain; } h3 { font-size: 0.9rem; flex: 1; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .score { font-size: 2.2rem; font-weight: 800; color: ${v.colorPrincipal}; } `;
const ContentBody = styled.div` min-height: 350px; `;
const RosterGrid = styled.div` display: flex; flex-direction: column; gap: 8px; .section-title { font-size: 0.85rem; font-weight: 700; color: ${v.colorPrincipal}; display: flex; align-items: center; gap: 8px; margin-top: 10px; &.subs { color: ${({theme})=>theme.text}; opacity: 0.7; } } .header-row { display: grid; grid-template-columns: 1fr 80px 50px 50px; padding: 0 10px; font-size: 0.7rem; opacity: 0.5; text-transform: uppercase; } .player-row { display: grid; grid-template-columns: 1fr 80px 50px 50px; gap: 10px; align-items: center; padding: 8px; background: ${({theme})=>theme.bgtotal}; border-radius: 8px; border: 1px solid ${({theme})=>theme.bg4}; select, input { background: ${({theme})=>theme.bg3}; border: 1px solid ${({theme})=>theme.bg4}; color: ${({theme})=>theme.text}; padding: 5px; border-radius: 5px; width: 100%; outline: none; } } `;
const Footer = styled.div` display: flex; justify-content: flex-end; gap: 15px; margin-top: 10px; padding-top: 15px; border-top: 1px solid ${({theme})=>theme.bg4}; `;
const CardCheck = styled.div` width: 20px; height: 28px; border-radius: 3px; cursor: pointer; border: 2px solid ${({$active, $color}) => $active ? $color : 'transparent'}; background: ${({$color, $active}) => $active ? $color : $color + '33'}; transition: 0.2s; `;
const WalkoverBox = styled.div` border: 1px solid ${({$active}) => $active ? '#e74c3c' : 'transparent'}; background: ${({theme, $active}) => $active ? '#e74c3c15' : theme.bg3}; border-radius: 12px; .wo-header { padding: 15px; display: flex; align-items: center; gap: 10px; cursor: pointer; span { font-weight: 700; flex: 1; } } .wo-content { padding: 0 15px 15px 15px; .wo-btns { display: flex; gap: 10px; } } `;
const PenaltiesContainer = styled.div` text-align: center; padding: 20px; h3 { margin-bottom: 20px; font-size: 1rem; opacity: 0.8; } .pen-inputs { display: flex; justify-content: center; gap: 40px; .team { display: flex; flex-direction: column; gap: 10px; span { font-weight: 600; } } } `;
const ConfirmOverlay = styled.div` position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; .confirm-card { background: ${({theme})=>theme.bgtotal}; padding: 40px; border-radius: 20px; text-align: center; max-width: 450px; .final-score { font-size: 1.5rem; font-weight: 800; margin: 20px 0; span { color: ${v.colorPrincipal}; font-size: 2.2rem; } } .pen-score { font-weight: 700; margin-bottom: 20px; color: ${({theme})=>theme.text}; opacity: 0.8; } .confirm-btns { display: flex; gap: 15px; justify-content: center; } } `;
const ToastContainerFix = styled.div` position: absolute; top: 0; left: 0; width: 100%; z-index: 100001; pointer-events: none; `;
const LoadingState = styled.div` display: flex; justify-content: center; align-items: center; height: 300px; color: ${({theme})=>theme.text}; opacity: 0.7; `;