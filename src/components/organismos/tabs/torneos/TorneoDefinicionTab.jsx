import React, { useState, useMemo, useEffect } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { v } from "../../../../styles/variables";
import { 
    RiFileList3Line, RiCoinLine, RiGitMergeLine, RiInformationLine, RiDeleteBinLine, RiArrowRightLine,
    RiExchangeLine, RiFileWarningLine, RiBarChartGroupedLine, RiFlagLine, RiSettings3Line,
    RiCalendarEventLine, RiFootballLine, RiTimeLine, RiUserStarFill
} from "react-icons/ri";
import { IoMdStopwatch } from "react-icons/io";

import { Card, CardHeader, Btnsave, Modal, TabsNavigation, Toast } from "../../../../index";
import { ConfirmModal } from "../../ConfirmModal";
import { TorneoDashboard } from "./subcomponents/TorneoDashboard";
import { TabGeneral, TabScoring, TabFormat, TabGameRules } from "./subcomponents/TorneoFormTabs";
import { FixturePreviewModal } from "./subcomponents/FixturePreviewModal";
import { PlayoffAdvanceModal } from "./subcomponents/PlayoffAdvanceModal";
import { TournamentConfigModal } from "./subcomponents/TournamentConfigModal";
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
  buildNextPlayoffPreview,
  buildPhaseJornadaNames,
  getPendingPhaseCounts,
  getPlayoffSettings,
} from "../../../../utils/playoffUtils";
import { getStandingsViewStorageKey } from "../../../../hooks/useTorneoStandingsLogic";
import {
  isOfficialJornadaName,
  parseJornadaNumber,
} from "../../../../utils/jornadaUtils";
import { supabase } from "../../../../supabase/supabase.config";

export function TorneoDefinicionTab({ 
    form, onChange, onSubmit, loading, divisionName, activeTournament, 
    allTeams, participatingIds, onInclude, onExclude,
    isLoading, reglas, setReglas, onTournamentReset, leagueData,
    partidos = [], goleadores = []
}) {
  const navigate = useNavigate();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false); 
  const [showEndTournamentModal, setShowEndTournamentModal] = useState(false);
  const [showAdvanceWarningModal, setShowAdvanceWarningModal] = useState(false);
  const [showPlayoffPreviewModal, setShowPlayoffPreviewModal] = useState(false);
  const [playoffPreview, setPlayoffPreview] = useState(null);
  const [advanceWarning, setAdvanceWarning] = useState({ pendingMatches: 0, pendingJornadas: 0 });
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false);

  const [configTab, setConfigTab] = useState("general"); 
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  // ESTADO DEL SWITCH
  const [useLeagueRules, setUseLeagueRules] = useState(true);
  const [tournamentEvents, setTournamentEvents] = useState([]);

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

  const showToast = (message, type = 'error') => setToastConfig({ show: true, message, type });

  // 1. Extraemos la config de la liga
  const defaultLeagueConfig = useMemo(() => {
    const parsed = leagueData?.default_config ? (typeof leagueData.default_config === 'string' ? JSON.parse(leagueData.default_config) : leagueData.default_config) : {};
    return {
        minPlayers: parsed.minPlayers ?? 7,
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

  const handleToggleRules = (isLeague) => {
    setUseLeagueRules(isLeague);
    if (isLeague) {
        onChange({ target: { name: 'minPlayers', value: defaultLeagueConfig.minPlayers }});
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
  };

  const templateFields = [
      'minPlayers', 'maxPlayers', 'maxTeams', 
      'winPoints', 'drawPoints', 'lossPoints', 'tieBreakType'
  ];

  const handleFormChange = (e) => {
      if (e?.target?.name && templateFields.includes(e.target.name)) {
          setUseLeagueRules(false);
      }
      onChange(e); 
  };

  const handleReglasChange = (newReglas) => {
      setUseLeagueRules(false);
      setReglas(newReglas);
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

  const handleConfirmFixture = (fixtureData) => {
      setShowPreviewModal(false);
      onSubmit(fixtureData);
  };

  const handleSaveConfig = () => {
    const maxTeamsNum = parseInt(form.maxTeams || 0);
    if (maxTeamsNum < 2) {
        showToast("El número máximo de equipos debe ser al menos 2.", "error");
        return;
    }
    const draftData = { ...form, reglasDraft: reglas };
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
      try {
          await eliminarTorneoService(activeTournament.id);
          setShowEndTournamentModal(false);
          showToast("Torneo eliminado. Reiniciando vista...", "success");
          setIsExiting(true);
          setTimeout(() => {
              if(onTournamentReset) onTournamentReset(); 
              setIsExiting(false);
              setIsDeleting(false);
          }, 600);
      } catch {
          showToast("Error al finalizar el torneo. Revisa la consola.", "error");
          setIsDeleting(false);
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
              selectedJornadaView: activeTournament?.id && typeof window !== "undefined"
                  ? localStorage.getItem(getStandingsViewStorageKey(activeTournament.id)) || "recent"
                  : "recent",
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
  const activeJornadas = useMemo(() => {
      const jornadas = Array.isArray(activeTournament?.jornadas) ? activeTournament.jornadas : [];
      return jornadas
          .filter((jornada) => isOfficialJornadaName(jornada?.name))
          .map((jornada) => ({
              ...jornada,
              number: parseJornadaNumber(jornada.name, 0),
          }))
          .filter((jornada) => jornada.number > 0)
          .sort((a, b) => a.number - b.number);
  }, [activeTournament?.jornadas]);

  const tournamentProgress = useMemo(() => {
      const total = activeJornadas.length;
      const completed = activeJornadas.filter((jornada) => {
          const status = String(jornada.status || "").toLowerCase();
          return status.includes("confirmad") || status.includes("finaliz") || status.includes("complet");
      }).length;
      const current = total > 0 ? Math.max(1, Math.min(completed + 1, total)) : 1;
      const next = total > 0 ? Math.min(current + 1, total) : 1;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, current, next, percent };
  }, [activeJornadas]);

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

  const currentJornadaSummary = useMemo(() => {
      const currentJornada = activeJornadas.find((jornada) => {
          const status = String(jornada.status || "").toLowerCase();
          return !(status.includes("confirmad") || status.includes("finaliz") || status.includes("complet"));
      }) || activeJornadas[activeJornadas.length - 1] || null;

      const jornadaMatches = (partidos || []).filter((match) => {
          const matchJornadaName = match?.jornadas?.name || match?.jornada?.name || "";
          return currentJornada?.name && matchJornadaName === currentJornada.name;
      });

      const played = jornadaMatches.filter((match) => {
          const status = String(match.status || "").toLowerCase();
          return (
              status.includes("finaliz") ||
              status.includes("complet") ||
              status.includes("jugad") ||
              status.includes("termin") ||
              (match.goals1 !== null && match.goals1 !== undefined && match.goals2 !== null && match.goals2 !== undefined)
          );
      }).length;

      const total = jornadaMatches.length;
      const pending = Math.max(total - played, 0);
      const percent = total > 0 ? Math.round((played / total) * 100) : 0;

      return {
          name: currentJornada?.name || `Jornada ${tournamentProgress.current}`,
          played,
          total,
          pending,
          percent,
      };
  }, [activeJornadas, partidos, tournamentProgress]);

  const currentTopScorer = useMemo(() => {
      const scorer = Array.isArray(goleadores) ? goleadores[0] : null;
      if (!scorer) return { name: "Sin registro", goals: 0 };

      const name = [
          scorer.first_name,
          scorer.last_name,
      ].filter(Boolean).join(" ") || scorer.player_name || scorer.name || "Sin registro";

      return {
          name,
          goals: Number(scorer.goals || 0),
      };
  }, [goleadores]);

  const tournamentMetrics = useMemo(() => {
      const totalGoals = (partidos || []).reduce((acc, match) => {
          const goals1 = Number(match.goals1);
          const goals2 = Number(match.goals2);
          return acc + (Number.isFinite(goals1) ? goals1 : 0) + (Number.isFinite(goals2) ? goals2 : 0);
      }, 0);

      const redCards = tournamentEvents.filter((event) =>
          /red|roja/.test(String(event?.event_type || "").toLowerCase())
      ).length;

      return [
          { label: "Total de Goles", value: totalGoals, icon: <RiFootballLine /> },
          { label: "Tarjetas Rojas", value: redCards, icon: <RiFileWarningLine /> },
          { label: "Goleador Actual", value: currentTopScorer.name, detail: `${currentTopScorer.goals} goles`, icon: <RiUserStarFill /> },
      ];
  }, [partidos, tournamentEvents, currentTopScorer]);

  const activeRules = useMemo(() => ([
      {
          icon: <RiFootballLine />,
          title: "Plantillas",
          detail: `Min. ${tournamentConfigForUi.minPlayers ?? form.minPlayers ?? 7} / Max. ${tournamentConfigForUi.maxPlayers ?? form.maxPlayers ?? 25} jugadores`,
      },
      {
          icon: <RiTimeLine />,
          title: "Duracion de Partido",
          detail: `${tournamentConfigForUi.minutosPorTiempo ?? reglas?.minutosPorTiempo ?? 45}' por tiempo / ${tournamentConfigForUi.minutosDescanso ?? reglas?.minutosDescanso ?? 15}' descanso`,
      },
      {
          icon: <RiExchangeLine />,
          title: "Cambios",
          detail: `${tournamentConfigForUi.cambios || reglas?.cambios || "Ilimitados"}`,
      },
      {
          icon: <RiBarChartGroupedLine />,
          title: "Sistema de Puntos",
          detail: `V:${tournamentConfigForUi.winPoints ?? form.winPoints ?? 3} E:${tournamentConfigForUi.drawPoints ?? form.drawPoints ?? 1} D:${tournamentConfigForUi.lossPoints ?? form.lossPoints ?? 0}`,
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
      navigate("/torneos/jornadas");
  };

  return (
    <StyledCardWrapper>
        <Toast show={toastConfig.show} message={toastConfig.message} type={toastConfig.type} onClose={() => setToastConfig({ ...toastConfig, show: false })} />

        {activeTournament ? (
            <ActiveTournamentPanel $isExiting={isExiting}>
                <section className="active-hero active-card">
                    <div className="hero-top">
                        <div className="tournament-title">
                            <span className="icon-box"><v.iconocorona /></span>
                            <div>
                                <h2>{activeTournament.season || form.season || "Torneo actual"}</h2>
                                <span className="status-dot">En Curso</span>
                            </div>
                        </div>
                        <div className="progress-copy">
                            <span>Progreso del Torneo</span>
                            <strong>Jornada {tournamentProgress.current} <small>de {tournamentProgress.total || "--"}</small></strong>
                        </div>
                    </div>

                    <div className="progress-track-area">
                        <div className="progress-labels">
                            <span>Inicio</span>
                            <strong>{tournamentProgress.percent}% Completado</strong>
                            <span>Final</span>
                        </div>
                        <div className="progress-track">
                            <span style={{ width: `${tournamentProgress.percent}%` }} />
                        </div>
                    </div>

                    <div className="hero-actions">
                        <button className="primary-action" type="button" onClick={handleGoToJornadas}>
                            <RiArrowRightLine />
                            <span>
                                {tournamentProgress.total
                                    ? `Avanzar a Jornada ${tournamentProgress.next}`
                                    : "Gestionar Jornadas"}
                            </span>
                        </button>
                        {playoffEnabled && (
                            <button className="secondary-action" type="button" onClick={() => preparePlayoffPreview()} disabled={isAdvancingPhase}>
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
                        <h3><RiCalendarEventLine /> Estatus de la Jornada Actual</h3>
                        <span className="status-pill">{currentJornadaSummary.pending > 0 ? "En progreso" : "Lista"}</span>
                    </div>
                    <div className="jornada-status">
                        <div className="jornada-main">
                            <span>{currentJornadaSummary.name}</span>
                            <strong>{currentJornadaSummary.played} de {currentJornadaSummary.total} partidos jugados</strong>
                            <small>{currentJornadaSummary.pending > 0 ? `Faltan ${currentJornadaSummary.pending} resultados por reportar.` : "Todos los partidos estan reportados."}</small>
                        </div>
                        <div className="ring-progress" style={{ "--progress": `${currentJornadaSummary.percent}%` }}>
                            <span>{currentJornadaSummary.percent}%</span>
                        </div>
                    </div>
                    <div className="mini-progress">
                        <span style={{ width: `${currentJornadaSummary.percent}%` }} />
                    </div>
                </section>

                <section className="metrics-card active-card">
                    <div className="section-heading">
                        <h3><RiBarChartGroupedLine /> Metricas del Torneo</h3>
                    </div>
                    <div className="metrics-grid">
                        {tournamentMetrics.map((metric) => (
                            <div className="metric-item" key={metric.label}>
                                <span className="metric-icon">{metric.icon}</span>
                                <div>
                                    <small>{metric.label}</small>
                                    <strong title={String(metric.value)}>{metric.value}</strong>
                                    {metric.detail && <em>{metric.detail}</em>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </ActiveTournamentPanel>
        ) : (
        <Card maxWidth="1000px">
            <div style={{ marginBottom: '20px' }}>
                <CardHeader Icono={v.iconocorona} titulo="Resumen de Temporada" subtitulo={`División: ${divisionName || "..."}`} />
            </div>

            <TorneoDashboard 
                form={form} reglas={reglas} onEditConfig={() => setShowConfigModal(true)}
                participatingTeams={participatingTeams} excludedTeams={excludedTeams}
                onInclude={onInclude} onExclude={onExclude} isLoading={isLoading} minPlayers={form.minPlayers}
            />

            <div style={{ marginTop: '20px', borderTop: `1px solid ${v.bg4}`, paddingTop:'20px', display:'flex', justifyContent:'end' }}>
                <Btnsave titulo={loading ? "Creando..." : "Siguiente: Sorteo"} bgcolor={v.colorPrincipal} icono={<v.iconoguardar />} funcion={handlePreStartTournament} disabled={loading || !divisionName || participatingTeams.length < 2 || !form.season} />
            </div>
        </Card>
        )}

        <FixturePreviewModal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} onConfirm={handleConfirmFixture} teams={participatingTeams} config={form} isLoading={loading} />
        <ConfirmModal isOpen={showEndTournamentModal} onClose={() => setShowEndTournamentModal(false)} onConfirm={handleEndTournament} title="¿Finalizar Torneo Actual?" message="Esta acción borrará permanentemente todos los partidos del torneo actual." confirmText={isDeleting ? "Finalizando..." : "Sí, Finalizar"} confirmColor={v.rojo} />

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
                            {useLeagueRules 
                                ? "Reglas predeterminadas de la Liga aplicadas." 
                                : "Usando configuración personalizada."}
                        </span>
                    </div>
                    
                    <ToggleContainer>
                        <ToggleOption $active={useLeagueRules} onClick={() => handleToggleRules(true)}>
                            Reglas Liga
                        </ToggleOption>
                        <ToggleOption $active={!useLeagueRules} onClick={() => handleToggleRules(false)}>
                            Personalizado
                        </ToggleOption>
                    </ToggleContainer>
                </div>

                <TabsNavigation tabs={configTabList} activeTab={configTab} setActiveTab={setConfigTab} />
                
                <div style={{ minHeight: '280px' }}>
                    {configTab === 'general' && <TabGeneral form={form} onChange={handleFormChange} />}
                    {configTab === 'scoring' && <TabScoring form={form} onChange={handleFormChange} />}
                    {configTab === 'format' && <TabFormat form={form} onChange={onChange} />}
                    {configTab === 'gameRules' && <TabGameRules reglas={reglas} setReglas={handleReglasChange} />}
                </div>

                <div className="modal-actions">
                    <Btnsave titulo="Guardar Configuración" bgcolor={v.colorPrincipal} funcion={handleSaveConfig} />
                </div>
            </ModalContentStyled>
        </Modal>
        )}
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

    .active-card {
        background: ${({theme}) => theme.bgcards};
        border: 1px solid ${({theme}) => theme.bg4};
        border-radius: 8px;
        box-shadow: ${v.boxshadowGray};
        color: ${({theme}) => theme.text};
        overflow: hidden;
    }

    .active-hero {
        grid-area: hero;
        min-height: 232px;
        padding: 22px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background:
            radial-gradient(circle at 85% 18%, ${v.colorPrincipal}24, transparent 32%),
            ${({theme}) => theme.bgcards};
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
        background: ${v.colorPrincipal}18;
        color: ${v.colorPrincipal};
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
        background: ${v.verde}1d;
        color: ${v.verde};
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
        color: ${({theme}) => theme.text}9a;
        font-size: 0.72rem;
        font-weight: 800;
    }

    .progress-copy strong {
        font-size: 1.05rem;
    }

    .progress-copy small {
        color: ${({theme}) => theme.text}88;
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
        height: 8px;
        border-radius: 999px;
        background: ${({theme}) => theme.bgtotal};
        border: 1px solid ${({theme}) => theme.bg4};
        overflow: hidden;
    }

    .progress-track span {
        display: block;
        height: 100%;
        min-width: 8px;
        max-width: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, ${v.colorPrincipal}, #39d4ff);
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
        background: ${v.colorPrincipal};
    }

    .secondary-action {
        color: ${({theme}) => theme.text};
        background: ${({theme}) => theme.bgtotal};
        border: 1px solid ${({theme}) => theme.bg4};
    }

    .secondary-action.danger:hover {
        color: #fff;
        background: ${v.rojo};
        border-color: ${v.rojo};
    }

    .primary-action:hover,
    .secondary-action:hover,
    .section-heading button:hover {
        transform: translateY(-1px);
        filter: brightness(1.04);
    }

    .rules-card {
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
        color: ${({theme}) => theme.text}a8;
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
        background: ${({theme}) => theme.bgtotal};
        border: 1px solid ${({theme}) => theme.bg4};
    }

    .rule-icon {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        display: grid;
        place-items: center;
        color: ${v.colorPrincipal};
        background: ${v.colorPrincipal}16;
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
        grid-area: jornada;
        padding: 20px;
        min-height: 190px;
    }

    .status-pill {
        padding: 5px 9px;
        border-radius: 999px;
        background: ${v.colorPrincipal}16;
        color: ${v.colorPrincipal};
        font-size: 0.68rem;
        font-weight: 900;
    }

    .jornada-status {
        justify-content: space-between;
        gap: 18px;
        min-height: 112px;
    }

    .jornada-main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .jornada-main span {
        color: ${v.colorPrincipal};
        font-size: 0.78rem;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .jornada-main strong {
        font-size: clamp(1.05rem, 1.7vw, 1.45rem);
    }

    .ring-progress {
        width: 94px;
        height: 94px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background:
            radial-gradient(circle closest-side, ${({theme}) => theme.bgcards} 72%, transparent 74%),
            conic-gradient(${v.colorPrincipal} var(--progress), ${({theme}) => theme.bg4} 0);
        flex: 0 0 auto;
    }

    .ring-progress span {
        font-size: 0.95rem;
        font-weight: 950;
    }

    .mini-progress {
        height: 8px;
        border-radius: 999px;
        overflow: hidden;
        background: ${({theme}) => theme.bgtotal};
        border: 1px solid ${({theme}) => theme.bg4};
    }

    .mini-progress span {
        display: block;
        height: 100%;
        min-width: 8px;
        max-width: 100%;
        background: ${v.colorPrincipal};
        border-radius: inherit;
    }

    .metrics-card {
        grid-area: metrics;
        padding: 20px;
        min-height: 190px;
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
        background: ${({theme}) => theme.bgtotal};
        border: 1px solid ${({theme}) => theme.bg4};
    }

    .metric-icon {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: ${v.colorPrincipal}16;
        color: ${v.colorPrincipal};
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
