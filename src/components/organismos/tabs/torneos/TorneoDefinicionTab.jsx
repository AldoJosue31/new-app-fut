import React, { useState, useMemo, useEffect, useRef } from "react";
import styled from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { v } from "../../../../styles/variables";
import { 
    RiFileList3Line, RiCoinLine, RiGitMergeLine, RiInformationLine, RiDeleteBinLine, RiArrowRightLine,
    RiFileWarningLine, RiBarChartGroupedLine, RiFlagLine, RiSettings3Line,
    RiCalendarEventLine, RiFootballLine, RiTimeLine, RiUserStarFill, RiTeamLine
} from "react-icons/ri";
import { IoMdStopwatch } from "react-icons/io";

import { Btnsave, Modal, TabsNavigation, Toast } from "../../../../index";
import { ConfirmModal } from "../../ConfirmModal";
import { Tooltip } from "../../../atomos/Tooltip";
import { DynamicTeamLogo } from "../../equipos/DynamicTeamLogo";
import { TorneoDefinitionMode } from "../../../TorneoDefinitionMode";
import { TorneoDashboard } from "./subcomponents/TorneoDashboard";
import { TabGeneral, TabScoring, TabFormat, TabGameRules } from "./subcomponents/TorneoFormTabs";
import { FixturePreviewModal } from "./subcomponents/FixturePreviewModal";
import { PlayoffAdvanceModal } from "./subcomponents/PlayoffAdvanceModal";
import { TournamentConfigModal } from "./subcomponents/TournamentConfigModal";
import { TournamentSummaryModal } from "./exports/summary/TournamentSummaryModal";
import {
  actualizarConfigTorneoService,
  bulkInsertMatchesService,
  createJornadasService,
  eliminarTorneoService,
  getAllMatchesByTournament,
  getJornadas,
  getTournamentConfigService,
  updateTournamentFieldsService,
} from "../../../../services/torneos";
import { addDaysToDate } from "../../../../utils/dateUtils";
import {
  PLAYOFF_PHASES,
  buildNextPlayoffPreview,
  buildPhaseJornadaNames,
  getPhaseByParticipants,
  getPendingPhaseCounts,
  getPhaseLabelByKey,
  getPlayoffSettings,
  getStageMatches,
} from "../../../../utils/playoffUtils";
import {
  isOfficialJornadaName,
  parseJornadaNumber,
} from "../../../../utils/jornadaUtils";
import { buildTorneoStandingsSnapshot } from "../../../../hooks/useTorneoStandingsLogic";
import { supabase } from "../../../../supabase/supabase.config";
import { useDivisionStore } from "../../../../store/DivisionStore";

const normalizeMatchStatus = (status) => String(status || "").trim().toLowerCase();
const hasRegisteredScoreValue = (value) =>
    value !== null &&
    value !== undefined &&
    String(value).trim() !== "" &&
    Number.isFinite(Number(value));
const hasRegisteredMatchResult = (match) =>
    hasRegisteredScoreValue(match?.goals1) && hasRegisteredScoreValue(match?.goals2);
const isTrackableMatch = (match) =>
    match?.team1_id != null &&
    match?.team2_id != null &&
    !match?.isByeMatch;
const getPhaseAbbreviation = (phaseKey) => ({
    repechaje: "Rep",
    round32: "16F",
    round16: "OF",
    quarterfinals: "CF",
    semifinals: "SF",
    final: "F",
})[phaseKey] || "FF";
const MAIN_PLAYOFF_PHASE_KEYS = PLAYOFF_PHASES.map((phase) => phase.key);
const getMainPhaseIndex = (phaseKey) => MAIN_PLAYOFF_PHASE_KEYS.indexOf(phaseKey);
const isConfirmedJornadaStatus = (status) => {
    const normalized = normalizeMatchStatus(status);
    return normalized.includes("confirmad") || normalized.includes("finaliz") || normalized.includes("complet");
};
const formatSetupDate = (dateString, includeYear = false) => {
    if (!dateString) return "Pendiente";
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Pendiente";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return includeYear ? `${month}-${day}-${year}` : `${month}-${day}`;
};
const getTeamDisplayName = (team) =>
    team?.name || team?.nombre || team?.team_name || team?.equipo?.name || team?.team?.name || "Equipo";
const getTeamLogoValue = (team) =>
    team?.logo_url || team?.logo || team?.img || team?.equipo?.logo_url || team?.team?.logo_url || null;
const getDivisionMoveKey = (movement, teamId) => `${movement}:${teamId}`;

export function TorneoDefinicionTab({ 
    form, onChange, onSubmit, loading, divisionName, activeTournament, 
    allTeams, participatingIds, onInclude, onExclude,
    isLoading, reglas, setReglas, onTournamentReset, leagueData,
    partidos = [], goleadores = [], standings = []
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { divisiones, fetchDivisiones } = useDivisionStore();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false); 
  const [showEndTournamentModal, setShowEndTournamentModal] = useState(false);
  const [showAdvanceWarningModal, setShowAdvanceWarningModal] = useState(false);
  const [showPlayoffPreviewModal, setShowPlayoffPreviewModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [applyDivisionMoves, setApplyDivisionMoves] = useState(true);
  const [selectedDivisionMoveIds, setSelectedDivisionMoveIds] = useState([]);
  const [playoffPreview, setPlayoffPreview] = useState(null);
  const [advanceWarning, setAdvanceWarning] = useState({ pendingMatches: 0, pendingJornadas: 0 });
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isSetupExiting, setIsSetupExiting] = useState(false);
  const [isSetupEntering, setIsSetupEntering] = useState(false);
  const [isStartingTournament, setIsStartingTournament] = useState(false);
  const [isEndingTournament, setIsEndingTournament] = useState(false);
  const [isActiveEntering, setIsActiveEntering] = useState(false);
  const [transitionOverlay, setTransitionOverlay] = useState({
      visible: false,
      variant: "default",
      title: "",
      subtitle: "",
  });
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false);

  const [configTab, setConfigTab] = useState("general"); 
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  // ESTADO DEL SWITCH
  const [useLeagueRules, setUseLeagueRules] = useState(true);
  const [configDraftForm, setConfigDraftForm] = useState(null);
  const [configDraftReglas, setConfigDraftReglas] = useState(null);
  const [configDraftUseLeagueRules, setConfigDraftUseLeagueRules] = useState(true);
  const [tournamentEvents, setTournamentEvents] = useState([]);
  const [dashboardJornadas, setDashboardJornadas] = useState([]);
  const [selectedStatusJornada, setSelectedStatusJornada] = useState(null);
  const [animatedJornadaPercent, setAnimatedJornadaPercent] = useState(0);
  const jornadaBarsRef = useRef(null);
  const jornadaBarsDragRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });
  const jornadaBarsWasDraggingRef = useRef(false);
  const hasRequestedDivisionsRef = useRef(false);
  const activationTransitionTimerRef = useRef(null);
  const activeEnterTimerRef = useRef(null);
  const endTransitionTimerRef = useRef(null);
  const setupEnterTimerRef = useRef(null);
  const overlayHideTimerRef = useRef(null);

  const configTabList = [
      { id: "general", label: "General", icon: <RiFileList3Line/> },
      { id: "scoring", label: "Puntuación", icon: <RiCoinLine/> },
      { id: "format", label: "Formato", icon: <RiGitMergeLine/> },
      { id: "gameRules", label: "Reglas Juego", icon: <IoMdStopwatch/> }
  ];

  const participatingTeams = useMemo(
      () => allTeams?.filter(t => participatingIds.includes(t.id)) || [],
      [allTeams, participatingIds]
  );
  const excludedTeams = useMemo(
      () => allTeams?.filter(t => !participatingIds.includes(t.id)) || [],
      [allTeams, participatingIds]
  );

  useEffect(() => {
      if (!showEndTournamentModal) {
          hasRequestedDivisionsRef.current = false;
          return;
      }

      if (!hasRequestedDivisionsRef.current && (!divisiones || divisiones.length === 0)) {
          hasRequestedDivisionsRef.current = true;
          fetchDivisiones();
      }
  }, [showEndTournamentModal, divisiones, fetchDivisiones]);

  const showToast = (message, type = 'error') => setToastConfig({ show: true, message, type });

  const showTransitionOverlay = ({ variant = "default", title, subtitle }) => {
      if (overlayHideTimerRef.current) {
          clearTimeout(overlayHideTimerRef.current);
          overlayHideTimerRef.current = null;
      }
      setTransitionOverlay({ visible: true, variant, title, subtitle });
  };

  const hideTransitionOverlayAfter = (delay = 650) => {
      if (overlayHideTimerRef.current) clearTimeout(overlayHideTimerRef.current);
      overlayHideTimerRef.current = setTimeout(() => {
          setTransitionOverlay((current) => ({ ...current, visible: false }));
          overlayHideTimerRef.current = null;
      }, delay);
  };

  // 1. Extraemos la config de la liga
  const defaultLeagueConfig = useMemo(() => {
    const parsed = leagueData?.default_config ? (typeof leagueData.default_config === 'string' ? JSON.parse(leagueData.default_config) : leagueData.default_config) : {};
    return {
        minPlayers: parsed.minPlayers ?? 7,
        minPlayersToRegister: parsed.minPlayersToRegister ?? parsed.minPlayers ?? 7,
        maxPlayers: parsed.maxPlayers ?? 25,
        maxTeams: parsed.maxTeams ?? 20,
        winPoints: parsed.winPoints ?? 3,
        drawPoints: parsed.drawPoints ?? 1,
        lossPoints: parsed.lossPoints ?? 0,
        tieBreakType: parsed.tieBreakType ?? "normal", // <-- CORREGIDO A NORMAL
        minutosPorTiempo: parsed.minutosPorTiempo ?? 45,
        minutosDescanso: parsed.minutosDescanso ?? 15,
        cambios: parsed.cambios ?? "Ilimitados"
    };
  }, [leagueData]);

  // 2. AUTO-SINCRONIZACIÓN AL CARGAR LA PÁGINA
  useEffect(() => {
    if (!activeTournament && useLeagueRules) {
        onChange({ target: { name: 'minPlayers', value: defaultLeagueConfig.minPlayers }});
        onChange({ target: { name: 'minPlayersToRegister', value: defaultLeagueConfig.minPlayersToRegister }});
        onChange({ target: { name: 'maxPlayers', value: defaultLeagueConfig.maxPlayers }});
        onChange({ target: { name: 'maxTeams', value: defaultLeagueConfig.maxTeams }});
        onChange({ target: { name: 'winPoints', value: defaultLeagueConfig.winPoints }});
        onChange({ target: { name: 'drawPoints', value: defaultLeagueConfig.drawPoints }});
        onChange({ target: { name: 'lossPoints', value: defaultLeagueConfig.lossPoints }});
        onChange({ target: { name: 'tieBreakType', value: defaultLeagueConfig.tieBreakType }});

        setReglas(prev => ({
            ...prev,
            minutosPorTiempo: defaultLeagueConfig.minutosPorTiempo,
            minutosDescanso: defaultLeagueConfig.minutosDescanso,
            cambios: defaultLeagueConfig.cambios
        }));
    }
  }, [defaultLeagueConfig, activeTournament]); 

  useEffect(() => {
    if (!showConfigModal || activeTournament) return;

    setConfigDraftForm({ ...form });
    setConfigDraftReglas({ ...reglas });
    setConfigDraftUseLeagueRules(useLeagueRules);
  }, [showConfigModal, activeTournament]);

  useEffect(() => {
    if (!activeTournament || !isStartingTournament) return;

    if (activationTransitionTimerRef.current) {
        clearTimeout(activationTransitionTimerRef.current);
        activationTransitionTimerRef.current = null;
    }

    setIsSetupExiting(false);
    setIsStartingTournament(false);
    setIsActiveEntering(true);
    hideTransitionOverlayAfter(960);

    if (activeEnterTimerRef.current) clearTimeout(activeEnterTimerRef.current);
    activeEnterTimerRef.current = setTimeout(() => {
        setIsActiveEntering(false);
        activeEnterTimerRef.current = null;
    }, 900);
  }, [activeTournament, isStartingTournament]);

  useEffect(() => {
    if (activeTournament || !isEndingTournament) return;

    if (endTransitionTimerRef.current) {
        clearTimeout(endTransitionTimerRef.current);
        endTransitionTimerRef.current = null;
    }

    setIsExiting(false);
    setIsEndingTournament(false);
    setIsDeleting(false);
    setIsSetupEntering(true);
    hideTransitionOverlayAfter(960);

    if (setupEnterTimerRef.current) clearTimeout(setupEnterTimerRef.current);
    setupEnterTimerRef.current = setTimeout(() => {
        setIsSetupEntering(false);
        setupEnterTimerRef.current = null;
    }, 900);
  }, [activeTournament, isEndingTournament]);

  useEffect(() => {
    return () => {
        if (activationTransitionTimerRef.current) clearTimeout(activationTransitionTimerRef.current);
        if (activeEnterTimerRef.current) clearTimeout(activeEnterTimerRef.current);
        if (endTransitionTimerRef.current) clearTimeout(endTransitionTimerRef.current);
        if (setupEnterTimerRef.current) clearTimeout(setupEnterTimerRef.current);
        if (overlayHideTimerRef.current) clearTimeout(overlayHideTimerRef.current);
    };
  }, []);

  const handleToggleRules = (isLeague) => {
    setConfigDraftUseLeagueRules(isLeague);
    if (isLeague) {
        setConfigDraftForm((prev) => ({
            ...(prev || form),
            minPlayers: defaultLeagueConfig.minPlayers,
            minPlayersToRegister: defaultLeagueConfig.minPlayersToRegister,
            maxPlayers: defaultLeagueConfig.maxPlayers,
            maxTeams: defaultLeagueConfig.maxTeams,
            winPoints: defaultLeagueConfig.winPoints,
            drawPoints: defaultLeagueConfig.drawPoints,
            lossPoints: defaultLeagueConfig.lossPoints,
            tieBreakType: defaultLeagueConfig.tieBreakType,
        }));
        setConfigDraftReglas((prev) => ({
            ...(prev || reglas),
            minutosPorTiempo: defaultLeagueConfig.minutosPorTiempo,
            minutosDescanso: defaultLeagueConfig.minutosDescanso,
            cambios: defaultLeagueConfig.cambios
        }));
    }
  };

  const templateFields = [
      'minPlayers', 'minPlayersToRegister', 'maxPlayers', 'maxTeams', 
      'winPoints', 'drawPoints', 'lossPoints', 'tieBreakType'
  ];

  const handleFormChange = (e) => {
      const target = e?.target || e;
      if (!target?.name) return;

      const nextValue = target.type === "checkbox" ? target.checked : target.value;
      if (templateFields.includes(target.name)) {
          setConfigDraftUseLeagueRules(false);
      }
      setConfigDraftForm((prev) => ({
          ...(prev || form),
          [target.name]: nextValue,
      }));
  };

  const handleReglasChange = (newReglas) => {
      setConfigDraftUseLeagueRules(false);
      setConfigDraftReglas((prev) => {
          const current = prev || reglas;
          return typeof newReglas === "function" ? newReglas(current) : newReglas;
      });
  };

  const handlePreStartTournament = () => {
      if (!form.startDate) {
          showToast("Debes definir una 'Fecha de Inicio' para generar el calendario.", "error");
          return;
      }
      if (participatingTeams.length < 2) {
          showToast(`Se requieren al menos 2 equipos para iniciar el torneo.`, "error");
          return;
      }
      if (form.zonaLiguilla) {
          const directos = parseInt(form.clasificados || 0);
          const repechajeTeams = parseInt(form.repechajeTeams || 0);
          const repechaje = (form.hasRepechaje || repechajeTeams > 0) ? repechajeTeams : 0;
          const totalRequeridos = directos + repechaje;

          if (totalRequeridos < 2) {
             showToast("Configuración inválida: Debes clasificar al menos 2 equipos.", "error");
             return;
          }
      }
      setShowPreviewModal(true);
  };

  const handleConfirmFixture = async (fixtureData) => {
      setShowPreviewModal(false);
      setIsSetupExiting(true);
      setIsStartingTournament(true);
      showTransitionOverlay({
          title: "Creando torneo",
          subtitle: "Preparando jornadas, partidos y reglas...",
      });

      if (activationTransitionTimerRef.current) {
          clearTimeout(activationTransitionTimerRef.current);
          activationTransitionTimerRef.current = null;
      }

      activationTransitionTimerRef.current = setTimeout(() => {
          setIsStartingTournament(false);
          setIsSetupExiting(false);
          hideTransitionOverlayAfter(0);
          activationTransitionTimerRef.current = null;
      }, 5000);

      try {
          await Promise.resolve(onSubmit(fixtureData));
      } catch (error) {
          console.error(error);
          if (activationTransitionTimerRef.current) {
              clearTimeout(activationTransitionTimerRef.current);
              activationTransitionTimerRef.current = null;
          }
          setIsStartingTournament(false);
          setIsSetupExiting(false);
          hideTransitionOverlayAfter(0);
      }
  };

  const handleSaveConfig = () => {
    const nextForm = configDraftForm || form;
    const nextReglas = configDraftReglas || reglas;
    const maxTeamsNum = parseInt(nextForm.maxTeams || 0);
    const minPlayersToRegisterNum = parseInt(nextForm.minPlayersToRegister || 0);
    const maxPlayersNum = parseInt(nextForm.maxPlayers || 0);
    if (maxTeamsNum < 2) {
        showToast("El número máximo de equipos debe ser al menos 2.", "error");
        return;
    }
    if (minPlayersToRegisterNum > maxPlayersNum) {
        showToast("El mÃ­nimo para inscribir no puede superar el mÃ¡ximo de jugadores.", "error");
        return;
    }
    Object.entries(nextForm).forEach(([name, value]) => {
        onChange({
            target: {
                name,
                value,
                checked: Boolean(value),
                type: typeof value === "boolean" ? "checkbox" : undefined,
            },
        });
    });

    setReglas(nextReglas);
    setUseLeagueRules(configDraftUseLeagueRules);

    const draftData = { ...nextForm, reglasDraft: nextReglas };
    localStorage.setItem("torneo_reglas_draft", JSON.stringify(draftData));
    setShowConfigModal(false);
    showToast("Configuración guardada (Borrador local).", "success");
  };

  const handleSaveActiveConfig = async (newConfig) => {
      if (!activeTournament?.id) return;

      try {
          const baseJornadas = participatingTeams.length % 2 === 0
              ? participatingTeams.length - 1
              : participatingTeams.length;

          await actualizarConfigTorneoService(activeTournament.id, newConfig, baseJornadas);
          setReglas({
              minutosPorTiempo: newConfig.minutosPorTiempo || "45",
              minutosDescanso: newConfig.minutosDescanso || "15",
              cambios: newConfig.cambios || "Ilimitados",
              observaciones: newConfig.observaciones || "",
          });
          showToast("Ajustes del torneo guardados.", "success");
          if (onTournamentReset) onTournamentReset();
      } catch (error) {
          console.error(error);
          showToast("No se pudieron guardar los ajustes: " + error.message, "error");
      }
  };

  const handleEndTournament = async () => {
      if(!activeTournament?.id) return;
      setIsDeleting(true);
      setIsEndingTournament(true);
      setIsExiting(true);
      setShowEndTournamentModal(false);
      showTransitionOverlay({
          variant: "danger",
          title: "Finalizando torneo",
          subtitle: "Limpiando jornadas, partidos y panel de gestion...",
      });

      if (endTransitionTimerRef.current) {
          clearTimeout(endTransitionTimerRef.current);
          endTransitionTimerRef.current = null;
      }

      endTransitionTimerRef.current = setTimeout(() => {
          setIsEndingTournament(false);
          setIsExiting(false);
          setIsDeleting(false);
          hideTransitionOverlayAfter(0);
          endTransitionTimerRef.current = null;
      }, 5000);

      try {
          await new Promise((resolve) => setTimeout(resolve, 420));
          if (applyDivisionMoves && divisionMovePlan.hasApplicableMovements) {
              await applyDivisionMovePlan();
          }
          await eliminarTorneoService(activeTournament.id);
          showToast(
              applyDivisionMoves && divisionMovePlan.hasApplicableMovements
                  ? "Torneo finalizado y divisiones actualizadas. Reiniciando vista..."
                  : "Torneo eliminado. Reiniciando vista...",
              "success"
          );

          if(onTournamentReset) await Promise.resolve(onTournamentReset()); 
      } catch (error) {
          console.error(error);
          if (endTransitionTimerRef.current) {
              clearTimeout(endTransitionTimerRef.current);
              endTransitionTimerRef.current = null;
          }
          showToast("Error al finalizar el torneo. Revisa la consola.", "error");
          setIsDeleting(false);
          setIsEndingTournament(false);
          setIsExiting(false);
          hideTransitionOverlayAfter(0);
      }
  };

  const getActiveTournamentConfig = async () => {
      const currentConfig = await getTournamentConfigService(activeTournament.id);
      let baseConfig = {};
      try {
          baseConfig = typeof activeTournament?.config === "string"
              ? JSON.parse(activeTournament.config)
              : activeTournament?.config || {};
      } catch {
          baseConfig = {};
      }
      return {
          ...baseConfig,
          ...currentConfig,
      };
  };

  const preparePlayoffPreview = async ({ ignorePending = false } = {}) => {
      if (!activeTournament?.id) return;

      setIsAdvancingPhase(true);
      try {
          const [freshConfig, jornadas, matches] = await Promise.all([
              getActiveTournamentConfig(),
              getJornadas(activeTournament.id),
              getAllMatchesByTournament(activeTournament.id),
          ]);

          if (!freshConfig.zonaLiguilla) {
              showToast("La fase final no esta habilitada en Formato.", "warning");
              return;
          }

          const currentPhaseKey = freshConfig.playoffState?.currentPhaseKey || null;
          const pending = getPendingPhaseCounts({
              phaseKey: currentPhaseKey,
              matches,
              jornadas,
          });

          if (!ignorePending && (pending.pendingMatches > 0 || pending.pendingJornadas > 0)) {
              setAdvanceWarning(pending);
              setShowAdvanceWarningModal(true);
              return;
          }

          const preview = buildNextPlayoffPreview({
              torneo: activeTournament,
              teams: participatingTeams,
              matches,
              jornadas,
              config: freshConfig,
              selectedJornadaView: "recent",
          });

          if (preview.error) {
              showToast(preview.error, "error");
              return;
          }

          if (preview.complete) {
              showToast(`Torneo completado. Campeon: ${preview.champion?.name || "por definir"}.`, "success");
              return;
          }

          if (!preview.pairs?.length) {
              showToast("No hay suficientes equipos para crear la siguiente fase.", "warning");
              return;
          }

          setPlayoffPreview(preview);
          setShowPlayoffPreviewModal(true);
      } catch (error) {
          console.error(error);
          showToast("No se pudo preparar la fase final: " + error.message, "error");
      } finally {
          setIsAdvancingPhase(false);
      }
  };

  const handleConfirmAdvanceWarning = async () => {
      setShowAdvanceWarningModal(false);
      await preparePlayoffPreview({ ignorePending: true });
  };

  const handleConfirmPlayoffAdvance = async (confirmedPreview) => {
      if (!activeTournament?.id || !confirmedPreview) return;

      setIsAdvancingPhase(true);
      try {
          const currentConfig = await getActiveTournamentConfig();
          const jornadas = await getJornadas(activeTournament.id);
          const lastJornada = jornadas[jornadas.length - 1] || null;
          const nextStartDate = lastJornada?.end_date
              ? addDaysToDate(lastJornada.end_date, 1)
              : lastJornada?.start_date
                ? addDaysToDate(lastJornada.start_date, 7)
                : activeTournament?.start_date || null;

          const phaseNames = buildPhaseJornadaNames(
              confirmedPreview.phaseKey,
              confirmedPreview.settings || getPlayoffSettings(currentConfig)
          );

          const jornadasToCreate = phaseNames.map((name, index) => {
              const startDate = nextStartDate ? addDaysToDate(nextStartDate, index * 7) : null;
              return {
                  tournament_id: activeTournament.id,
                  name,
                  status: "Pendiente",
                  start_date: startDate,
                  end_date: startDate ? addDaysToDate(startDate, 6) : null,
              };
          });

          const createdJornadas = await createJornadasService(jornadasToCreate);
          const jornadaByName = new Map(createdJornadas.map((jornada) => [jornada.name, jornada]));
          const matchesToInsert = [];

          confirmedPreview.pairs.forEach((pair, pairIndex) => {
              if (!pair.home || !pair.away) return;

              phaseNames.forEach((name, legIndex) => {
                  const jornadaId = jornadaByName.get(name)?.id;
                  if (!jornadaId) return;

                  const isSecondLeg = legIndex === 1;
                  matchesToInsert.push({
                      jornada_id: jornadaId,
                      team1_id: Number(isSecondLeg ? pair.away.teamId || pair.away.id : pair.home.teamId || pair.home.id),
                      team2_id: Number(isSecondLeg ? pair.home.teamId || pair.home.id : pair.away.teamId || pair.away.id),
                      date: null,
                      status: "Pendiente",
                      observations: `Fase:${confirmedPreview.phaseKey};Serie:${pairIndex + 1}`,
                  });
              });
          });

          if (matchesToInsert.length > 0) {
              await bulkInsertMatchesService(matchesToInsert);
          }

          const previousStages = Array.isArray(currentConfig.playoffState?.stages)
              ? currentConfig.playoffState.stages
              : [];
          const nextSettings = {
              ...getPlayoffSettings(currentConfig),
              ...(confirmedPreview.settings || {}),
          };
          const nextConfig = {
              ...currentConfig,
              ...nextSettings,
              playoffState: {
                  ...(currentConfig.playoffState || {}),
                  currentPhaseKey: confirmedPreview.phaseKey,
                  stages: [
                      ...previousStages,
                      {
                          phaseKey: confirmedPreview.phaseKey,
                          phaseLabel: confirmedPreview.phaseLabel,
                          source: confirmedPreview.source,
                          createdAt: new Date().toISOString(),
                          jornadaNames: phaseNames,
                          pairs: confirmedPreview.pairs,
                      },
                  ],
              },
          };

          await updateTournamentFieldsService(activeTournament.id, { config: nextConfig });
          setShowPlayoffPreviewModal(false);
          setPlayoffPreview(null);
          showToast(`${confirmedPreview.phaseLabel} creada en Jornadas.`, "success");
          if (onTournamentReset) onTournamentReset();
      } catch (error) {
          console.error(error);
          showToast("Error creando la fase: " + error.message, "error");
      } finally {
          setIsAdvancingPhase(false);
      }
  };

  const tournamentConfigForUi = useMemo(() => {
      try {
          return typeof activeTournament?.config === "string"
              ? JSON.parse(activeTournament.config)
              : activeTournament?.config || {};
      } catch {
          return {};
      }
  }, [activeTournament?.config]);

  const playoffEnabled = !!(tournamentConfigForUi.zonaLiguilla ?? form.zonaLiguilla);
  const playoffStateForUi = tournamentConfigForUi.playoffState || {};
  const currentPlayoffPhaseKey = playoffEnabled ? playoffStateForUi.currentPhaseKey || null : null;
  const currentPlayoffPhaseLabel = currentPlayoffPhaseKey
      ? getPhaseLabelByKey(currentPlayoffPhaseKey)
      : "";
  const isInPlayoffPhase = Boolean(currentPlayoffPhaseKey);

  useEffect(() => {
      let ignore = false;

      const fetchDashboardJornadas = async () => {
          if (!activeTournament?.id) {
              setDashboardJornadas([]);
              return;
          }

          try {
              const jornadas = await getJornadas(activeTournament.id);
              if (!ignore) setDashboardJornadas(jornadas || []);
          } catch (error) {
              console.warn("No se pudieron cargar jornadas para el dashboard:", error);
              if (!ignore) setDashboardJornadas([]);
          }
      };

      fetchDashboardJornadas();

      return () => {
          ignore = true;
      };
  }, [activeTournament?.id]);

  const allTournamentJornadas = useMemo(() => {
      const jornadas = dashboardJornadas.length > 0
          ? dashboardJornadas
          : Array.isArray(activeTournament?.jornadas) ? activeTournament.jornadas : [];
      return [...jornadas].sort((a, b) => {
          const aNumber = parseJornadaNumber(a?.name, Number.MAX_SAFE_INTEGER);
          const bNumber = parseJornadaNumber(b?.name, Number.MAX_SAFE_INTEGER);
          if (aNumber !== bNumber) return aNumber - bNumber;
          return String(a?.name || "").localeCompare(String(b?.name || ""), "es", { sensitivity: "base" });
      });
  }, [activeTournament?.jornadas, dashboardJornadas]);

  const activeJornadas = useMemo(() => {
      return allTournamentJornadas
          .filter((jornada) => isOfficialJornadaName(jornada?.name))
          .map((jornada) => ({
              ...jornada,
              number: parseJornadaNumber(jornada.name, 0),
          }))
          .filter((jornada) => jornada.number > 0)
          .sort((a, b) => a.number - b.number);
  }, [allTournamentJornadas]);

  const tournamentProgress = useMemo(() => {
      const total = activeJornadas.length;
      const completed = activeJornadas.filter((jornada) => {
          return isConfirmedJornadaStatus(jornada.status);
      }).length;
      const current = total > 0 ? Math.max(1, Math.min(completed + 1, total)) : 1;
      const next = total > 0 ? Math.min(current + 1, total) : 1;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, current, next, percent };
  }, [activeJornadas]);

  const currentPhaseMatches = useMemo(() => {
      if (!currentPlayoffPhaseKey) return [];
      return getStageMatches({
          phaseKey: currentPlayoffPhaseKey,
          matches: partidos,
          jornadas: allTournamentJornadas,
      });
  }, [allTournamentJornadas, currentPlayoffPhaseKey, partidos]);

  const currentPhaseResultProgress = useMemo(() => {
      const confirmableMatches = currentPhaseMatches.filter(isTrackableMatch);
      const confirmedMatches = confirmableMatches.filter(hasRegisteredMatchResult);
      const total = confirmableMatches.length;
      const confirmed = confirmedMatches.length;

      return {
          confirmed,
          total,
          pending: Math.max(total - confirmed, 0),
          percent: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      };
  }, [currentPhaseMatches]);

  const playoffPhaseProgress = useMemo(() => {
      if (!isInPlayoffPhase) return null;

      const stages = Array.isArray(playoffStateForUi.stages) ? playoffStateForUi.stages : [];
      const createdMainStage = stages.find((stage) => stage?.phaseKey && stage.phaseKey !== "repechaje");
      const currentMainStage = currentPlayoffPhaseKey !== "repechaje"
          ? stages.find((stage) => stage?.phaseKey === currentPlayoffPhaseKey)
          : null;
      const mainParticipantsFromStage =
          Number(createdMainStage?.pairs?.length || currentMainStage?.pairs?.length || 0) * 2;
      const directCount = Number.parseInt(tournamentConfigForUi.clasificados, 10) || 0;
      const repechajeCount = Number.parseInt(tournamentConfigForUi.repechajeTeams, 10) || 0;
      const estimatedMainParticipants = mainParticipantsFromStage ||
          directCount + (repechajeCount > 0 ? Math.floor(repechajeCount / 2) : 0) ||
          directCount ||
          2;
      const estimatedPhaseKey = getPhaseByParticipants(estimatedMainParticipants).key;
      const mainPhaseCandidates = [
          createdMainStage?.phaseKey,
          currentPlayoffPhaseKey !== "repechaje" ? currentPlayoffPhaseKey : null,
          estimatedPhaseKey,
          ...stages.map((stage) => stage?.phaseKey),
      ]
          .map(getMainPhaseIndex)
          .filter((index) => index >= 0);
      const firstMainIndex = mainPhaseCandidates.length > 0
          ? Math.min(...mainPhaseCandidates)
          : 0;
      const hasRepechaje = stages.some((stage) => stage?.phaseKey === "repechaje") ||
          currentPlayoffPhaseKey === "repechaje" ||
          repechajeCount > 0;
      const phaseKeys = [
          ...(hasRepechaje ? ["repechaje"] : []),
          ...MAIN_PLAYOFF_PHASE_KEYS.slice(firstMainIndex),
      ];
      const currentIndex = Math.max(0, phaseKeys.indexOf(currentPlayoffPhaseKey));
      const total = phaseKeys.length || 1;
      const currentPhaseWeight = currentPhaseResultProgress.percent / 100;
      const percent = Math.min(
          100,
          Math.round(((currentIndex + currentPhaseWeight) / total) * 100)
      );

      return {
          total,
          currentIndex,
          percent,
          label: currentPlayoffPhaseLabel,
          subtitle: `Fase ${currentIndex + 1} de ${total}`,
          markers: phaseKeys.map((phaseKey, index) => ({
              key: phaseKey,
              label: getPhaseLabelByKey(phaseKey),
              shortLabel: getPhaseAbbreviation(phaseKey),
              position: total <= 1 ? 100 : Math.round((index / (total - 1)) * 100),
              isCurrent: phaseKey === currentPlayoffPhaseKey,
              isComplete: index < currentIndex ||
                  (phaseKey === currentPlayoffPhaseKey && currentPhaseResultProgress.percent === 100),
          })),
      };
  }, [
      currentPhaseResultProgress.percent,
      currentPlayoffPhaseKey,
      currentPlayoffPhaseLabel,
      isInPlayoffPhase,
      playoffStateForUi.stages,
      tournamentConfigForUi.clasificados,
      tournamentConfigForUi.repechajeTeams,
  ]);

  const tournamentFinalResults = useMemo(() => {
      if (!playoffEnabled || !isInPlayoffPhase || currentPlayoffPhaseKey !== "final") return null;
      if (currentPhaseResultProgress.percent < 100) return null;
      
      const preview = buildNextPlayoffPreview({
          torneo: activeTournament,
          teams: participatingTeams,
          matches: partidos,
          jornadas: allTournamentJornadas,
          config: tournamentConfigForUi,
          selectedJornadaView: "recent",
      });

      if (preview.complete) {
          return {
              champion: preview.champion,
              runnerUp: preview.runnerUp,
          };
      }
      return null;
  }, [activeTournament, participatingTeams, partidos, allTournamentJornadas, tournamentConfigForUi, playoffEnabled, isInPlayoffPhase, currentPlayoffPhaseKey, currentPhaseResultProgress.percent]);

  const divisionMovePlan = useMemo(() => {
      const currentDivisionId =
          activeTournament?.division_id ??
          activeTournament?.division?.id ??
          activeTournament?.divisions?.id ??
          null;
      const currentDivision = (divisiones || []).find((division) => String(division.id) === String(currentDivisionId));
      const sameCategoryDivisions = currentDivision
          ? (divisiones || [])
              .filter((division) => String(division.category_id) === String(currentDivision.category_id))
              .sort((a, b) => Number(a.tier || 0) - Number(b.tier || 0))
          : [];
      const currentIndex = currentDivision
          ? sameCategoryDivisions.findIndex((division) => String(division.id) === String(currentDivision.id))
          : -1;
      const upperDivision = currentIndex > 0 ? sameCategoryDivisions[currentIndex - 1] : null;
      const lowerDivision = currentIndex >= 0 && currentIndex < sameCategoryDivisions.length - 1
          ? sameCategoryDivisions[currentIndex + 1]
          : null;
      const ascensosCount = Math.max(0, Number(tournamentConfigForUi.ascensos ?? form.ascensos ?? 0) || 0);
      const descensosCount = Math.max(0, Number(tournamentConfigForUi.descensos ?? form.descensos ?? 0) || 0);
      const officialTable = buildTorneoStandingsSnapshot({
          torneo: activeTournament,
          equipos: participatingTeams,
          partidos,
          jornadasProp: allTournamentJornadas,
          reglas,
          selectedJornadaView: "recent",
      }).tablaGeneral;
      const orderedStandings = officialTable
          .map((row, index) => ({
              ...row,
              id: row.id,
              rank: index + 1,
              name: row.nombre || getTeamDisplayName(row),
              logo: row.logo || getTeamLogoValue(row),
              color: row.color || v.colorPrincipal,
          }))
          .filter((team) => team.id != null);
      const ascensos = orderedStandings.slice(0, ascensosCount).map((team) => {
          return {
              ...team,
              movement: "Ascenso",
              targetDivision: upperDivision,
          };
      });
      const descensos = orderedStandings
          .filter((team, index) => (index + 1) > (orderedStandings.length - descensosCount))
          .map((team) => ({
              ...team,
              movement: "Descenso",
              targetDivision: lowerDivision,
          }));

      const canPreviewDivisionMoves = Boolean(tournamentFinalResults?.champion && tournamentFinalResults?.runnerUp);

      return {
          currentDivision,
          upperDivision,
          lowerDivision,
          ascensos,
          descensos,
          hasConfiguredMovements: canPreviewDivisionMoves && (ascensosCount > 0 || descensosCount > 0),
          hasApplicableMovements: canPreviewDivisionMoves && (ascensos.some((team) => team.targetDivision?.id) || descensos.some((team) => team.targetDivision?.id)),
      };
  }, [
      activeTournament,
      allTournamentJornadas,
      divisiones,
      form.ascensos,
      form.descensos,
      partidos,
      participatingTeams,
      reglas,
      tournamentFinalResults,
      tournamentConfigForUi.ascensos,
      tournamentConfigForUi.descensos,
  ]);

  const applicableDivisionMoveKeys = useMemo(() => {
      return [
          ...divisionMovePlan.ascensos.map((team) => ({ ...team, movement: "Ascenso" })),
          ...divisionMovePlan.descensos.map((team) => ({ ...team, movement: "Descenso" })),
      ]
          .filter((team) => team.targetDivision?.id)
          .map((team) => getDivisionMoveKey(team.movement, team.id));
  }, [divisionMovePlan.ascensos, divisionMovePlan.descensos]);

  useEffect(() => {
      if (showEndTournamentModal) {
          setSelectedDivisionMoveIds(applicableDivisionMoveKeys);
          setApplyDivisionMoves(applicableDivisionMoveKeys.length > 0);
      }
  }, [applicableDivisionMoveKeys, showEndTournamentModal]);

  useEffect(() => {
      if (!showEndTournamentModal) return;
      setApplyDivisionMoves(selectedDivisionMoveIds.length > 0);
  }, [selectedDivisionMoveIds.length, showEndTournamentModal]);

  const selectedDivisionMoveIdSet = useMemo(
      () => new Set(selectedDivisionMoveIds),
      [selectedDivisionMoveIds]
  );

  const handleApplyDivisionMovesToggle = (checked) => {
      if (!checked) {
          setApplyDivisionMoves(false);
          setSelectedDivisionMoveIds([]);
          return;
      }

      setSelectedDivisionMoveIds(applicableDivisionMoveKeys);
      setApplyDivisionMoves(applicableDivisionMoveKeys.length > 0);
  };

  const handleDivisionMoveSelection = (movement, teamId, checked) => {
      const key = getDivisionMoveKey(movement, teamId);
      setSelectedDivisionMoveIds((current) => {
          return checked
              ? Array.from(new Set([...current, key]))
              : current.filter((currentKey) => currentKey !== key);
      });
  };

  const applyDivisionMovePlan = async () => {
      const updateGroups = [
          {
              teams: divisionMovePlan.ascensos.filter((team) =>
                  team.targetDivision?.id && selectedDivisionMoveIdSet.has(getDivisionMoveKey("Ascenso", team.id))
              ),
              targetDivision: divisionMovePlan.upperDivision,
          },
          {
              teams: divisionMovePlan.descensos.filter((team) =>
                  team.targetDivision?.id && selectedDivisionMoveIdSet.has(getDivisionMoveKey("Descenso", team.id))
              ),
              targetDivision: divisionMovePlan.lowerDivision,
          },
      ].filter((group) => group.targetDivision?.id && group.teams.length > 0);

      for (const group of updateGroups) {
          const { error } = await supabase
              .from("teams")
              .update({ division_id: group.targetDivision.id })
              .in("id", group.teams.map((team) => team.id));

          if (error) throw error;
      }
  };

  const tournamentStats = useMemo(() => {
      if (!standings || standings.length === 0) return null;
      const topScoring = standings.reduce((max, team) => (Number(team.gf || 0) > Number(max.gf || 0)) ? team : max, standings[0]);
      const leastScored = standings.reduce((min, team) => (Number(team.gc || 0) < Number(min.gc || 0)) ? team : min, standings[0]);
      return {
          topScoringTeam: topScoring?.equipo?.name || topScoring?.team_name || topScoring?.name || "--",
          leastScoredTeam: leastScored?.equipo?.name || leastScored?.team_name || leastScored?.name || "--"
      };
  }, [standings]);

  useEffect(() => {
      let ignore = false;

      const fetchTournamentEvents = async () => {
          if (!activeTournament?.id) {
              setTournamentEvents([]);
              return;
          }

          try {
              const { data, error } = await supabase
                  .from("match_events")
                  .select("event_type, matches!inner(jornadas!inner(tournament_id))")
                  .eq("matches.jornadas.tournament_id", activeTournament.id);

              if (error) throw error;
              if (!ignore) setTournamentEvents(data || []);
          } catch (error) {
              console.warn("No se pudieron cargar eventos del torneo:", error);
              if (!ignore) setTournamentEvents([]);
          }
      };

      fetchTournamentEvents();

      return () => {
          ignore = true;
      };
  }, [activeTournament?.id]);

  const jornadaStatusRows = useMemo(() => {
      const matchById = new Map(
          (partidos || [])
              .filter((match) => match?.id)
              .map((match) => [String(match.id), match])
      );
      const repositionMatchMappings = Array.isArray(tournamentConfigForUi.repositionMatchMappings)
          ? tournamentConfigForUi.repositionMatchMappings
          : [];
      const matchMappingByMatchId = new Map(
          repositionMatchMappings
              .filter((mapping) => mapping?.matchId)
              .map((mapping) => [String(mapping.matchId), mapping])
      );

      const getMatchJornadaId = (match) => match?.jornada_id ?? match?.jornadas?.id ?? match?.jornada?.id ?? null;
      const getMatchJornadaName = (match) => match?.jornadas?.name || match?.jornada?.name || "";
      const getLogicalMatchKey = (match) => {
          const teamIds = [match?.team1_id, match?.team2_id]
              .filter((teamId) => teamId !== null && teamId !== undefined)
              .map((teamId) => String(teamId))
              .sort();

          return teamIds.length === 2 ? teamIds.join("-") : String(match?.id || "");
      };

      const regularRows = activeJornadas.map((jornada) => {
          const jornadaId = jornada?.id != null ? String(jornada.id) : null;
          const matchesMap = new Map();

          (partidos || []).forEach((match) => {
              const matchJornadaId = getMatchJornadaId(match);
              const matchJornadaIdString = matchJornadaId != null ? String(matchJornadaId) : null;
              const matchJornadaName = getMatchJornadaName(match);
              const matchMapping = match?.id ? matchMappingByMatchId.get(String(match.id)) : null;
              const mappedOriginalJornadaId = matchMapping?.originalJornadaId != null
                  ? String(matchMapping.originalJornadaId)
                  : null;
              const mappedOriginalJornadaName = matchMapping?.originalJornadaName || "";
              const belongsByMapping = matchMapping && (
                  (jornadaId && mappedOriginalJornadaId === jornadaId) ||
                  (!jornadaId && jornada?.name && mappedOriginalJornadaName === jornada.name)
              );
              const belongsDirectly = !matchMapping && (
                  (jornadaId && matchJornadaIdString === jornadaId) ||
                  (!jornadaId && jornada?.name && matchJornadaName === jornada.name)
              );

              if ((belongsByMapping || belongsDirectly) && match?.id) {
                  matchesMap.set(String(match.id), match);
              }
          });

          repositionMatchMappings.forEach((mapping) => {
              const mappingBelongsById =
                  jornadaId && String(mapping?.originalJornadaId || "") === jornadaId;
              const mappingBelongsByName =
                  !jornadaId &&
                  jornada?.name &&
                  String(mapping?.originalJornadaName || "") === jornada.name;
              const mappedMatch = mapping?.matchId ? matchById.get(String(mapping.matchId)) : null;

              if ((mappingBelongsById || mappingBelongsByName) && mappedMatch?.id) {
                  matchesMap.set(String(mappedMatch.id), mappedMatch);
              }
          });

          const logicalMatches = new Map();
          Array.from(matchesMap.values())
              .filter(isTrackableMatch)
              .forEach((match) => {
                  const logicalKey = getLogicalMatchKey(match);
                  const currentGroup = logicalMatches.get(logicalKey) || {
                      matches: [],
                      hasResult: false,
                  };

                  currentGroup.matches.push(match);
                  currentGroup.hasResult = currentGroup.hasResult || hasRegisteredMatchResult(match);
                  logicalMatches.set(logicalKey, currentGroup);
              });

          const groupedMatches = Array.from(logicalMatches.values());
          const played = groupedMatches.filter((group) => group.hasResult).length;
          const total = groupedMatches.length;
          const pending = Math.max(total - played, 0);
          const percent = total > 0 ? Math.round((played / total) * 100) : 0;
          const status = normalizeMatchStatus(jornada.status);
          const isConfirmed = total > 0
              ? pending === 0
              : status.includes("confirmad") || status.includes("finaliz") || status.includes("complet");

          return {
              id: jornada.id,
              key: `jornada-${jornada.number}`,
              number: jornada.number,
              name: jornada.name,
              shortLabel: `J${jornada.number}`,
              played,
              total,
              pending,
              percent,
              isConfirmed,
          };
      });

      if (!isInPlayoffPhase) return regularRows;

      const isConfirmed = currentPhaseResultProgress.total > 0
          ? currentPhaseResultProgress.pending === 0
          : allTournamentJornadas
              .filter((jornada) => {
                  const name = String(jornada?.name || "").toLowerCase();
                  const label = String(currentPlayoffPhaseLabel || "").toLowerCase();
                  if (currentPlayoffPhaseKey === "repechaje") return name.includes("repechaje");
                  return label && name.startsWith(label);
              })
              .every((jornada) => isConfirmedJornadaStatus(jornada.status));

      return [
          ...regularRows,
          {
              id: `phase-${currentPlayoffPhaseKey}`,
              key: `phase-${currentPlayoffPhaseKey}`,
              number: `phase-${currentPlayoffPhaseKey}`,
              name: currentPlayoffPhaseLabel,
              shortLabel: getPhaseAbbreviation(currentPlayoffPhaseKey),
              played: currentPhaseResultProgress.confirmed,
              total: currentPhaseResultProgress.total,
              pending: currentPhaseResultProgress.pending,
              percent: currentPhaseResultProgress.percent,
              isConfirmed,
              isPlayoff: true,
          },
      ];
  }, [
      activeJornadas,
      allTournamentJornadas,
      currentPhaseResultProgress,
      currentPlayoffPhaseKey,
      currentPlayoffPhaseLabel,
      isInPlayoffPhase,
      partidos,
      tournamentConfigForUi,
  ]);

  const currentStatusJornada = useMemo(() => (
      jornadaStatusRows[jornadaStatusRows.length - 1] ||
      null
  ), [jornadaStatusRows]);

  useEffect(() => {
      if (!currentStatusJornada?.key) return;
      setSelectedStatusJornada((current) => {
          const stillExists = jornadaStatusRows.some((jornada) => jornada.key === current);
          return stillExists ? current : currentStatusJornada.key;
      });
  }, [currentStatusJornada?.key, jornadaStatusRows]);

  const currentJornadaSummary = useMemo(() => {
      const selectedRow = jornadaStatusRows.find((jornada) => jornada.key === selectedStatusJornada);
      const row = selectedRow || currentStatusJornada;

      return row || {
          name: `Jornada ${tournamentProgress.current}`,
          key: `jornada-${tournamentProgress.current}`,
          number: tournamentProgress.current,
          shortLabel: `J${tournamentProgress.current}`,
          played: 0,
          total: 0,
          pending: 0,
          percent: 0,
      };
  }, [currentStatusJornada, jornadaStatusRows, selectedStatusJornada, tournamentProgress]);

  const jornadaStatusTitle = useMemo(() => {
      const name = currentJornadaSummary.name || `Jornada ${currentJornadaSummary.number}`;
      if (currentJornadaSummary.isPlayoff) return `Estatus de ${name}`;

      const jornadaNumber = String(name).match(/jornada\s+(\d+)/i)?.[1] || currentJornadaSummary.number;

      return jornadaNumber
          ? `Estatus de la Jornada ${jornadaNumber}`
          : `Estatus de ${name}`;
  }, [currentJornadaSummary.isPlayoff, currentJornadaSummary.name, currentJornadaSummary.number]);

  useEffect(() => {
      const targetPercent = Number(currentJornadaSummary.percent) || 0;
      let frameId;
      const duration = 650;
      const startTime = performance.now();
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

      if (prefersReducedMotion) {
          setAnimatedJornadaPercent(targetPercent);
          return undefined;
      }

      setAnimatedJornadaPercent(0);

      const animate = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);

          setAnimatedJornadaPercent(Math.round(targetPercent * eased));

          if (progress < 1) {
              frameId = requestAnimationFrame(animate);
          }
      };

      frameId = requestAnimationFrame(animate);

      return () => cancelAnimationFrame(frameId);
  }, [currentJornadaSummary.number, currentJornadaSummary.percent]);

  const handleJornadaBarsWheel = (event) => {
      const scroller = jornadaBarsRef.current;
      if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;

      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (!delta) return;

      event.preventDefault();
      scroller.scrollLeft += delta;
  };

  const handleJornadaBarsPointerDown = (event) => {
      const scroller = jornadaBarsRef.current;
      if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;

      jornadaBarsDragRef.current = {
          isDragging: true,
          startX: event.clientX,
          scrollLeft: scroller.scrollLeft,
      };
      jornadaBarsWasDraggingRef.current = false;
  };

  const finishJornadaBarsDrag = () => {
      const scroller = jornadaBarsRef.current;
      jornadaBarsDragRef.current.isDragging = false;
      scroller?.classList.remove("dragging");
      window.setTimeout(() => {
          jornadaBarsWasDraggingRef.current = false;
      }, 0);
  };

  const handleJornadaBarsPointerMove = (event) => {
      const scroller = jornadaBarsRef.current;
      const dragState = jornadaBarsDragRef.current;
      if (!scroller || !dragState.isDragging) return;

      const distance = event.clientX - dragState.startX;
      if (Math.abs(distance) > 10) {
          jornadaBarsWasDraggingRef.current = true;
          scroller.classList.add("dragging");
      }
      if (jornadaBarsWasDraggingRef.current) {
          event.preventDefault();
          scroller.scrollLeft = dragState.scrollLeft - distance;
      }
  };

  const handleJornadaBarClick = (event, jornadaKey) => {
      if (jornadaBarsWasDraggingRef.current) {
          event.preventDefault();
          event.stopPropagation();
          return;
      }
      setSelectedStatusJornada(jornadaKey);
  };

  const regularResultConfirmationProgress = useMemo(() => {
      const confirmableMatches = (partidos || []).filter(isTrackableMatch);
      const confirmedMatches = confirmableMatches.filter(hasRegisteredMatchResult);
      const total = confirmableMatches.length;
      const confirmed = confirmedMatches.length;

      return {
          confirmed,
          total,
          percent: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      };
  }, [partidos]);

  const resultConfirmationProgress = isInPlayoffPhase
      ? currentPhaseResultProgress
      : regularResultConfirmationProgress;

  const dashboardTournamentProgress = playoffPhaseProgress || {
      label: `Jornada ${tournamentProgress.current}`,
      subtitle: `de ${tournamentProgress.total || "--"}`,
      percent: tournamentProgress.percent,
      markers: [],
  };

  const isAdvancePhaseLocked = isInPlayoffPhase && currentPhaseResultProgress.pending > 0;
  const advancePhaseDisabled = isAdvancingPhase || isAdvancePhaseLocked;
  const advancePhaseTitle = isAdvancePhaseLocked
      ? "Confirma todos los resultados de la fase actual para avanzar."
      : "Avanzar de fase";

  const currentTopScorer = useMemo(() => {
      const scorer = Array.isArray(goleadores) ? goleadores[0] : null;
      if (!scorer) return { name: "Sin registro", teamName: "Sin equipo", photo: null, goals: 0 };
      const scorerTeam =
          allTeams?.find((team) => String(team.id) === String(scorer.team_id)) ||
          null;

      const name = [
          scorer.first_name,
          scorer.last_name,
      ].filter(Boolean).join(" ") || scorer.player_name || scorer.name || "Sin registro";

      return {
          name,
          teamName: scorer.team_name || scorerTeam?.name || scorerTeam?.nombre || "Sin equipo",
          photo: scorer.photo_url || scorer.player_photo || scorer.image_url || null,
          goals: Number(scorer.goals || 0),
      };
  }, [allTeams, goleadores]);

  const setupDateSummary = useMemo(() => {
      const teamCount = participatingTeams.length;
      const vueltasCount = String(form.vueltas || "1") === "2" ? 2 : 1;
      const jornadasPorVuelta = teamCount >= 2
          ? (teamCount % 2 === 0 ? teamCount - 1 : teamCount)
          : 0;
      const totalJornadas = jornadasPorVuelta * vueltasCount;
      const endDate = form.startDate && totalJornadas > 0
          ? addDaysToDate(form.startDate, (totalJornadas * 7) - 1)
          : "";
      const crossesYear = form.startDate && endDate
          ? new Date(`${form.startDate}T00:00:00`).getFullYear() !== new Date(`${endDate}T00:00:00`).getFullYear()
          : false;

      return {
          startLabel: formatSetupDate(form.startDate, crossesYear),
          endLabel: formatSetupDate(endDate, crossesYear),
          totalJornadas,
      };
  }, [form.startDate, form.vueltas, participatingTeams.length]);

  const setupConfigSteps = useMemo(() => {
      const generalReady =
          Boolean(String(form.season || "").trim()) &&
          Boolean(form.startDate) &&
          Number(form.minPlayers) >= 2 &&
          Number(form.minPlayersToRegister ?? 0) >= 0 &&
          Number(form.minPlayersToRegister ?? 0) <= Number(form.maxPlayers || 0) &&
          Number(form.maxPlayers) >= Number(form.minPlayers || 0) &&
          Number(form.maxTeams) >= 2;
      const scoringReady =
          Number.isFinite(Number(form.winPoints)) &&
          Number.isFinite(Number(form.drawPoints)) &&
          Number.isFinite(Number(form.lossPoints)) &&
          Boolean(form.tieBreakType);
      const formatReady =
          Boolean(form.vueltas) &&
          Number(form.ascensos || 0) >= 0 &&
          Number(form.descensos || 0) >= 0 &&
          (!form.zonaLiguilla || Number(form.clasificados || 0) >= 2);
      const gameRulesReady =
          Number(reglas?.minutosPorTiempo || 0) > 0 &&
          Number(reglas?.minutosDescanso || 0) >= 0 &&
          Boolean(reglas?.cambios);

      return [
          { id: "general", label: "General", icon: <RiFileList3Line />, complete: generalReady },
          { id: "scoring", label: "Puntuacion", icon: <RiCoinLine />, complete: scoringReady },
          { id: "format", label: "Formato", icon: <RiGitMergeLine />, complete: formatReady },
          { id: "gameRules", label: "Reglas de juego", icon: <IoMdStopwatch />, complete: gameRulesReady },
      ];
  }, [form, reglas]);

  const completedSetupSteps = setupConfigSteps.filter((step) => step.complete).length;
  const setupProgressPercent = Math.round((completedSetupSteps / setupConfigSteps.length) * 100);
  const isSetupConfigComplete = completedSetupSteps === setupConfigSteps.length;

  const leastConcededTeam = useMemo(() => {
      const teamMap = new Map();
      const standingsMap = new Map(
          (standings || [])
              .filter((row) => row?.id != null)
              .map((row) => [String(row.id), row])
      );

      participatingTeams.forEach((team) => {
          const standingRow = standingsMap.get(String(team.id));
          teamMap.set(String(team.id), {
              id: team.id,
              name: team.name || team.nombre || standingRow?.nombre || "Equipo",
              logo: team.logo_url || team.img || standingRow?.logo || null,
              color: team.color || standingRow?.color || "#1cb0f6",
              gc: 0,
              pj: 0,
              pts: 0,
          });
      });

      const winPoints = Number(tournamentConfigForUi.winPoints ?? form.winPoints ?? 3);
      const drawPoints = Number(tournamentConfigForUi.drawPoints ?? form.drawPoints ?? 1);
      const lossPoints = Number(tournamentConfigForUi.lossPoints ?? form.lossPoints ?? 0);

      (partidos || [])
          .filter((match) => isTrackableMatch(match) && hasRegisteredMatchResult(match))
          .forEach((match) => {
              const local = teamMap.get(String(match.team1_id));
              const visitante = teamMap.get(String(match.team2_id));
              if (!local || !visitante) return;

              const goalsLocal = Number(match.goals1);
              const goalsVisitante = Number(match.goals2);
              if (!Number.isFinite(goalsLocal) || !Number.isFinite(goalsVisitante)) return;

              local.pj += 1;
              visitante.pj += 1;
              local.gc += goalsVisitante;
              visitante.gc += goalsLocal;

              let pointsLocal = Number(match.puntos1);
              let pointsVisitante = Number(match.puntos2);
              const hasStoredPoints = Number.isFinite(pointsLocal) && Number.isFinite(pointsVisitante);

              if (!hasStoredPoints) {
                  if (goalsLocal > goalsVisitante) {
                      pointsLocal = winPoints;
                      pointsVisitante = lossPoints;
                  } else if (goalsLocal < goalsVisitante) {
                      pointsLocal = lossPoints;
                      pointsVisitante = winPoints;
                  } else {
                      pointsLocal = drawPoints;
                      pointsVisitante = drawPoints;
                  }
              }

              local.pts += Number.isFinite(pointsLocal) ? pointsLocal : 0;
              visitante.pts += Number.isFinite(pointsVisitante) ? pointsVisitante : 0;
          });

      const ranked = Array.from(teamMap.values())
          .filter((team) => team.pj > 0)
          .sort((a, b) => {
              if (a.gc !== b.gc) return a.gc - b.gc;
              if (b.pj !== a.pj) return b.pj - a.pj;
              if (b.pts !== a.pts) return b.pts - a.pts;
              return a.name.localeCompare(b.name);
          });

      return ranked[0] || null;
  }, [form.drawPoints, form.lossPoints, form.winPoints, participatingTeams, partidos, standings, tournamentConfigForUi]);

  const tournamentMetrics = useMemo(() => {
      const totalGoals = (partidos || []).reduce((acc, match) => {
          const goals1 = Number(match.goals1);
          const goals2 = Number(match.goals2);
          return acc + (Number.isFinite(goals1) ? goals1 : 0) + (Number.isFinite(goals2) ? goals2 : 0);
      }, 0);

      const redCards = tournamentEvents.filter((event) =>
          /red|roja/.test(String(event?.event_type || "").toLowerCase())
      ).length;
      const yellowCards = tournamentEvents.filter((event) =>
          /yellow|amarilla/.test(String(event?.event_type || "").toLowerCase())
      ).length;

      return [
          { label: "Total de Goles", value: totalGoals, icon: <RiFootballLine /> },
          { type: "cards", label: "Tarjetas", redCards, yellowCards, icon: <RiFileWarningLine /> },
          { type: "topScorer", label: "Goleador Actual", topScorer: currentTopScorer },
          { type: "leastGoals", label: "Equipo menos goleado", leastConceded: leastConcededTeam },
      ];
  }, [partidos, tournamentEvents, currentTopScorer, leastConcededTeam]);

  const activeRules = useMemo(() => ([
      {
          icon: <RiFootballLine />,
          title: "Plantillas",
          detail: `Partido min. ${tournamentConfigForUi.minPlayers ?? form.minPlayers ?? 7} / InscripciÃ³n min. ${tournamentConfigForUi.minPlayersToRegister ?? form.minPlayersToRegister ?? tournamentConfigForUi.minPlayers ?? form.minPlayers ?? 7} / Max. ${tournamentConfigForUi.maxPlayers ?? form.maxPlayers ?? 25}`,
      },
      {
          icon: <RiTimeLine />,
          title: "Duracion de Partido",
          detail: `${tournamentConfigForUi.minutosPorTiempo ?? reglas?.minutosPorTiempo ?? 45}' por tiempo / ${tournamentConfigForUi.minutosDescanso ?? reglas?.minutosDescanso ?? 15}' descanso`,
      },
      {
          icon: <RiCoinLine />,
          title: "Criterio de Desempate",
          detail: String(tournamentConfigForUi.tieBreakType || form.tieBreakType || "normal") === "penalties"
              ? "Penales/Shootouts (Punto Extra)"
              : "Tradicional (Empate directo)",
      },
      {
          icon: <RiBarChartGroupedLine />,
          title: "Ascensos / Descensos",
          detail: (() => {
              const ascensos = Number(tournamentConfigForUi.ascensos ?? form.ascensos ?? 0) || 0;
              const descensos = Number(tournamentConfigForUi.descensos ?? form.descensos ?? 0) || 0;
              return ascensos > 0 || descensos > 0
                  ? `Ascensos: ${ascensos} / Descensos: ${descensos}`
                  : "Sin ascensos ni descensos";
          })(),
      },
      {
          icon: <RiFlagLine />,
          title: "Formato",
          detail: `${String(tournamentConfigForUi.vueltas || form.vueltas || "1") === "2" ? "Ida y vuelta" : "Solo ida"}${tournamentConfigForUi.zonaLiguilla ? ` / Liguilla Top ${tournamentConfigForUi.clasificados || form.clasificados || 4}` : ""}`,
      },
  ]), [tournamentConfigForUi, reglas, form]);

  const isFirstJornadaConfirmed = activeJornadas.some(
      (jornada) => jornada.name === "Jornada 1" && String(jornada.status || "").toLowerCase().includes("confirmad")
  );
  const isVueltasLocked = tournamentProgress.current > Math.ceil((activeJornadas.length || tournamentProgress.total || 1) / 2);

  const handleGoToJornadas = () => {
      const torneosMatch = location.pathname.match(/(\/division\/\d+\/torneos)(?:\/(\d+))?/);
      if (torneosMatch) {
          const [, basePath, torneoId] = torneosMatch;
          navigate(`${basePath}${torneoId ? `/${torneoId}` : ""}/jornadas`);
          return;
      }

      navigate("/torneos/jornadas");
  };

  const openSetupConfigTab = (tabId) => {
      setConfigTab(tabId);
      setShowConfigModal(true);
  };

  const modalForm = configDraftForm || form;
  const modalReglas = configDraftReglas || reglas;

  return (
    <StyledCardWrapper>
        <Toast show={toastConfig.show} message={toastConfig.message} type={toastConfig.type} onClose={() => setToastConfig({ ...toastConfig, show: false })} />

        <TorneoDefinitionMode
          activeTournament={activeTournament}
          isResolving={isLoading && !activeTournament && !isStartingTournament && !isEndingTournament}
          renderActive={() => (
            <ActiveTournamentPanel $isExiting={isExiting} $isEntering={isActiveEntering}>
                <section className="active-hero active-card">
                    <div className="hero-top">
                        <div className="tournament-title">
                            <span className="icon-box"><v.iconocorona /></span>
                            <div>
                                <span className="division-label">{activeTournament?.division?.name || activeTournament?.divisions?.name || divisionName || "Division"}</span>
                                <h2>{activeTournament.season || form.season || "Torneo actual"}</h2>
                                <span className="status-dot">En Curso</span>
                            </div>
                        </div>
                        <div className="progress-copy">
                            <span>Progreso del Torneo</span>
                            <strong>{dashboardTournamentProgress.label} <small>{dashboardTournamentProgress.subtitle}</small></strong>
                        </div>
                    </div>

                    {tournamentFinalResults ? (
                          <div className="champion-panel" style={{ display: "flex", gap: "40px", marginTop: "20px", marginBottom: "15px", justifyContent: "center", alignItems: "flex-end", padding: "20px 0" }}>
                              <div className="runner-up" style={{ textAlign: "center", opacity: 0.9 }}>
                                  <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", color: "#C0C0C0", fontWeight: "bold" }}>Subcampeón</span>
                                  {(() => {
                                      const team = tournamentFinalResults.runnerUp;
                                      if (!team) return <div>--</div>;
                                      return (
                                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                                              {team.logo_url || team.logo || team.img ? (
                                                  <img src={team.logo_url || team.logo || team.img} alt={team.name} style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "3px solid #C0C0C0" }} />
                                              ) : (
                                                  <DynamicTeamLogo name={team.name} color={team.color || "#C0C0C0"} size="60px" />
                                              )}
                                              <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{team.name}</div>
                                          </div>
                                      );
                                  })()}
                              </div>
                              <div className="champion" style={{ textAlign: "center", transform: "translateY(-10px)" }}>
                                  <span style={{ fontSize: "1rem", textTransform: "uppercase", letterSpacing: "1px", color: "#FFD700", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                                      Campeón
                                  </span>
                                  {(() => {
                                      const team = tournamentFinalResults.champion;
                                      if (!team) return <div>--</div>;
                                      return (
                                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", marginTop: "5px" }}>
                                              <div style={{ color: "#FFD700", marginBottom: "-8px", zIndex: 1, filter: "drop-shadow(0 2px 5px rgba(255,215,0,0.4))" }}>
                                                  <v.iconocorona size={45} />
                                              </div>
                                              {team.logo_url || team.logo || team.img ? (
                                                  <img src={team.logo_url || team.logo || team.img} alt={team.name} style={{ width: "85px", height: "85px", borderRadius: "50%", objectFit: "cover", border: "4px solid #FFD700", boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)", position: "relative", zIndex: 2 }} />
                                              ) : (
                                                  <div style={{ position: "relative", zIndex: 2, borderRadius: "50%", border: "4px solid #FFD700", boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)" }}>
                                                      <DynamicTeamLogo name={team.name} color={team.color || "#FFD700"} size="85px" />
                                                  </div>
                                              )}
                                              <div style={{ fontWeight: "800", color: "#FFD700", fontSize: "1.2rem", textShadow: "0 2px 10px rgba(255,215,0,0.3)", marginTop: "8px" }}>{team.name}</div>
                                          </div>
                                      );
                                  })()}
                              </div>
                          </div>
                      ) : (
                        <div className="progress-track-area">
                            <div className="progress-labels">
                                <span>Inicio</span>
                                <strong>{dashboardTournamentProgress.percent}% Completado</strong>
                                <span>Final</span>
                            </div>
                            <div className="progress-track">
                                <span className="progress-fill" style={{ width: `${dashboardTournamentProgress.percent}%` }} />
                                {dashboardTournamentProgress.markers.map((marker) => (
                                    <i
                                        key={marker.key}
                                        className={[
                                            "phase-marker",
                                            marker.isCurrent ? "current" : "",
                                            marker.isComplete ? "complete" : "",
                                        ].filter(Boolean).join(" ")}
                                        style={{ left: `${marker.position}%` }}
                                        title={marker.label}
                                    >
                                        <span>{marker.shortLabel}</span>
                                    </i>
                                ))}
                            </div>
                            {dashboardTournamentProgress.markers.length > 0 && (
                                <div
                                    className="phase-marker-labels"
                                    style={{ "--phase-count": dashboardTournamentProgress.markers.length }}
                                >
                                    {dashboardTournamentProgress.markers.map((marker) => (
                                        <span
                                            key={`phase-label-${marker.key}`}
                                            className={[
                                                marker.isCurrent ? "current" : "",
                                                marker.isComplete ? "complete" : "",
                                            ].filter(Boolean).join(" ")}
                                            title={marker.label}
                                        >
                                            {marker.shortLabel}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="result-progress-row">
                                <span>Resultados confirmados</span>
                                <strong>{resultConfirmationProgress.confirmed} de {resultConfirmationProgress.total}</strong>
                            </div>
                            <div className="result-progress-track">
                                <span style={{ width: `${resultConfirmationProgress.percent}%` }} />
                            </div>
                        </div>
                      )}

                    <div className="hero-actions">
                        {tournamentFinalResults ? (
                            <button className="primary-action" type="button" onClick={() => setShowSummaryModal(true)}>
                                <RiFileList3Line />
                                <span>Exportar resumen</span>
                            </button>
                        ) : (
                            <button className="primary-action" type="button" onClick={handleGoToJornadas}>
                                <RiArrowRightLine />
                                <span>Definir jornadas</span>
                            </button>
                        )}
                        
                        {!tournamentFinalResults && playoffEnabled && (
                            <button
                                className="secondary-action"
                                type="button"
                                onClick={() => preparePlayoffPreview()}
                                disabled={advancePhaseDisabled}
                                title={advancePhaseTitle}
                            >
                                <RiFlagLine />
                                <span>{isAdvancingPhase ? "Preparando..." : "Avanzar de fase"}</span>
                            </button>
                        )}
                        <button className="secondary-action danger" type="button" onClick={() => setShowEndTournamentModal(true)}>
                            <RiDeleteBinLine />
                            <span>Finalizar Torneo</span>
                        </button>
                    </div>
                </section>

                <section className="rules-card active-card">
                    <div className="section-heading">
                        <h3><RiFileList3Line /> Reglas Activas</h3>
                        <button type="button" onClick={() => setShowConfigModal(true)} title="Ver configuracion">
                            <RiSettings3Line />
                        </button>
                    </div>
                    <div className="rules-list">
                        {activeRules.map((rule) => (
                            <div className="rule-item" key={rule.title}>
                                <span className="rule-icon">{rule.icon}</span>
                                <div>
                                    <strong>{rule.title}</strong>
                                    <small>{rule.detail}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="jornada-card active-card">
                    <div className="section-heading">
                        <h3><RiCalendarEventLine /> {jornadaStatusTitle}</h3>
                        <span className="status-pill">{currentJornadaSummary.pending > 0 ? "En progreso" : "Lista"}</span>
                    </div>
                    <div className="jornada-status">
                        <div className="jornada-main">
                            <span>{currentJornadaSummary.name}</span>
                            <strong>{currentJornadaSummary.played} de {currentJornadaSummary.total} partidos jugados</strong>
                            <small>{currentJornadaSummary.pending > 0 ? `Faltan ${currentJornadaSummary.pending} resultados por reportar.` : "Todos los partidos estan reportados."}</small>
                        </div>
                        <div
                            className="ring-progress"
                            style={{ "--progress": `${animatedJornadaPercent}%` }}
                        >
                            <span>{animatedJornadaPercent}%</span>
                        </div>
                    </div>
                    <div className="mini-progress">
                        <span
                            key={`jornada-progress-${currentJornadaSummary.number}-${currentJornadaSummary.percent}`}
                            style={{ width: `${currentJornadaSummary.percent}%` }}
                        />
                    </div>
                    <div
                        className="jornada-bars"
                        ref={jornadaBarsRef}
                        aria-label="Partidos confirmados por jornada"
                        onWheel={handleJornadaBarsWheel}
                        onPointerDown={handleJornadaBarsPointerDown}
                        onPointerMove={handleJornadaBarsPointerMove}
                        onPointerUp={finishJornadaBarsDrag}
                        onPointerCancel={finishJornadaBarsDrag}
                        onPointerLeave={finishJornadaBarsDrag}
                    >
                        {jornadaStatusRows.map((jornada, index) => (
                            <button
                                type="button"
                                key={jornada.key || jornada.id || jornada.number}
                                className={[
                                    jornada.key === currentJornadaSummary.key ? "selected" : "",
                                    jornada.key === currentStatusJornada?.key ? "current" : "",
                                    jornada.isPlayoff ? "playoff-phase" : "",
                                ].filter(Boolean).join(" ")}
                                style={{
                                    "--bar-height": `${Math.max(jornada.percent, jornada.total > 0 ? 8 : 0)}%`,
                                    "--bar-index": index,
                                }}
                                onClick={(event) => handleJornadaBarClick(event, jornada.key)}
                                title={`${jornada.name}: ${jornada.played} de ${jornada.total} partidos jugados`}
                            >
                                <span className="bar-track"><span /></span>
                                <small>{jornada.shortLabel || `J${jornada.number}`}</small>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="metrics-card active-card">
                    <div className="section-heading">
                        <h3><RiBarChartGroupedLine /> Metricas del Torneo</h3>
                    </div>
                    <div className="metrics-grid">
                        {tournamentMetrics.map((metric) => (
                            metric.type === "cards" ? (
                                <div className="metric-item metric-cards" key={metric.label}>
                                    <div className="card-half red-card">
                                        <small>Tarjetas Rojas</small>
                                        <strong>{metric.redCards}</strong>
                                    </div>
                                    <div className="card-half yellow-card">
                                        <small>Tarjetas Amarillas</small>
                                        <strong>{metric.yellowCards}</strong>
                                    </div>
                                </div>
                            ) : metric.type === "topScorer" ? (
                                <div className="metric-item metric-leader-card" key={metric.label}>
                                    <span className="metric-avatar player-avatar">
                                        {metric.topScorer.photo ? (
                                            <img
                                                src={metric.topScorer.photo}
                                                alt={metric.topScorer.name}
                                                crossOrigin="anonymous"
                                            />
                                        ) : (
                                            <RiUserStarFill />
                                        )}
                                    </span>
                                    <div className="metric-copy">
                                        <small>Goleador Actual</small>
                                        <em>{metric.topScorer.teamName}</em>
                                        <strong title={metric.topScorer.name}>{metric.topScorer.name}</strong>
                                        <span className="leader-stats">{metric.topScorer.goals} goles</span>
                                    </div>
                                </div>
                            ) : metric.type === "leastGoals" ? (
                                <div className="metric-item metric-leader-card metric-least-goals" key={metric.label}>
                                    <Tooltip
                                        position="top"
                                        text="Criterio de desempate: menor cantidad de goles en contra, luego mas partidos jugados, despues mas puntos."
                                    >
                                        <button type="button" className="metric-info" aria-label="Criterios de desempate">
                                            <RiInformationLine />
                                        </button>
                                    </Tooltip>
                                    <span className="metric-avatar team-avatar">
                                        {metric.leastConceded?.logo ? (
                                            <img
                                                src={metric.leastConceded.logo}
                                                alt={metric.leastConceded.name}
                                                crossOrigin="anonymous"
                                            />
                                        ) : (
                                            <DynamicTeamLogo
                                                name={metric.leastConceded?.name || "Equipo"}
                                                color={metric.leastConceded?.color || "#1cb0f6"}
                                                size="100%"
                                            />
                                        )}
                                    </span>
                                    <div className="metric-copy">
                                        <small>Equipo menos goleado</small>
                                        <strong title={metric.leastConceded?.name || "Sin registro"}>
                                            {metric.leastConceded?.name || "Sin registro"}
                                        </strong>
                                        <span className="leader-stats">
                                            {metric.leastConceded
                                                ? `${metric.leastConceded.gc} GC / ${metric.leastConceded.pj} PJ / ${metric.leastConceded.pts} PTS`
                                                : "Sin partidos jugados"}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="metric-item" key={metric.label}>
                                    <span className="metric-icon">{metric.icon}</span>
                                    <div>
                                        <small>{metric.label}</small>
                                        <strong title={String(metric.value)}>{metric.value}</strong>
                                        {metric.detail && <em>{metric.detail}</em>}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </section>
            </ActiveTournamentPanel>
          )}
          renderSetup={() => (
            <SetupTournamentPanel className="setup-tournament-panel" $isExiting={isSetupExiting} $isEntering={isSetupEntering}>
                <section className="setup-hero active-card">
                    <div className="hero-top">
                        <div className="tournament-title">
                            <span className="icon-box"><v.iconocorona /></span>
                            <div>
                                <span className="division-label">{divisionName || "Division"}</span>
                                <h2>{form.season || "Nuevo torneo"}</h2>
                                <span className="status-dot setup-status">Configuracion</span>
                            </div>
                        </div>
                        <div className="setup-readiness">
                            <div className={form.startDate ? "ready" : ""}>
                                <span>Inicio</span>
                                <strong>{setupDateSummary.startLabel}</strong>
                            </div>
                            <div className={setupDateSummary.totalJornadas > 0 && form.startDate ? "ready" : ""}>
                                <span>Fin previsto</span>
                                <strong>{setupDateSummary.endLabel}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="progress-track-area">
                        <div className="progress-labels">
                            <span>Configuracion</span>
                            <strong>{completedSetupSteps} de {setupConfigSteps.length} secciones listas</strong>
                            <span>Sorteo</span>
                        </div>
                        <div className="progress-track">
                            <span style={{ width: `${setupProgressPercent}%` }} />
                        </div>
                        <div className="setup-step-progress" aria-label="Progreso de configuracion del torneo">
                            {setupConfigSteps.map((step, index) => (
                                <button
                                    type="button"
                                    key={step.id}
                                    className={step.complete ? "ready" : ""}
                                    onClick={() => openSetupConfigTab(step.id)}
                                    style={{ "--step-index": index }}
                                >
                                    <span>{step.icon}</span>
                                    <strong>{step.label}</strong>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hero-actions">
                        <button className="secondary-action" type="button" onClick={() => setShowConfigModal(true)}>
                            <RiSettings3Line />
                            <span>Configurar Reglas</span>
                        </button>
                        <button
                            className="primary-action"
                            type="button"
                            onClick={handlePreStartTournament}
                            disabled={loading || !divisionName || participatingTeams.length < 2 || !isSetupConfigComplete}
                        >
                            <v.iconoguardar />
                            <span>{loading ? "Creando..." : "Siguiente: Sorteo"}</span>
                        </button>
                    </div>
                </section>

                <section className="setup-rules active-card">
                    <div className="section-heading">
                        <h3><RiFileList3Line /> Resumen de Reglas</h3>
                    </div>
                    <div className="rules-list">
                        {activeRules.map((rule) => (
                            <div className="rule-item" key={rule.title}>
                                <span className="rule-icon">{rule.icon}</span>
                                <div>
                                    <strong>{rule.title}</strong>
                                    <small>{rule.detail}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="setup-builder active-card">
                    <div className="section-heading">
                        <h3><RiTeamLine /> Equipos del Torneo</h3>
                        <span className="status-pill">{participatingTeams.length >= 2 ? "Equipos listos" : "Faltan equipos"}</span>
                    </div>
                    <TorneoDashboard
                        form={form} reglas={reglas} onEditConfig={() => setShowConfigModal(true)}
                        participatingTeams={participatingTeams} excludedTeams={excludedTeams}
                        onInclude={onInclude} onExclude={onExclude} isLoading={isLoading} minPlayers={form.minPlayersToRegister}
                        showSummary={false}
                    />
                </section>
            </SetupTournamentPanel>
          )}
        />

        {transitionOverlay.visible && (
            <TournamentStartOverlay aria-live="polite" aria-busy="true" $variant={transitionOverlay.variant}>
                <div className="start-loader">
                    <span className="loader-ring" />
                    <div>
                        <strong>{transitionOverlay.title}</strong>
                        <small>{transitionOverlay.subtitle}</small>
                    </div>
                </div>
            </TournamentStartOverlay>
        )}

        <FixturePreviewModal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} onConfirm={handleConfirmFixture} teams={participatingTeams} config={form} isLoading={loading} />
        <ConfirmModal
            isOpen={showEndTournamentModal}
            onClose={() => setShowEndTournamentModal(false)}
            onConfirm={handleEndTournament}
            title="¿Finalizar Torneo Actual?"
            message="Esta acción borrará permanentemente todos los partidos del torneo actual."
            subMessage={divisionMovePlan.hasConfiguredMovements ? "Revisa los ascensos y descensos antes de confirmar." : "Este torneo no tiene ascensos ni descensos configurados."}
            confirmText={isDeleting ? "Finalizando..." : "Sí, Finalizar"}
            confirmColor={v.rojo}
            width="560px"
        >
            {divisionMovePlan.hasConfiguredMovements && (
                <DivisionMovesPreview $active={applyDivisionMoves}>
                    <label className="auto-move-toggle">
                        <input
                            type="checkbox"
                            checked={applyDivisionMoves}
                            disabled={!divisionMovePlan.hasApplicableMovements || isDeleting}
                            onChange={(event) => handleApplyDivisionMovesToggle(event.target.checked)}
                        />
                        <span>
                            <strong>Aplicar movimientos automáticamente</strong>
                            <small>
                                {divisionMovePlan.hasApplicableMovements
                                    ? "Los equipos se moverán a la división indicada al finalizar."
                                    : "No hay una división vecina disponible para aplicar movimientos."}
                            </small>
                        </span>
                    </label>

                    <div className="moves-grid">
                        {[
                            { key: "ascensos", title: "Ascienden", teams: divisionMovePlan.ascensos, fallback: "No hay ascensos configurados" },
                            { key: "descensos", title: "Descienden", teams: divisionMovePlan.descensos, fallback: "No hay descensos configurados" },
                        ].map((group) => (
                            <div className="move-group" key={group.key}>
                                <h4>{group.title}</h4>
                                {group.teams.length > 0 ? (
                                    <div className="move-list">
                                        {group.teams.map((team) => (
                                            <label
                                                className={[
                                                    "move-team",
                                                    applyDivisionMoves && selectedDivisionMoveIdSet.has(getDivisionMoveKey(team.movement, team.id)) ? "selected" : "",
                                                    !team.targetDivision?.id ? "unavailable" : "",
                                                ].filter(Boolean).join(" ")}
                                                key={`${group.key}-${team.id}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDivisionMoveIdSet.has(getDivisionMoveKey(team.movement, team.id))}
                                                    disabled={!team.targetDivision?.id || isDeleting}
                                                    onChange={(event) => handleDivisionMoveSelection(team.movement, team.id, event.target.checked)}
                                                    aria-label={`${team.movement} de ${team.name}`}
                                                />
                                                <span className="team-logo">
                                                    {team.logo ? (
                                                        <img src={team.logo} alt={team.name} />
                                                    ) : (
                                                        <DynamicTeamLogo name={team.name} color={team.color} size="32px" />
                                                    )}
                                                </span>
                                                <span className="team-copy">
                                                    <strong title={team.name}>{team.name}</strong>
                                                    <small>
                                                        {team.targetDivision?.name
                                                            ? `#${team.rank} · A: ${team.targetDivision.name}`
                                                            : `#${team.rank} · Sin división destino`}
                                                    </small>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="empty-move">{group.fallback}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </DivisionMovesPreview>
            )}
        </ConfirmModal>

        <ConfirmModal
            isOpen={showAdvanceWarningModal}
            onClose={() => setShowAdvanceWarningModal(false)}
            onConfirm={handleConfirmAdvanceWarning}
            title="Faltan resultados antes de avanzar"
            message={advanceWarning.pendingMatches > 0 ? `Falta confirmar resultado en ${advanceWarning.pendingMatches} partido(s).` : "Hay jornadas sin confirmar antes de avanzar."}
            subMessage={advanceWarning.pendingJornadas > 0 ? `Tambien hay ${advanceWarning.pendingJornadas} jornada(s) sin confirmar. Si continuas, los cruces se calcularan con la informacion disponible.` : "Si continuas, los cruces se calcularan con la informacion disponible."}
            confirmText="Avanzar de todos modos"
            confirmColor={v.colorPrincipal}
            confirmIcon={<RiArrowRightLine/>}
            thinButtons
        />
        <PlayoffAdvanceModal
            isOpen={showPlayoffPreviewModal}
            onClose={() => setShowPlayoffPreviewModal(false)}
            onConfirm={handleConfirmPlayoffAdvance}
            preview={playoffPreview}
            isLoading={isAdvancingPhase}
        />

        {activeTournament ? (
            <TournamentConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                activeTournament={activeTournament}
                onSave={handleSaveActiveConfig}
                isVueltasLocked={isVueltasLocked}
                isStartDateLocked={isFirstJornadaConfirmed}
            />
        ) : (
        <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Configurar Reglas" width="650px" closeOnOverlayClick={false}>
            <ModalContentStyled>
                
                <div className="info-message" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <RiInformationLine className="icon"/>
                        <span>
                            {configDraftUseLeagueRules 
                                ? "Reglas predeterminadas de la Liga aplicadas." 
                                : "Usando configuración personalizada."}
                        </span>
                    </div>
                    
                    <ToggleContainer>
                        <ToggleOption $active={configDraftUseLeagueRules} onClick={() => handleToggleRules(true)}>
                            Reglas Liga
                        </ToggleOption>
                        <ToggleOption $active={!configDraftUseLeagueRules} onClick={() => handleToggleRules(false)}>
                            Personalizado
                        </ToggleOption>
                    </ToggleContainer>
                </div>

                <TabsNavigation tabs={configTabList} activeTab={configTab} setActiveTab={setConfigTab} />
                
                <div style={{ minHeight: '280px' }}>
                    {configTab === 'general' && <TabGeneral form={modalForm} onChange={handleFormChange} />}
                    {configTab === 'scoring' && <TabScoring form={modalForm} onChange={handleFormChange} />}
                    {configTab === 'format' && <TabFormat form={modalForm} onChange={handleFormChange} />}
                    {configTab === 'gameRules' && <TabGameRules reglas={modalReglas} setReglas={handleReglasChange} />}
                </div>

                <div className="modal-actions">
                    <Btnsave titulo="Guardar Configuración" bgcolor={v.colorPrincipal} funcion={handleSaveConfig} />
                </div>
            </ModalContentStyled>
        </Modal>
        )}

        <TournamentSummaryModal
            isOpen={showSummaryModal}
            onClose={() => setShowSummaryModal(false)}
            activeTournament={activeTournament}
            leagueData={leagueData}
            participatingTeams={participatingTeams}
            partidos={partidos}
            allTournamentJornadas={allTournamentJornadas}
            tournamentFinalResults={tournamentFinalResults}
            stats={tournamentStats}
            standings={standings}
        />
    </StyledCardWrapper>
  );
}

const StyledCardWrapper = styled.div` 
    position: relative;
    width: 100%;
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    justify-content: center;
`;

const TournamentStartOverlay = styled.div`
    --overlay-accent: ${({ $variant, theme }) =>
        $variant === "danger"
            ? (theme.tournamentDashboard?.metrics?.danger || v.rojo)
            : (theme.tournamentDashboard?.primary || v.colorPrincipal)};
    --overlay-accent-soft: ${({ $variant, theme }) =>
        $variant === "danger"
            ? "rgba(239, 68, 68, 0.18)"
            : (theme.tournamentDashboard?.hero?.accentSoft || `${v.colorPrincipal}22`)};
    --overlay-shell: ${({ theme }) => `rgba(${theme.bodyRgba || "255,255,255"}, 0.86)`};
    --overlay-shell-strong: ${({ theme }) => `rgba(${theme.bodyRgba || "255,255,255"}, 0.96)`};
    --overlay-shadow: ${({ theme }) =>
        String(theme.body || "").toLowerCase() === "#fff"
            ? "0 18px 45px rgba(24, 39, 57, 0.16)"
            : "0 18px 45px rgba(0, 0, 0, 0.28)"};
    position: absolute;
    inset: 0;
    z-index: 8;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    border-radius: 12px;
    background:
        radial-gradient(circle at 50% 42%, var(--overlay-accent-soft), transparent 32%),
        linear-gradient(180deg, var(--overlay-shell), var(--overlay-shell-strong));
    backdrop-filter: blur(6px);
    animation: overlayFadeIn 0.28s ease both;

    .start-loader {
        min-width: min(360px, 100%);
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px 20px;
        border: 1px solid ${({theme}) => theme.tournamentDashboard?.border || theme.bg4};
        border-radius: 10px;
        background: ${({theme}) => theme.tournamentDashboard?.surface || theme.bgcards};
        box-shadow: var(--overlay-shadow);
        color: ${({theme}) => theme.text};
        animation: loaderFloatIn 0.42s cubic-bezier(0.18, 0.9, 0.24, 1) both;
    }

    .loader-ring {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        border-radius: 50%;
        border: 4px solid var(--overlay-accent-soft);
        border-top-color: var(--overlay-accent);
        animation: startSpin 0.82s linear infinite;
    }

    strong,
    small {
        display: block;
    }

    strong {
        font-size: 0.92rem;
        font-weight: 950;
        letter-spacing: 0;
    }

    small {
        margin-top: 4px;
        color: ${({theme}) => theme.tournamentDashboard?.muted || `${theme.text}9a`};
        font-size: 0.72rem;
        font-weight: 800;
    }

    @keyframes overlayFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes loaderFloatIn {
        from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @keyframes startSpin {
        to { transform: rotate(360deg); }
    }
`;

const DivisionMovesPreview = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;

    .auto-move-toggle {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
        padding: 12px;
        border: 1px solid ${({ $active, theme }) => $active ? theme.primary : theme.bg4};
        border-radius: 8px;
        background: ${({ $active, theme }) => $active ? `${theme.primary}14` : theme.bgtotal};
        color: ${({ theme }) => theme.text};
        cursor: pointer;
        transition: background-color 190ms ease, border-color 190ms ease, box-shadow 190ms ease;
        box-shadow: ${({ $active, theme }) => $active ? `0 0 0 3px ${theme.primary}18` : "none"};
    }

    .auto-move-toggle input {
        width: 18px;
        height: 18px;
        margin-top: 2px;
        accent-color: ${({ theme }) => theme.primary};
        cursor: pointer;
        flex: 0 0 auto;
    }

    .auto-move-toggle input:disabled {
        cursor: not-allowed;
    }

    .auto-move-toggle span {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }

    .auto-move-toggle strong {
        font-size: 0.86rem;
        font-weight: 850;
        color: ${({ theme }) => theme.text};
    }

    .auto-move-toggle small {
        font-size: 0.74rem;
        line-height: 1.35;
        color: ${({ theme }) => `${theme.text}a6`};
    }

    .moves-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .move-group {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid ${({ theme }) => theme.bg4};
        background: ${({ theme }) => theme.bgtotal};
    }

    .move-group h4 {
        margin: 0;
        color: ${({ theme }) => theme.text};
        font-size: 0.76rem;
        font-weight: 900;
    }

    .move-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .move-team {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        padding: 8px;
        border-radius: 8px;
        border: 1px solid transparent;
        background: ${({ theme }) => theme.bgcards};
        box-shadow: none;
        opacity: 0.82;
        cursor: pointer;
        transition: background-color 210ms ease, border-color 210ms ease, box-shadow 210ms ease, opacity 210ms ease;
    }

    .move-team.selected {
        border-color: ${({ theme }) => theme.primary};
        background: ${({ theme }) => `${theme.primary}18`};
        box-shadow: ${({ theme }) => `0 0 0 2px ${theme.primary}12`};
        opacity: 1;
    }

    .move-team.unavailable {
        border-color: ${({ theme }) => theme.bg4};
        background: ${({ theme }) => theme.bgcards};
        opacity: 0.62;
        cursor: not-allowed;
    }

    .move-team input {
        width: 16px;
        height: 16px;
        margin: 0;
        accent-color: ${({ theme }) => theme.primary};
        flex: 0 0 auto;
        cursor: pointer;
    }

    .move-team input:disabled {
        cursor: not-allowed;
    }

    .team-logo {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        flex: 0 0 32px;
        display: grid;
        place-items: center;
        background: ${({ theme }) => theme.bg4};
    }

    .team-logo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .team-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .team-copy strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: ${({ theme }) => theme.text};
        font-size: 0.78rem;
        font-weight: 850;
    }

    .team-copy small,
    .empty-move {
        color: ${({ theme }) => `${theme.text}99`};
        font-size: 0.68rem;
        line-height: 1.3;
    }

    .empty-move {
        margin: 0;
    }

    @media (max-width: 560px) {
        .moves-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .auto-move-toggle,
        .move-team {
            transition: none;
        }
    }
`;

const ActiveTournamentPanel = styled.div`
    width: 100%;
    max-width: 1180px;
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(280px, 0.98fr);
    grid-template-areas:
        "hero rules"
        "jornada metrics";
    gap: 20px;
    opacity: ${({ $isExiting }) => ($isExiting ? 0 : 1)};
    transform: ${({ $isExiting }) => ($isExiting ? "translateY(10px)" : "translateY(0)")};
    transition: opacity 0.45s ease, transform 0.45s ease;
    animation: ${({ $isExiting, $isEntering }) => {
        if ($isExiting) return "none";
        return $isEntering
            ? "activePanelReveal 0.72s cubic-bezier(0.18, 0.9, 0.24, 1) both"
            : "none";
    }};

    @keyframes activePanelReveal {
        from {
            opacity: 0;
            transform: translateY(18px) scale(0.985);
            filter: blur(2px);
        }
        60% {
            filter: blur(0);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
        }
    }

    @keyframes activeCardReveal {
        from {
            opacity: 0;
            transform: translateY(12px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes progressFillIn {
        from {
            transform: scaleX(0);
        }
        to {
            transform: scaleX(1);
        }
    }

    @keyframes barGrowIn {
        from {
            transform: scaleY(0);
            opacity: 0.3;
        }
        to {
            transform: scaleY(1);
            opacity: 1;
        }
    }

    .active-card {
        --panel-accent: ${({theme}) => theme.tournamentDashboard?.primary || v.colorPrincipal};
        --panel-accent-soft: ${({theme}) => theme.tournamentDashboard?.primarySoft || `${v.colorPrincipal}16`};
        --panel-accent-strong: ${({theme}) => theme.tournamentDashboard?.primary || v.colorPrincipal};
        --panel-glow: ${({theme}) => theme.tournamentDashboard?.hero?.glow || `${v.colorPrincipal}24`};
        --panel-surface: ${({theme}) => theme.tournamentDashboard?.surface || theme.bgcards};
        --panel-item-bg: ${({theme}) => theme.tournamentDashboard?.itemSurface || theme.bgtotal};
        --panel-border: ${({theme}) => theme.tournamentDashboard?.border || theme.bg4};
        --panel-muted: ${({theme}) => theme.tournamentDashboard?.muted || `${theme.text}9a`};
        --td-danger: ${({theme}) => theme.tournamentDashboard?.metrics?.danger || v.rojo};
        background: var(--panel-surface);
        border: 1px solid var(--panel-border);
        border-radius: 8px;
        box-shadow: ${v.boxshadowGray};
        color: ${({theme}) => theme.text};
        overflow: hidden;
        animation: ${({ $isEntering }) => ($isEntering ? "activeCardReveal 0.55s ease both" : "none")};
    }

    .active-card:nth-child(1) { animation-delay: ${({ $isEntering }) => ($isEntering ? "70ms" : "0ms")}; }
    .active-card:nth-child(2) { animation-delay: ${({ $isEntering }) => ($isEntering ? "130ms" : "0ms")}; }
    .active-card:nth-child(3) { animation-delay: ${({ $isEntering }) => ($isEntering ? "190ms" : "0ms")}; }
    .active-card:nth-child(4) { animation-delay: ${({ $isEntering }) => ($isEntering ? "250ms" : "0ms")}; }

    .active-hero {
        --panel-accent: ${({theme}) => theme.tournamentDashboard?.hero?.accent || v.colorPrincipal};
        --panel-accent-soft: ${({theme}) => theme.tournamentDashboard?.hero?.accentSoft || `${v.colorPrincipal}18`};
        --panel-accent-strong: ${({theme}) => theme.tournamentDashboard?.hero?.accentStrong || "#39d4ff"};
        --panel-glow: ${({theme}) => theme.tournamentDashboard?.hero?.glow || `${v.colorPrincipal}24`};
        grid-area: hero;
        min-height: 232px;
        padding: 22px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background:
            radial-gradient(circle at 85% 18%, var(--panel-glow), transparent 32%),
            var(--panel-surface);
    }

    .hero-top,
    .section-heading,
    .tournament-title,
    .hero-actions,
    .rule-item,
    .jornada-status,
    .metric-item {
        display: flex;
        align-items: center;
    }

    .hero-top,
    .section-heading {
        justify-content: space-between;
        gap: 16px;
    }

    .tournament-title {
        gap: 16px;
        min-width: 0;
    }

    .icon-box {
        width: 52px;
        height: 52px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: var(--panel-accent-soft);
        color: var(--panel-accent);
        font-size: 26px;
        flex: 0 0 auto;
    }

    h2,
    h3 {
        margin: 0;
        min-width: 0;
    }

    h2 {
        font-size: 1.35rem;
        line-height: 1.1;
    }

    .division-label {
        display: block;
        margin-bottom: 5px;
        color: var(--panel-accent);
        font-size: 0.68rem;
        font-weight: 950;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.74rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.76;
    }

    .status-dot {
        display: inline-flex;
        align-items: center;
        margin-top: 8px;
        padding: 4px 9px;
        border-radius: 6px;
        background: ${({theme}) => theme.tournamentDashboard?.metrics?.accentSoft || `${v.verde}1d`};
        color: ${({theme}) => theme.tournamentDashboard?.metrics?.accent || v.verde};
        font-size: 0.68rem;
        font-weight: 800;
    }

    .progress-copy {
        text-align: right;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 130px;
    }

    .progress-copy span,
    .progress-labels,
    .rule-item small,
    .jornada-main small,
    .metric-item small,
    .metric-item em {
        color: var(--panel-muted);
        font-size: 0.72rem;
        font-weight: 800;
    }

    .progress-copy strong {
        font-size: 1.05rem;
    }

    .progress-copy small {
        color: var(--panel-muted);
        font-size: 0.78rem;
    }

    .progress-track-area {
        margin: 20px 0;
    }

    .progress-labels {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        margin-bottom: 10px;
    }

    .progress-labels span:last-child {
        text-align: right;
    }

    .progress-track {
        position: relative;
        height: 8px;
        border-radius: 999px;
        background: var(--panel-item-bg);
        border: 1px solid var(--panel-border);
        overflow: visible;
    }

    .progress-track .progress-fill {
        position: relative;
        z-index: 1;
        display: block;
        height: 100%;
        min-width: 8px;
        max-width: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--panel-accent), var(--panel-accent-strong));
        transition: width 0.35s ease;
    }

    .phase-marker {
        position: absolute;
        z-index: 2;
        top: 50%;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 2px solid var(--panel-border);
        background: ${({ theme }) => theme.bgcards};
        transform: translate(-50%, -50%);
        display: grid;
        place-items: center;
    }

    .phase-marker.complete {
        border-color: var(--panel-accent-strong);
        background: var(--panel-accent-strong);
    }

    .phase-marker.current {
        width: 18px;
        height: 18px;
        border-color: var(--panel-accent);
        background: var(--panel-accent);
    }

    .phase-marker span {
        display: none;
    }

    .phase-marker-labels {
        display: grid;
        grid-template-columns: repeat(var(--phase-count), minmax(26px, 1fr));
        align-items: center;
        gap: 4px;
        margin-top: 10px;
        color: var(--panel-muted);
        font-size: 0.58rem;
        font-weight: 950;
        line-height: 1;
        text-align: center;
    }

    .phase-marker-labels span {
        min-width: 0;
        padding-top: 2px;
        white-space: nowrap;
    }

    .phase-marker-labels .current,
    .phase-marker-labels .complete {
        color: var(--panel-accent);
    }

    .result-progress-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 12px 0 7px;
        color: var(--panel-muted);
        font-size: 0.68rem;
        font-weight: 900;
    }

    .result-progress-track {
        height: 6px;
        border-radius: 999px;
        overflow: hidden;
        background: var(--panel-item-bg);
        border: 1px solid var(--panel-border);
    }

    .result-progress-track span {
        display: block;
        height: 100%;
        min-width: 6px;
        max-width: 100%;
        border-radius: inherit;
        background: var(--panel-accent-strong);
        transform-origin: left center;
        animation: progressFillIn 0.7s ease-out both;
        transition: width 0.35s ease;
    }

    .hero-actions {
        gap: 12px;
        flex-wrap: wrap;
    }

    .primary-action,
    .secondary-action,
    .section-heading button {
        border: 0;
        cursor: pointer;
        transition: transform 0.2s ease, filter 0.2s ease, background 0.2s ease;
    }

    .primary-action,
    .secondary-action {
        min-height: 42px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 900;
        font-size: 0.82rem;
        padding: 0 18px;
    }

    .primary-action {
        flex: 1 1 260px;
        color: #fff;
        background: var(--panel-accent);
    }

    .secondary-action {
        color: ${({theme}) => theme.text};
        background: var(--panel-item-bg);
        border: 1px solid var(--panel-border);
    }

    .secondary-action.danger:hover {
        color: #fff;
        background: var(--td-danger);
        border-color: var(--td-danger);
    }

    .primary-action:hover,
    .secondary-action:hover,
    .section-heading button:hover {
        transform: translateY(-1px);
        filter: brightness(1.04);
    }

    .primary-action:disabled,
    .secondary-action:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        transform: none;
        filter: none;
    }

    .rules-card {
        --panel-accent: ${({theme}) => theme.tournamentDashboard?.rules?.accent || "#7c3aed"};
        --panel-accent-soft: ${({theme}) => theme.tournamentDashboard?.rules?.accentSoft || "#f1e8ff"};
        --panel-accent-strong: ${({theme}) => theme.tournamentDashboard?.rules?.accentStrong || "#5b21b6"};
        grid-area: rules;
        padding: 18px;
    }

    .section-heading {
        margin-bottom: 14px;
    }

    .section-heading button {
        width: 30px;
        height: 30px;
        border-radius: 6px;
        display: grid;
        place-items: center;
        color: var(--panel-accent);
        background: transparent;
    }

    .rules-list {
        display: grid;
        gap: 8px;
    }

    .rule-item {
        gap: 9px;
        min-height: 44px;
        padding: 8px 10px;
        border-radius: 8px;
        background: var(--panel-item-bg);
        border: 1px solid var(--panel-border);
    }

    .rule-icon {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        display: grid;
        place-items: center;
        color: var(--panel-accent);
        background: var(--panel-accent-soft);
        flex: 0 0 auto;
    }

    .rule-item div {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .rule-item strong,
    .jornada-main strong,
    .metric-item strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .rule-item strong {
        font-size: 0.76rem;
    }

    .rule-item small {
        font-size: 0.66rem;
    }

    .jornada-card {
        --panel-accent: ${({theme}) => theme.tournamentDashboard?.jornada?.accent || v.colorPrincipal};
        --panel-accent-soft: ${({theme}) => theme.tournamentDashboard?.jornada?.accentSoft || `${v.colorPrincipal}16`};
        --panel-accent-strong: ${({theme}) => theme.tournamentDashboard?.jornada?.accentStrong || "#0f7fb6"};
        grid-area: jornada;
        padding: 20px;
        min-height: 190px;
    }

    .status-pill {
        padding: 5px 9px;
        border-radius: 999px;
        background: var(--panel-accent-soft);
        color: var(--panel-accent);
        font-size: 0.68rem;
        font-weight: 900;
    }

    .jornada-status {
        justify-content: space-between;
        gap: 18px;
        min-height: 94px;
    }

    .jornada-main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .jornada-main span {
        color: var(--panel-accent);
        font-size: 0.78rem;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .jornada-main strong {
        font-size: clamp(1.05rem, 1.7vw, 1.45rem);
    }

    .ring-progress {
        position: relative;
        width: 94px;
        height: 94px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background:
            radial-gradient(circle closest-side, ${({theme}) => theme.bgcards} 72%, transparent 74%),
            conic-gradient(var(--panel-accent) var(--progress), var(--panel-border) 0);
        flex: 0 0 auto;
    }

    .ring-progress span {
        font-size: 0.95rem;
        font-weight: 950;
    }

    .jornada-bars {
        display: flex;
        align-items: flex-end;
        justify-content: flex-start;
        gap: 5px;
        min-height: 126px;
        margin: 8px 0 0;
        padding: 14px 14px 10px;
        border-radius: 8px;
        border: 1px solid var(--panel-border);
        background: var(--panel-item-bg);
        overflow-x: auto;
        overflow-y: hidden;
        cursor: grab;
        user-select: none;
        scroll-behavior: smooth;
        scrollbar-gutter: stable;
        touch-action: pan-y;
    }

    .jornada-bars.dragging {
        cursor: grabbing;
        scroll-behavior: auto;
    }

    .jornada-bars::-webkit-scrollbar {
        height: 4px;
    }

    .jornada-bars::-webkit-scrollbar-thumb {
        background: var(--panel-border);
        border-radius: 999px;
    }

    .jornada-bars button {
        flex: 0 0 30px;
        min-width: 30px;
        height: 104px;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--panel-muted);
        cursor: pointer;
        display: grid;
        grid-template-rows: 1fr auto;
        align-items: end;
        justify-items: center;
        gap: 5px;
        transition: color 0.2s ease, transform 0.2s ease;
    }

    .bar-track {
        width: 14px;
        height: 82px;
        display: flex;
        align-items: flex-end;
        border-radius: 999px;
        background: var(--panel-border);
        overflow: hidden;
        transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
    }

    .bar-track span {
        display: block;
        width: 100%;
        height: var(--bar-height);
        min-height: 3px;
        border-radius: inherit;
        background: var(--panel-accent-strong);
        transform-origin: bottom center;
        animation: barGrowIn 0.7s cubic-bezier(0.2, 0.85, 0.25, 1) both;
        animation-delay: calc(var(--bar-index) * 35ms);
        transition: height 0.2s ease, background 0.2s ease, filter 0.2s ease;
    }

    .jornada-bars button:hover {
        color: var(--panel-accent);
        transform: translateY(-2px);
    }

    .jornada-bars button:hover .bar-track {
        transform: translateY(-5px) scaleY(1.04);
        box-shadow: 0 10px 18px var(--panel-accent-soft);
    }

    .jornada-bars button:hover .bar-track span {
        filter: brightness(1.18);
    }

    .jornada-bars button.current .bar-track span {
        background: var(--panel-accent);
    }

    .jornada-bars button.playoff-phase .bar-track {
        width: 18px;
    }

    .jornada-bars button.playoff-phase .bar-track span {
        background: linear-gradient(180deg, var(--panel-accent), var(--panel-accent-strong));
    }

    .jornada-bars button.selected .bar-track {
        box-shadow: 0 0 0 2px var(--panel-accent-soft);
    }

    .jornada-bars button.selected small {
        color: var(--panel-accent);
    }

    .jornada-bars small {
        width: 100%;
        text-align: center;
        white-space: nowrap;
        font-size: 0.6rem;
        font-weight: 950;
        line-height: 1;
    }

    .mini-progress {
        height: 8px;
        margin: 10px 0 10px;
        border-radius: 999px;
        overflow: hidden;
        background: var(--panel-item-bg);
        border: 1px solid var(--panel-border);
    }

    .mini-progress span {
        display: block;
        height: 100%;
        min-width: 8px;
        max-width: 100%;
        background: var(--panel-accent);
        border-radius: inherit;
        transform-origin: left center;
        animation: progressFillIn 0.7s ease-out both;
    }

    .metrics-card {
        --panel-accent: ${({theme}) => theme.tournamentDashboard?.metrics?.accent || v.verde};
        --panel-accent-soft: ${({theme}) => theme.tournamentDashboard?.metrics?.accentSoft || `${v.verde}1d`};
        --panel-accent-strong: ${({theme}) => theme.tournamentDashboard?.metrics?.accentStrong || "#15803d"};
        --panel-warning: ${({theme}) => theme.tournamentDashboard?.metrics?.warning || "#f59e0b"};
        --panel-danger: ${({theme}) => theme.tournamentDashboard?.metrics?.danger || v.rojo};
        grid-area: metrics;
        padding: 20px;
        min-height: 190px;
        overflow: visible;
        position: relative;
        z-index: 5;
    }

    .metrics-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
    }

    .metric-item {
        min-width: 0;
        gap: 10px;
        padding: 10px;
        min-height: 46px;
        border-radius: 8px;
        background: var(--panel-item-bg);
        border: 1px solid var(--panel-border);
    }

    .metric-icon {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: var(--panel-accent-soft);
        color: var(--panel-accent);
        flex: 0 0 auto;
    }

    .metric-item div {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .metric-item strong {
        font-size: 0.84rem;
        font-weight: 950;
    }

    .metric-cards {
        align-items: stretch;
        gap: 0;
        padding: 0;
        overflow: hidden;
    }

    .card-half {
        min-width: 0;
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 1px;
        padding: 9px 10px;
    }

    .card-half + .card-half {
        border-left: 1px solid var(--panel-border);
    }

    .card-half small {
        color: var(--panel-muted);
        font-size: 0.64rem;
        font-weight: 900;
    }

    .card-half strong {
        font-size: 0.88rem;
        font-weight: 950;
    }

    .card-half span,
    .card-half em {
        color: var(--panel-muted);
        font-size: 0.64rem;
        font-style: normal;
        font-weight: 850;
    }

    .metric-leader-card {
        position: relative;
        display: grid;
        grid-template-columns: 32px minmax(0, 1fr);
        align-items: center;
        gap: 9px;
        min-height: 58px;
        padding: 8px 10px;
    }

    .metric-least-goals {
        padding-right: 30px;
        overflow: visible;
    }

    .metric-least-goals > div:first-child {
        position: absolute;
        top: 9px;
        right: 9px;
        z-index: 100;
    }

    .metric-least-goals > div:first-child > div {
        right: 0;
        left: auto;
        transform: none;
        width: 235px;
        max-width: min(235px, calc(100vw - 36px));
        white-space: normal;
        line-height: 1.35;
        text-align: left;
        z-index: 10000;
    }

    .metric-least-goals > div:first-child > div > div {
        left: auto;
        right: 6px;
        transform: none;
    }

    .metric-leader-card strong {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.86rem;
        line-height: 1.1;
    }

    .metric-leader-card span,
    .metric-leader-card em {
        color: var(--panel-muted);
        font-size: 0.61rem;
        font-style: normal;
        font-weight: 850;
    }

    .metric-leader-card small {
        font-size: 0.61rem;
    }

    .metric-leader-card small {
        white-space: nowrap;
    }

    .metric-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .leader-stats {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .metric-info {
        width: 18px;
        height: 18px;
        border: 0;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        color: var(--panel-accent);
        background: var(--panel-accent-soft);
        cursor: help;
        flex: 0 0 auto;
    }

    .metric-avatar {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: var(--panel-accent-soft);
        color: var(--panel-accent);
        flex: 0 0 auto;
        padding: 3px;
    }

    .player-avatar {
        border-radius: 50%;
        font-size: 16px;
    }

    .metric-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .team-avatar img {
        object-fit: contain;
    }

    .red-card strong {
        color: var(--panel-danger);
    }

    .yellow-card strong {
        color: var(--panel-warning);
    }

    .metric-item em {
        font-style: normal;
    }

    .empty-inline {
        grid-column: 1 / -1;
        padding: 24px;
        text-align: center;
        color: ${({theme}) => theme.text}80;
        font-size: 0.82rem;
        font-weight: 700;
    }

    @media (max-width: 980px) {
        grid-template-columns: 1fr;
        grid-template-areas:
            "hero"
            "rules"
            "jornada"
            "metrics";

        .metrics-grid {
            grid-template-columns: 1fr;
        }

        .jornada-bars {
            justify-content: flex-start;
        }

        .jornada-bars button {
            flex: 0 0 30px;
        }
    }

    @media (max-width: 620px) {
        gap: 14px;

        .active-hero,
        .rules-card,
        .jornada-card,
        .metrics-card {
            padding: 18px;
        }

        .hero-top,
        .section-heading {
            align-items: flex-start;
            flex-direction: column;
        }

        .progress-copy {
            text-align: left;
        }

        .jornada-status {
            align-items: flex-start;
            flex-direction: column;
        }

        .jornada-bars {
            min-height: 92px;
            padding: 10px 8px 8px;
        }

        .jornada-bars button {
            height: 70px;
        }

        .bar-track {
            height: 48px;
            width: 12px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .result-progress-track span,
        .bar-track span,
        .mini-progress span {
            animation: none;
        }

        .jornada-bars button,
        .bar-track {
            transition: none;
        }
    }
`;

const SetupTournamentPanel = styled(ActiveTournamentPanel)`
    grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr);
    grid-template-areas:
        "hero rules"
        "builder builder";

    .setup-hero {
        --panel-accent: ${({theme}) => theme.tournamentDashboard?.hero?.accent || v.colorPrincipal};
        --panel-accent-soft: ${({theme}) => theme.tournamentDashboard?.hero?.accentSoft || `${v.colorPrincipal}18`};
        --panel-accent-strong: ${({theme}) => theme.tournamentDashboard?.hero?.accentStrong || "#39d4ff"};
        --panel-glow: ${({theme}) => theme.tournamentDashboard?.hero?.glow || `${v.colorPrincipal}24`};
        grid-area: hero;
        min-height: 238px;
        padding: 22px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background:
            radial-gradient(circle at 88% 18%, var(--panel-glow), transparent 34%),
            var(--panel-surface);
    }

    .setup-builder {
        --panel-accent: ${({theme}) => theme.tournamentDashboard?.jornada?.accent || "#22d3ee"};
        --panel-accent-soft: ${({theme}) => theme.tournamentDashboard?.jornada?.accentSoft || "rgba(34, 211, 238, 0.16)"};
        grid-area: builder;
        padding: 20px;
        overflow: visible;
    }

    .setup-rules {
        --panel-accent: ${({theme}) => theme.tournamentDashboard?.rules?.accent || "#a78bfa"};
        --panel-accent-soft: ${({theme}) => theme.tournamentDashboard?.rules?.accentSoft || "rgba(167, 139, 250, 0.16)"};
        --panel-accent-strong: ${({theme}) => theme.tournamentDashboard?.rules?.accentStrong || "#c4b5fd"};
        grid-area: rules;
        padding: 18px;
    }

    .setup-rules .rules-list {
        gap: 9px;
    }

    .setup-rules .rule-item {
        min-height: 46px;
        padding: 8px 10px;
    }

    .setup-status {
        background: var(--panel-accent-soft);
        color: var(--panel-accent);
    }

    .setup-readiness {
        min-width: 230px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
    }

    .setup-readiness div {
        padding: 10px;
        border-radius: 8px;
        border: 1px solid var(--panel-border);
        background: var(--panel-item-bg);
    }

    .setup-readiness div.ready {
        border-color: var(--panel-accent-soft);
        background: linear-gradient(180deg, var(--panel-accent-soft), var(--panel-item-bg));
    }

    .setup-readiness span,
    .setup-readiness strong {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .setup-readiness span {
        color: var(--panel-muted);
        font-size: 0.62rem;
        font-weight: 900;
        text-transform: uppercase;
    }

    .setup-readiness strong {
        margin-top: 4px;
        font-size: 0.72rem;
        font-weight: 950;
    }

    .setup-step-progress {
        margin-top: 12px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
    }

    .setup-step-progress button {
        min-width: 0;
        border: 1px solid var(--panel-border);
        border-radius: 8px;
        background: var(--panel-item-bg);
        color: ${({theme}) => theme.text};
        padding: 9px 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        cursor: pointer;
        opacity: 0;
        animation: stepFadeIn 0.42s ease forwards;
        animation-delay: calc(var(--step-index) * 0.05s);
        transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, color 0.2s ease;
    }

    .setup-step-progress button:hover {
        transform: translateY(-2px);
        border-color: var(--panel-accent-soft);
        background: linear-gradient(180deg, var(--panel-accent-soft), var(--panel-item-bg));
    }

    .setup-step-progress button.ready {
        color: var(--panel-accent-strong);
        border-color: var(--panel-accent-soft);
        background: linear-gradient(180deg, var(--panel-accent-soft), var(--panel-item-bg));
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
    }

    .setup-step-progress span {
        display: grid;
        place-items: center;
        width: 22px;
        height: 22px;
        flex: 0 0 22px;
        border-radius: 7px;
        background: rgba(255,255,255,0.04);
        color: currentColor;
    }

    .setup-step-progress strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.68rem;
        font-weight: 950;
    }

    @keyframes stepFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .setup-builder .section-heading {
        margin-bottom: 16px;
    }

    .setup-builder .summary-col,
    .setup-builder .teams-col {
        min-width: 0;
    }

    .setup-builder h4 {
        color: ${({theme}) => theme.text};
        opacity: 0.76;
    }

    .setup-builder .summary-col > div,
    .setup-builder .teams-col > div {
        border-color: var(--panel-border);
    }

    @media (max-width: 980px) {
        grid-template-columns: 1fr;
        grid-template-areas:
            "hero"
            "rules"
            "builder";
    }

    @media (max-width: 620px) {
        .setup-hero,
        .setup-rules,
        .setup-builder {
            padding: 18px;
        }

        .setup-readiness {
            width: 100%;
            min-width: 0;
            grid-template-columns: 1fr;
        }

        .setup-step-progress {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
`;

const ModalContentStyled = styled.div` 
    display: flex; flex-direction: column; gap: 15px; padding-top: 10px; 
    .info-message { 
        background: rgba(28, 176, 246, 0.1); border-left: 4px solid ${({theme})=>theme.primary}; padding: 10px 15px; font-size: 13px; font-weight: 500;
        .icon{font-size:20px; color:${({theme})=>theme.primary};} 
    } 
    .modal-actions { display: flex; justify-content: flex-end; margin-top: 20px; padding-top:20px; border-top: 1px solid ${({theme})=>theme.bg4}; } 
`;

const ToggleContainer = styled.div`
    display: flex;
    align-items: center;
    background: ${({theme}) => theme.bg4};
    border-radius: 20px;
    padding: 4px;
    user-select: none;
`;

const ToggleOption = styled.div`
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    background: ${props => props.$active ? props.theme.primary : 'transparent'};
    color: ${props => props.$active ? '#ffffff' : props.theme.text};
    box-shadow: ${props => props.$active ? '0 2px 5px rgba(0,0,0,0.2)' : 'none'};
`;
