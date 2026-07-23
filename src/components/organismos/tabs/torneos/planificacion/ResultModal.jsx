// src/components/organismos/tabs/torneos/planificacion/ResultModal.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import styled from "styled-components";
import { v } from "../../../../../styles/variables";
import { Modal } from "../../../Modal";
import { BtnNormal } from "../../../../moleculas/BtnNormal";
import { Btnsave } from "../../../../moleculas/Btnsave";
import { Toast } from "../../../../atomos/Toast";
import { TabsNavigation } from "../../../../moleculas/TabsNavigation";
import { TabContent } from "../../../../moleculas/TabsNavigation";
import { supabase } from "../../../../../supabase/supabase.config";
import { RiFileList3Line, RiNumbersLine, RiCheckDoubleLine, RiScan2Line } from "react-icons/ri";
import { IoMdFootball } from "react-icons/io";
import { isPlayoffJornadaName } from "../../../../../utils/playoffUtils";
import { reconcileRostersToScores } from "../../../../../utils/cedulaScoreResolution";

// Componentes Modularizados
import { ScoreHeader } from "./result_modal_components/ScoreHeader";
import { GeneralTab } from "./result_modal_components/GeneralTab";
import { RosterTab } from "./result_modal_components/RosterTab";
import { PenaltiesTab } from "./result_modal_components/PenaltiesTab";
import { ConfirmResultOverlay } from "./result_modal_components/ConfirmResultOverlay";
import { CedulaScanFlow } from "./result_modal_components/CedulaScanFlow";

const DOUBLE_WALKOVER_ID = "__double_walkover__";
const DOUBLE_WALKOVER_OBSERVATION = "Doble W.O. - ambos pierden por default";

const isDoubleWalkoverObservation = (observations = "") => (
  /doble\s*w\.?o\.?/i.test(observations) ||
  /ambos\s+pierden\s+por\s+default/i.test(observations)
);

const toStatNumber = (value) => parseInt(value, 10) || 0;

const hasUnassignedGoals = (roster = []) =>
  roster.some(slot => !slot.playerId && toStatNumber(slot.goals) > 0);

const addUnassignedGoalsToRoster = (roster = [], goals = 0, prefix = "team") => {
  const safeGoals = Math.max(0, toStatNumber(goals));
  if (safeGoals <= 0) return roster;

  const nextRoster = [...roster];
  const emptySlotIndex = nextRoster.findIndex(slot => !slot.playerId);
  const targetIndex = emptySlotIndex >= 0 ? emptySlotIndex : nextRoster.length;
  const fallbackSlot = {
    idTemp: `${prefix}-unassigned-goals`,
    playerId: "",
    goals: 0,
    ownGoals: 0,
    yellow: false,
    red: false,
    isStarter: false
  };

  nextRoster[targetIndex] = {
    ...(nextRoster[targetIndex] || fallbackSlot),
    playerId: "",
    goals: safeGoals
  };

  return nextRoster;
};

export function ResultModal({ isOpen, onClose, match, onSave, activeTournament }) {
  
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCedulaScanner, setShowCedulaScanner] = useState(false);
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  const isSavingRef = useRef(false);
  const latestLoadRequestRef = useRef(0);

  const [referees, setReferees] = useState([]);
  const [localPlayers, setLocalPlayers] = useState([]);
  const [visitPlayers, setVisitPlayers] = useState([]);
  
  const [selectedReferee, setSelectedReferee] = useState("");
  const [isWalkover, setIsWalkover] = useState(false);
  const [woWinnerId, setWoWinnerId] = useState(null);
  const [penalties, setPenalties] = useState({ local: 0, visit: 0 });
  
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [manualObservations, setManualObservations] = useState("");

  const [rosterLocal, setRosterLocal] = useState([]);
  const [rosterVisit, setRosterVisit] = useState([]);
  const [participationStats, setParticipationStats] = useState({ local: {}, visit: {} });

  // Configuración de Torneo
  const tournamentConfig = useMemo(() => {
      let config = {};
      try {
          if (activeTournament?.config) {
              config = typeof activeTournament.config === 'string' ? JSON.parse(activeTournament.config) : activeTournament.config;
          }
      } catch (e) { console.error("Error parsing config", e); }
      return config;
  }, [activeTournament]);

  const winPoints = parseInt(tournamentConfig.winPoints ?? 3);
  const drawPoints = parseInt(tournamentConfig.drawPoints ?? 1);
  const lossPoints = parseInt(tournamentConfig.lossPoints ?? 0);
  const minPlayers = parseInt(tournamentConfig.minPlayers || activeTournament?.min_players || activeTournament?.minPlayers || 7);
  const halfMinPlayers = Math.ceil(minPlayers / 2);
  const maxSubs = 15; 
  
  const isExtraPointEnabled = useMemo(() => {
    const type = (tournamentConfig.tieBreakType || "").toLowerCase();
    const isLeaguePenalty = ['penalties', 'shoutouts', 'shouts', 'penales'].includes(type);
    const playoffTieBreaker = String(tournamentConfig.playoffTieBreaker || "").toLowerCase();
    const isPlayoffMatch = isPlayoffJornadaName(match?.jornadas?.name || match?.jornada?.name || "");
    return isLeaguePenalty || (isPlayoffMatch && playoffTieBreaker === "penalties");
  }, [tournamentConfig, match]);

  // Cálculos de goles
  const totalGoalsLocal = useMemo(() => {
    if (isWalkover && woWinnerId === DOUBLE_WALKOVER_ID) return 0;
    if (isWalkover) return woWinnerId === match?.local?.id ? 3 : 0;
    const localGoals = rosterLocal.reduce((acc, p) => acc + toStatNumber(p.goals), 0);
    const visitOwnGoals = rosterVisit.reduce((acc, p) => acc + toStatNumber(p.ownGoals), 0);
    return localGoals + visitOwnGoals;
  }, [rosterLocal, rosterVisit, isWalkover, woWinnerId, match]);

  const totalGoalsVisit = useMemo(() => {
    if (isWalkover && woWinnerId === DOUBLE_WALKOVER_ID) return 0;
    if (isWalkover) return woWinnerId === match?.visitante?.id ? 3 : 0;
    const visitGoals = rosterVisit.reduce((acc, p) => acc + toStatNumber(p.goals), 0);
    const localOwnGoals = rosterLocal.reduce((acc, p) => acc + toStatNumber(p.ownGoals), 0);
    return visitGoals + localOwnGoals;
  }, [rosterVisit, rosterLocal, isWalkover, woWinnerId, match]);

  // Tabs Dinámicas
  const modalTabs = useMemo(() => {
    const tabs = [{ id: "general", label: "General", icon: <RiFileList3Line/> }];
    if (!isWalkover || (isWalkover && woWinnerId === match?.local?.id)) {
      tabs.push({ id: "local", label: match?.local?.name || "Local", icon: <IoMdFootball/> });
    }
    if (!isWalkover || (isWalkover && woWinnerId === match?.visitante?.id)) {
      tabs.push({ id: "visit", label: match?.visitante?.name || "Visitante", icon: <IoMdFootball/> });
    }
    if (totalGoalsLocal === totalGoalsVisit && isExtraPointEnabled && !isWalkover) {
      tabs.push({ id: "penalties", label: "Penales", icon: <RiNumbersLine/> });
    }
    return tabs;
  }, [match, isWalkover, woWinnerId, totalGoalsLocal, totalGoalsVisit, isExtraPointEnabled]);

  const parseDateTime = (dateStr) => {
      if (!dateStr) return { d: "", t: "" };
      let d = "", t = "";
      const raw = String(dateStr).trim();
      if (raw.includes('T')) {
          const parts = raw.split('T');
          d = parts[0];
          t = parts[1].substring(0, 5);
      } else if (raw.includes(' ')) {
          const parts = raw.split(' ');
          d = parts[0];
          t = parts[1].substring(0, 5);
      } else {
          d = raw;
      }
      if (d.length > 10) d = d.substring(0, 10);
      return { d, t };
  };

  const buildEmptyRoster = useCallback((prefix) => {
    const roster = [];
    for (let i = 0; i < minPlayers; i++) {
      roster.push({ idTemp: `${prefix}-${i}`, isStarter: true, playerId: "", goals: 0, ownGoals: 0, yellow: false, red: false });
    }
    roster.push({ idTemp: `${prefix}-new-sub`, playerId: "", goals: 0, ownGoals: 0, yellow: false, red: false, isStarter: false });
    return roster;
  }, [minPlayers]);

  const resetModalState = useCallback(() => {
    setActiveTab('general');
    setShowConfirm(false);
    setShowCedulaScanner(false);
    setToastConfig({ show: false, message: '', type: 'error' });
    setReferees([]);
    setLocalPlayers([]);
    setVisitPlayers([]);
    setSelectedReferee("");
    setIsWalkover(false);
    setWoWinnerId(null);
    setPenalties({ local: 0, visit: 0 });
    setMatchDate("");
    setMatchTime("");
    setManualObservations("");
    setRosterLocal(buildEmptyRoster('l'));
    setRosterVisit(buildEmptyRoster('v'));
    setParticipationStats({ local: {}, visit: {} });
  }, [buildEmptyRoster]);

  useEffect(() => {
    latestLoadRequestRef.current += 1;
    const requestId = latestLoadRequestRef.current;

    if (isOpen && match?.id) {
      resetModalState();
      setLoading(true);
      setIsSaving(false);
      isSavingRef.current = false;
      fetchAllData(requestId);
      return;
    }

    isSavingRef.current = false;
    setIsSaving(false);
    setLoading(false);
    resetModalState();
  }, [isOpen, match?.id, resetModalState]);

  const fetchParticipationCounts = async (players = [], excludedMatchId = match?.id) => {
    const playerIds = players.map(player => player?.id).filter(Boolean);
    const tournamentId = activeTournament?.id;

    if (!tournamentId || playerIds.length === 0) {
      return {};
    }

    try {
      const { data, error } = await supabase
        .from('match_events')
        .select(`
          match_id,
          player_id,
          matches!inner (
            jornadas!inner ( tournament_id )
          )
        `)
        .eq('event_type', 'participation')
        .eq('matches.jornadas.tournament_id', tournamentId)
        .in('player_id', playerIds);

      if (error) throw error;

      const uniqueMatchesByPlayer = {};
      (data || []).forEach(event => {
        if (String(event.match_id) === String(excludedMatchId)) return;

        const playerId = String(event.player_id);
        if (!uniqueMatchesByPlayer[playerId]) uniqueMatchesByPlayer[playerId] = new Set();
        uniqueMatchesByPlayer[playerId].add(String(event.match_id));
      });

      return Object.fromEntries(
        Object.entries(uniqueMatchesByPlayer).map(([playerId, matchIds]) => [playerId, matchIds.size])
      );
    } catch (error) {
      console.error("Error getting participation counts:", error);
      return {};
    }
  };

  const fetchAllData = async (requestId) => {
    try {
      const matchId = Number(match.id);
      if(isNaN(matchId)) throw new Error("ID de partido inválido");

      // `match` ya proviene de la consulta de la jornada y contiene los campos
      // necesarios para inicializar el modal. Evitamos una segunda lectura del
      // mismo partido, que agregaba un punto de fallo antes de cargar la cedula.
      const freshMatch = match;

      let nextMatchDate = "";
      let nextMatchTime = "";
      if (freshMatch.date) {
        const { d, t } = parseDateTime(freshMatch.date);
        nextMatchDate = d;
        nextMatchTime = t || freshMatch.time || match.time || "10:00";
      } else if (match.date) {
        const { d, t } = parseDateTime(match.date);
        nextMatchDate = d;
        nextMatchTime = match.time || t || "10:00";
      }

      let leagueId = activeTournament?.division?.league_id || activeTournament?.league_id;
      if (!leagueId && activeTournament?.division_id) {
        const { data: divData } = await supabase.from('divisions').select('league_id').eq('id', activeTournament.division_id).single();
        if (divData) leagueId = divData.league_id;
      }
      
      const [refsRes, localRes, visitRes, eventsRes] = await Promise.all([
        leagueId ? supabase.from('referees').select('*').eq('league_id', leagueId).order('full_name') : Promise.resolve({ data: [] }),
        supabase.from('players').select('*').eq('team_id', match.local.id).eq('is_active', true).order('first_name'),
        supabase.from('players').select('*').eq('team_id', match.visitante.id).eq('is_active', true).order('first_name'),
        supabase.from('match_events').select('*').eq('match_id', matchId)
      ]);
      if (requestId !== latestLoadRequestRef.current) return;
      const [localParticipation, visitParticipation] = await Promise.all([
        fetchParticipationCounts(localRes.data || [], matchId),
        fetchParticipationCounts(visitRes.data || [], matchId)
      ]);
      if (requestId !== latestLoadRequestRef.current) return;
      
      const obs = freshMatch.observations || "";
      const nextIsDoubleWalkover = isDoubleWalkoverObservation(obs);
      const nextIsWalkover = nextIsDoubleWalkover || obs.includes('W.O.') || obs.includes('Victoria por default');
      let nextWoWinnerId = null;
      let nextPenalties = { local: 0, visit: 0 };
      
      let cleanObs = obs;
      if (nextIsWalkover) {
        nextWoWinnerId = nextIsDoubleWalkover
          ? DOUBLE_WALKOVER_ID
          : freshMatch.goals1 > freshMatch.goals2 ? match.local.id : match.visitante.id;
        cleanObs = cleanObs
          .replace(/Doble\s*W\.?O\.?\s*-\s*ambos pierden por default/gi, '')
          .replace(/ambos\s+pierden\s+por\s+default/gi, '')
          .replace(/W\.O\./gi, '')
          .replace(/Victoria por default/gi, '');
      }

      if (/Pen/i.test(obs)) {
        const matchPen = obs.match(/Pen.*:\s*(\d+)\s*-\s*(\d+)/i);
        if (matchPen) {
          nextPenalties = { local: parseInt(matchPen[1]), visit: parseInt(matchPen[2]) };
          cleanObs = cleanObs.replace(matchPen[0], '');
        }
      }

      const isEditMode = freshMatch.status === 'Finalizado';
      let nextRosterLocal = reconstructRoster(localRes.data || [], eventsRes.data || [], 'l', isEditMode);
      let nextRosterVisit = reconstructRoster(visitRes.data || [], eventsRes.data || [], 'v', isEditMode);

      if (isEditMode && !nextIsWalkover) {
        const assignedLocalGoals =
          nextRosterLocal.reduce((acc, p) => acc + toStatNumber(p.goals), 0) +
          nextRosterVisit.reduce((acc, p) => acc + toStatNumber(p.ownGoals), 0);
        const assignedVisitGoals =
          nextRosterVisit.reduce((acc, p) => acc + toStatNumber(p.goals), 0) +
          nextRosterLocal.reduce((acc, p) => acc + toStatNumber(p.ownGoals), 0);

        nextRosterLocal = addUnassignedGoalsToRoster(
          nextRosterLocal,
          toStatNumber(freshMatch.goals1) - assignedLocalGoals,
          'l'
        );
        nextRosterVisit = addUnassignedGoalsToRoster(
          nextRosterVisit,
          toStatNumber(freshMatch.goals2) - assignedVisitGoals,
          'v'
        );
      }
      if (requestId !== latestLoadRequestRef.current) return;

      setMatchDate(nextMatchDate);
      setMatchTime(nextMatchTime);
      setReferees(refsRes.data || []);
      setLocalPlayers(localRes.data || []);
      setVisitPlayers(visitRes.data || []);
      setSelectedReferee(freshMatch.referee_id || "");
      setParticipationStats({ local: localParticipation, visit: visitParticipation });
      setIsWalkover(nextIsWalkover);
      setWoWinnerId(nextWoWinnerId);
      setPenalties(nextPenalties);
      setManualObservations(cleanObs.trim());
      setRosterLocal(nextRosterLocal);
      setRosterVisit(nextRosterVisit);

    } catch (error) {
      if (requestId !== latestLoadRequestRef.current) return;
      setToastConfig({ show: true, message: "Error cargando datos: " + (error?.message || error), type: "error" });
    } finally {
      if (requestId === latestLoadRequestRef.current) setLoading(false);
    }
  };

  const reconstructRoster = (players, events, prefix, isEditMode) => {
      const statsMap = {};
      events.forEach(ev => {
          const sId = String(ev.player_id);
          if (!statsMap[sId]) statsMap[sId] = { goals: 0, ownGoals: 0, yellow: false, red: false, played: true };
          if (ev.event_type === 'goal') statsMap[sId].goals++;
          if (ev.event_type === 'own_goal') statsMap[sId].ownGoals++;
          if (ev.event_type === 'yellow_card') statsMap[sId].yellow = true;
          if (ev.event_type === 'red_card') statsMap[sId].red = true;
      });

      const activePlayers = players.filter(p => statsMap[String(p.id)]).map(p => ({ playerId: p.id, ...statsMap[String(p.id)] }));
      const roster = [];
      if (isEditMode && activePlayers.length > 0) {
          activePlayers.forEach((pData, index) => roster.push({ idTemp: `${prefix}-loaded-${index}`, isStarter: index < minPlayers, playerId: pData.playerId, goals: pData.goals, ownGoals: pData.ownGoals || 0, yellow: pData.yellow, red: pData.red }));
          while (roster.length < minPlayers) roster.push({ idTemp: `${prefix}-fill-${roster.length}`, isStarter: true, playerId: "", goals: 0, ownGoals: 0, yellow: false, red: false });
          if (roster.length < (minPlayers + maxSubs)) roster.push({ idTemp: `${prefix}-extra-${Date.now()}`, isStarter: false, playerId: "", goals: 0, ownGoals: 0, yellow: false, red: false });
      } else {
          for (let i = 0; i < minPlayers; i++) roster.push({ idTemp: `${prefix}-${i}`, isStarter: true, playerId: "", goals: 0, ownGoals: 0, yellow: false, red: false });
          roster.push({ idTemp: `${prefix}-new-sub`, playerId: "", goals: 0, ownGoals: 0, yellow: false, red: false, isStarter: false });
      }
      return roster;
  };

  const handleUpdateRoster = useCallback((team, index, field, value) => {
    const isLocal = team === 'local';
    const setter = isLocal ? setRosterLocal : setRosterVisit;
    setter(prevRoster => {
        const newRoster = [...prevRoster];
        const previousSlot = newRoster[index] || {};
        const nextSlot = { ...previousSlot, [field]: value };

        if (field === 'playerId' && String(previousSlot?.playerId || '') !== String(value || '')) {
            nextSlot.goals = 0;
            nextSlot.ownGoals = 0;
            nextSlot.yellow = false;
            nextSlot.red = false;
        }

        newRoster[index] = nextSlot;
        if (field === 'playerId' && value !== "" && index === newRoster.length - 1 && newRoster.length < (minPlayers + maxSubs)) {
            newRoster.push({ idTemp: `${isLocal ? 'l' : 'v'}-${Date.now()}`, playerId: "", goals: 0, ownGoals: 0, yellow: false, red: false, isStarter: false });
        }
        return newRoster;
    });
  }, [minPlayers, maxSubs]);

  const handleAutoFillStarters = useCallback((team) => {
    const isLocal = team === 'local';
    const roster = isLocal ? rosterLocal : rosterVisit;
    const players = isLocal ? localPlayers : visitPlayers;
    const teamParticipationStats = isLocal ? participationStats.local : participationStats.visit;
    const setter = isLocal ? setRosterLocal : setRosterVisit;

    if (players.length === 0) {
      setToastConfig({ show: true, message: "No hay jugadores disponibles para autocompletar.", type: "warning" });
      return;
    }

    const emptyStarterIndexes = roster
      .map((slot, index) => (slot.isStarter && !slot.playerId ? index : -1))
      .filter(index => index >= 0);

    if (emptyStarterIndexes.length === 0) {
      setToastConfig({ show: true, message: "Los titulares ya estan completos.", type: "warning" });
      return;
    }

    const selectedPlayerIds = new Set(
      roster
        .filter(slot => slot.playerId)
        .map(slot => String(slot.playerId))
    );

    const sortedPlayers = [...players].sort((a, b) => {
      const appearancesDiff =
        (teamParticipationStats[String(b.id)] || 0) - (teamParticipationStats[String(a.id)] || 0);

      if (appearancesDiff !== 0) return appearancesDiff;

      const fullNameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
      const fullNameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      return fullNameA.localeCompare(fullNameB, 'es', { sensitivity: 'base' });
    });

    let playersAdded = 0;
    const updatedRoster = [...roster];

    emptyStarterIndexes.forEach(index => {
      const nextPlayer = sortedPlayers.find(player => !selectedPlayerIds.has(String(player.id)));
      if (!nextPlayer) return;

      updatedRoster[index] = { ...updatedRoster[index], playerId: nextPlayer.id };
      selectedPlayerIds.add(String(nextPlayer.id));
      playersAdded++;
    });

    setter(updatedRoster);

    if (playersAdded === 0) {
      setToastConfig({ show: true, message: "No hay mas jugadores disponibles para completar titulares.", type: "warning" });
      return;
    }

    setToastConfig({
      show: true,
      message:
        playersAdded === 1
          ? "Se agrego 1 titular segun asistencias."
          : `Se agregaron ${playersAdded} titulares segun asistencias.`,
      type: "success"
    });
  }, [localPlayers, participationStats.local, participationStats.visit, rosterLocal, rosterVisit, visitPlayers]);

  const handleClearRoster = useCallback((team) => {
    const isLocal = team === 'local';
    const setter = isLocal ? setRosterLocal : setRosterVisit;

    setter(prevRoster => prevRoster.map(slot => ({
      ...slot,
      playerId: "",
      goals: 0,
      ownGoals: 0,
      yellow: false,
      red: false
    })));

    setToastConfig({
      show: true,
      message: "Se limpio la alineacion y sus estadisticas.",
      type: "success"
    });
  }, []);

  const handleToggleWalkover = (newValue) => {
    setIsWalkover(newValue);
    if (!newValue) setWoWinnerId(null);
    setActiveTab('general');
    setRosterLocal(reconstructRoster(localPlayers, [], 'l', false));
    setRosterVisit(reconstructRoster(visitPlayers, [], 'v', false));
  };

  const handleWalkoverSelect = (teamId) => {
    setActiveTab('general');
    if (woWinnerId === teamId) { 
        setWoWinnerId(null); 
        setIsWalkover(false); 
    } else { 
        setWoWinnerId(teamId); 
        setIsWalkover(true); 
    }
    setRosterLocal(reconstructRoster(localPlayers, [], 'l', false));
    setRosterVisit(reconstructRoster(visitPlayers, [], 'v', false));
  };

  const handleSaveAttempt = () => {
    const countLocal = rosterLocal.filter(p => p.playerId).length;
    const countVisit = rosterVisit.filter(p => p.playerId).length;
    const hasGoalsWithoutPlayer = hasUnassignedGoals(rosterLocal) || hasUnassignedGoals(rosterVisit);
    const hasScoreData = totalGoalsLocal > 0 || totalGoalsVisit > 0;
    const isOnlyDateUpdate = !selectedReferee && countLocal === 0 && countVisit === 0 && !isWalkover && !hasScoreData;

    // Validación estricta del árbitro independientemente de si es o no W.O. 
    // (A menos que sea únicamente una edición de fecha sin W.O. y sin rosters)
    if (!isOnlyDateUpdate && !selectedReferee) {
        return setToastConfig({ show: true, message: "Debe asignar un árbitro.", type: "error" });
    }

    if (isWalkover) {
        if (!woWinnerId) return setToastConfig({ show: true, message: "Seleccione la resolucion por default.", type: "error" });
    } else if (!isOnlyDateUpdate) {
        if (countLocal < halfMinPlayers && countVisit < halfMinPlayers && !hasGoalsWithoutPlayer) return setToastConfig({ show: true, message: `Advertencia: Pocos jugadores registrados.`, type: "warning" });
        if (totalGoalsLocal === totalGoalsVisit && isExtraPointEnabled) {
          if (parseInt(penalties.local) === parseInt(penalties.visit)) return setToastConfig({ show: true, message: "Los penales no pueden terminar en empate.", type: "error" });
        }
    }
    if (!isWalkover && (!matchDate || !matchTime)) return setToastConfig({ show: true, message: "La fecha y hora son obligatorias.", type: "error" });

    setShowConfirm(true);
  };

  const handleApplyCedulaScan = useCallback((scan) => {
    const makeScannedRoster = (side, prefix) => {
      const matchedPlayers = (scan.players || [])
        .filter(player => player.side === side && player.matched)
        .map((player, index) => ({
          idTemp: `${prefix}-scan-${player.matched.id}-${index}`,
          playerId: player.matched.id,
          goals: Math.max(0, toStatNumber(player.goals)),
          ownGoals: Math.max(0, toStatNumber(player.ownGoals)),
          yellow: toStatNumber(player.yellowCards) > 0,
          red: toStatNumber(player.redCards) > 0,
          isStarter: index < minPlayers,
        }));

      const nextRoster = [...matchedPlayers];
      while (nextRoster.length < minPlayers) {
        nextRoster.push({
          idTemp: `${prefix}-scan-empty-${nextRoster.length}`,
          playerId: "",
          goals: 0,
          ownGoals: 0,
          yellow: false,
          red: false,
          isStarter: true,
        });
      }
      if (nextRoster.length < minPlayers + maxSubs) {
        nextRoster.push({
          idTemp: `${prefix}-scan-sub`,
          playerId: "",
          goals: 0,
          ownGoals: 0,
          yellow: false,
          red: false,
          isStarter: false,
        });
      }
      return nextRoster;
    };

    let nextLocal = makeScannedRoster("local", "l");
    let nextVisit = makeScannedRoster("visit", "v");
    const scoreReconciliation = reconcileRostersToScores(nextLocal, nextVisit, scan.scores);
    nextLocal = scoreReconciliation.localRoster;
    nextVisit = scoreReconciliation.visitRoster;

    nextLocal = addUnassignedGoalsToRoster(
      nextLocal,
      scoreReconciliation.unassignedGoals.local,
      "l-scan"
    );
    nextVisit = addUnassignedGoalsToRoster(
      nextVisit,
      scoreReconciliation.unassignedGoals.visit,
      "v-scan"
    );

    setRosterLocal(nextLocal);
    setRosterVisit(nextVisit);
    if (scan.referee?.id) setSelectedReferee(scan.referee.id);
    if (scan.applyDate === true && /^\d{4}-\d{2}-\d{2}$/.test(scan.date || "")) setMatchDate(scan.date);
    if (scan.applyTime === true && /^\d{2}:\d{2}$/.test(scan.time || "")) setMatchTime(scan.time);
    if (scan.observations) {
      setManualObservations(current => [current.trim(), scan.observations.trim()].filter(Boolean).join(" | "));
    }
    if (toStatNumber(scan.penalties?.local) || toStatNumber(scan.penalties?.visit)) {
      setPenalties({
        local: toStatNumber(scan.penalties.local),
        visit: toStatNumber(scan.penalties.visit),
      });
    }
    const scannedWalkover = scan.walkover?.detected;
    let scannedWinnerId = null;
    if (scan.walkover?.winnerSide === "local") scannedWinnerId = match?.local?.id || null;
    if (scan.walkover?.winnerSide === "visit") scannedWinnerId = match?.visitante?.id || null;
    if (scan.walkover?.winnerSide === "both") scannedWinnerId = DOUBLE_WALKOVER_ID;
    setIsWalkover(Boolean(scannedWalkover));
    setWoWinnerId(scannedWalkover ? scannedWinnerId : null);
    setActiveTab("general");
    setShowCedulaScanner(false);
    const detectedScheduleCount = [
      /^\d{4}-\d{2}-\d{2}$/.test(scan.date || "") && scan.date !== matchDate,
      /^\d{2}:\d{2}$/.test(scan.time || "") && scan.time !== matchTime,
    ].filter(Boolean).length;
    const appliedScheduleCount = [scan.applyDate === true, scan.applyTime === true].filter(Boolean).length;
    const scheduleMessage = detectedScheduleCount === 0
      ? ""
      : appliedScheduleCount === 0
        ? " La programación detectada no se aplicó."
        : appliedScheduleCount < detectedScheduleCount
          ? " Solo se aplicaron los campos de programación seleccionados."
          : " La programación seleccionada fue aplicada.";
    setToastConfig({
      show: true,
      message: (scannedWalkover
        ? scannedWinnerId
          ? "W.O. detectado y aplicado. Revisa la victoria por default antes de guardar."
          : "Se detecto un W.O., pero debes elegir al ganador en General."
        : "Datos de la cedula aplicados. Revisa el resultado antes de guardarlo.")
        + (Object.keys(scan.scoreResolutions || {}).length
          ? " Las diferencias de goles se resolvieron según tu selección."
          : "")
        + scheduleMessage,
      type: scannedWalkover && !scannedWinnerId ? "warning" : "success"
    });
  }, [match, matchDate, matchTime, minPlayers]);

  const handleFinalSave = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setLoading(true);

    try {
      const matchId = Number(match.id);
      const { error: delError } = await supabase.from('match_events').delete().eq('match_id', matchId);
      if(delError) throw delError;

      const events = [];
      const processRoster = (r) => {
        r.forEach(p => {
          if (!p.playerId) return;
          const pid = p.playerId;
          
          events.push({ match_id: matchId, player_id: pid, event_type: 'participation' });
          
          if (!isWalkover) {
              const goals = toStatNumber(p.goals);
              const ownGoals = toStatNumber(p.ownGoals);
              if (goals > 0) for(let i=0; i < goals; i++) events.push({ match_id: matchId, player_id: pid, event_type: 'goal' });
              if (ownGoals > 0) for(let i=0; i < ownGoals; i++) events.push({ match_id: matchId, player_id: pid, event_type: 'own_goal' });
              if (p.yellow) events.push({ match_id: matchId, player_id: pid, event_type: 'yellow_card' });
              if (p.red) events.push({ match_id: matchId, player_id: pid, event_type: 'red_card' });
          }
        });
      };

      if (isWalkover) {
        if (woWinnerId === match?.local?.id) processRoster(rosterLocal);
        else if (woWinnerId === match?.visitante?.id) processRoster(rosterVisit);
      } else { processRoster(rosterLocal); processRoster(rosterVisit); }

      if (events.length > 0) {
        const { error: eventError } = await supabase.from('match_events').insert(events);
        if (eventError) throw eventError;
      }

      let p1 = 0, p2 = 0; const finalObsParts = [];
      if (isWalkover) {
        if (woWinnerId === DOUBLE_WALKOVER_ID) {
          p1 = 0;
          p2 = 0;
          finalObsParts.push(DOUBLE_WALKOVER_OBSERVATION);
        } else {
          if (woWinnerId === match?.local?.id) { p1 = winPoints; p2 = lossPoints; } else { p1 = lossPoints; p2 = winPoints; }
          finalObsParts.push("Victoria por default"); 
        }
      } else if (totalGoalsLocal > totalGoalsVisit) { p1 = winPoints; p2 = lossPoints;
      } else if (totalGoalsVisit > totalGoalsLocal) { p1 = lossPoints; p2 = winPoints;
      } else {
        p1 = drawPoints; p2 = drawPoints;
        if (isExtraPointEnabled) {
          if (parseInt(penalties.local) > parseInt(penalties.visit)) p1 += 1; else p2 += 1;
          finalObsParts.push(`Pen: ${penalties.local}-${penalties.visit}`);
        }
      }

      if (manualObservations && manualObservations.trim() !== "") finalObsParts.push(manualObservations.trim());
      
      const fullDate = (matchDate && matchTime) ? `${matchDate} ${matchTime}:00` : null;

      const countLocal = rosterLocal.filter(p => p.playerId).length;
      const countVisit = rosterVisit.filter(p => p.playerId).length;
      const hasScoreData = totalGoalsLocal > 0 || totalGoalsVisit > 0;
      const isOnlyDateUpdate = !selectedReferee && countLocal === 0 && countVisit === 0 && !isWalkover && !hasScoreData;

      await onSave(matchId, {
        goals1: totalGoalsLocal, goals2: totalGoalsVisit, puntos1: p1, puntos2: p2,
        // Al enviar el ref, ya no validamos si es Walkover o no, siempre lo manda
        referee_id: selectedReferee || null, 
        status: (isOnlyDateUpdate && !isWalkover) ? (match.status || 'Pendiente') : 'Finalizado',
        observations: finalObsParts.join(" | "), 
        date: fullDate
      });
      
      latestLoadRequestRef.current += 1;
      resetModalState();
      onClose();
    } catch (e) {
      setToastConfig({ show: true, message: "Error al guardar: " + (e?.message || e), type: "error" });
    } finally { setLoading(false); setIsSaving(false); isSavingRef.current = false; }
  };

  if (!isOpen || !match) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? undefined : onClose}
      width="950px"
      title="Definir Resultado"
      closeOnOverlayClick={false}
      headerActions={!showCedulaScanner ? (
        <ScanHeaderButton type="button" onClick={() => setShowCedulaScanner(true)} disabled={loading || isSaving}>
          <RiScan2Line /> Escanear cedula
        </ScanHeaderButton>
      ) : null}
    >
      <Container>
        {showCedulaScanner ? (
          <CedulaScanFlow
            match={match}
            referees={referees}
            localPlayers={localPlayers}
            visitPlayers={visitPlayers}
            currentDate={matchDate}
            currentTime={matchTime}
            onBack={() => setShowCedulaScanner(false)}
            onApply={handleApplyCedulaScan}
            showToast={(message, type = "error") => setToastConfig({ show: true, message, type })}
          />
        ) : (
          <>
            <ScoreHeader match={match} goalsLocal={totalGoalsLocal} goalsVisit={totalGoalsVisit} divisionName={activeTournament?.division?.name} displayDate={matchDate} displayTime={matchTime} isWalkover={isWalkover} isDoubleWalkover={woWinnerId === DOUBLE_WALKOVER_ID} />

            {loading ? (
            <LoadingState>{isSaving ? "Guardando resultado..." : "Procesando datos..."}</LoadingState>
            ) : (
            <>
                <TabsNavigation tabs={modalTabs} activeTab={activeTab} setActiveTab={setActiveTab} />
                <ContentBody>
                    {activeTab === 'general' && (
                        <TabContent>
                            <GeneralTab 
                                isWalkover={isWalkover} 
                                setIsWalkover={handleToggleWalkover} 
                                woWinnerId={woWinnerId} 
                                doubleWalkoverId={DOUBLE_WALKOVER_ID}
                                match={match} 
                                handleWalkoverSelect={handleWalkoverSelect} 
                                selectedReferee={selectedReferee} setSelectedReferee={setSelectedReferee} referees={referees} matchDate={matchDate} setMatchDate={setMatchDate} matchTime={matchTime} setMatchTime={setMatchTime} manualObservations={manualObservations} setManualObservations={setManualObservations} 
                            />
                        </TabContent>
                    )}
                    {activeTab === 'local' && (
                        <TabContent>
                            <RosterTab
                              roster={rosterLocal}
                              teamKey="local"
                              teamName={match?.local?.name || "Local"}
                              players={localPlayers}
                              isWalkover={isWalkover}
                              minPlayers={minPlayers}
                              onUpdate={handleUpdateRoster}
                              onAutoFillStarters={handleAutoFillStarters}
                              onClearRoster={handleClearRoster}
                            />
                        </TabContent>
                    )}
                    {activeTab === 'visit' && (
                        <TabContent>
                             <RosterTab
                               roster={rosterVisit}
                               teamKey="visit"
                               teamName={match?.visitante?.name || "Visitante"}
                               players={visitPlayers}
                               isWalkover={isWalkover}
                               minPlayers={minPlayers}
                                onUpdate={handleUpdateRoster}
                                onAutoFillStarters={handleAutoFillStarters}
                                onClearRoster={handleClearRoster}
                               />
                        </TabContent>
                    )}
                    {activeTab === 'penalties' && (
                        <TabContent>
                            <PenaltiesTab penalties={penalties} match={match} setPenalties={setPenalties} />
                        </TabContent>
                    )}
                </ContentBody>
            </>
            )}

            <Footer>
              <BtnNormal titulo="Cancelar" funcion={onClose} disabled={isSaving} />
              <Btnsave titulo="Guardar Marcador" bgcolor={v.colorPrincipal} icono={<RiCheckDoubleLine/>} funcion={handleSaveAttempt} loading={loading} />
            </Footer>
          </>
        )}
      </Container>

      {showConfirm && (
         <ConfirmResultOverlay match={match} isWalkover={isWalkover} isDoubleWalkover={woWinnerId === DOUBLE_WALKOVER_ID} matchDate={matchDate} matchTime={matchTime} totalGoalsLocal={totalGoalsLocal} totalGoalsVisit={totalGoalsVisit} penalties={penalties} isExtraPointEnabled={isExtraPointEnabled} setShowConfirm={setShowConfirm} handleFinalSave={handleFinalSave} loading={loading || isSaving} isOnlyDateUpdate={!selectedReferee && rosterLocal.filter(p => p.playerId).length === 0 && rosterVisit.filter(p => p.playerId).length === 0 && !isWalkover} />
      )}

      <ToastContainerFix>
        <Toast show={toastConfig.show} message={toastConfig.message} type={toastConfig.type} onClose={() => setToastConfig({...toastConfig, show: false})} />
      </ToastContainerFix>
    </Modal>
  );
}

const Container = styled.div` display: flex; flex-direction: column; gap: 15px; width: 100%; `;
const ContentBody = styled.div` min-height: 350px; width: 100%; box-sizing: border-box; overflow: hidden; position: relative; `;
const Footer = styled.div` display: flex; justify-content: flex-end; gap: 15px; margin-top: 10px; padding-top: 15px; border-top: 1px solid ${({theme})=>theme.bg4}; flex-wrap: wrap; `;
const ToastContainerFix = styled.div` position: absolute; top: 0; left: 0; width: 100%; z-index: 100001; pointer-events: none; `;
const LoadingState = styled.div` display: flex; justify-content: center; align-items: center; height: 300px; color: ${({theme})=>theme.text}; opacity: 0.7; `;
const ScanHeaderButton = styled.button`
  min-height: 34px;
  padding: 7px 12px;
  border: 1px solid ${({theme})=>theme.bg4};
  border-radius: 9px;
  background: transparent;
  color: ${({theme})=>theme.text};
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;

  &:hover:not(:disabled) { background: ${({theme})=>theme.bg3}; }
  &:focus-visible { outline: 3px solid ${v.colorPrincipal}44; outline-offset: 2px; }
  &:disabled { cursor: not-allowed; opacity: 0.55; }

  @media (max-width: 560px) {
    padding: 7px 9px;
    font-size: 0.76rem;
  }
`;
