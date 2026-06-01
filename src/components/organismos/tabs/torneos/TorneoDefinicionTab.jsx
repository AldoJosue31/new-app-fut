import React, { useState, useMemo, useEffect } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { v } from "../../../../styles/variables";
import { 
    RiFileList3Line, RiCoinLine, RiGitMergeLine, RiInformationLine, RiDeleteBinLine, RiArrowRightLine,
    RiSearchLine, RiExchangeLine, RiFileWarningLine, RiBarChartGroupedLine, RiFlagLine
} from "react-icons/ri";
import { IoMdStopwatch } from "react-icons/io";

import { Card, CardHeader, Btnsave, Modal, TabsNavigation, Toast } from "../../../../index";
import { ConfirmModal } from "../../ConfirmModal";
import { TorneoDashboard } from "./subcomponents/TorneoDashboard";
import { TabGeneral, TabScoring, TabFormat, TabGameRules } from "./subcomponents/TorneoFormTabs";
import { FixturePreviewModal } from "./subcomponents/FixturePreviewModal";
import { PlayoffAdvanceModal } from "./subcomponents/PlayoffAdvanceModal";
import {
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
import {
  buildTorneoStandingsSnapshot,
  getStandingsViewStorageKey,
} from "../../../../hooks/useTorneoStandingsLogic";
import {
  isOfficialJornadaName,
  parseJornadaNumber,
} from "../../../../utils/jornadaUtils";

export function TorneoDefinicionTab({ 
    form, onChange, onSubmit, loading, divisionName, activeTournament, 
    allTeams, participatingIds, onInclude, onExclude,
    isLoading, reglas, setReglas, onTournamentReset, leagueData,
    standings = [], partidos = []
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
  const [teamSearch, setTeamSearch] = useState("");

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

  const standingsSnapshot = useMemo(() => {
      if (!activeTournament) return null;

      try {
          return buildTorneoStandingsSnapshot({
              torneo: activeTournament,
              equipos: participatingTeams,
              partidos,
              jornadasProp: activeJornadas,
              reglas,
              selectedJornadaView: activeTournament?.id && typeof window !== "undefined"
                  ? localStorage.getItem(getStandingsViewStorageKey(activeTournament.id)) || "recent"
                  : "recent",
          });
      } catch (error) {
          console.warn("No se pudo calcular tabla para resumen activo:", error);
          return null;
      }
  }, [activeTournament, activeJornadas, participatingTeams, partidos, reglas]);

  const topGeneralRows = useMemo(() => {
      const source = standingsSnapshot?.tablaGeneral?.length ? standingsSnapshot.tablaGeneral : standings;
      return (Array.isArray(source) ? source : []).slice(0, 5).map((row, index) => ({
          id: row.id || `${row.nombre || row.name}-${index}`,
          rank: index + 1,
          name: row.nombre || row.name || row.equipo || "Equipo",
          pj: row.pj ?? row.PJ ?? 0,
          dif: row.dg ?? row.dif ?? row.DIF ?? 0,
          pts: row.pts ?? row.PTS ?? 0,
      }));
  }, [standingsSnapshot?.tablaGeneral, standings]);

  const filteredParticipatingTeams = useMemo(() => {
      const query = teamSearch.trim().toLowerCase();
      if (!query) return participatingTeams;

      return participatingTeams.filter((team) =>
          String(team.name || "").toLowerCase().includes(query)
      );
  }, [participatingTeams, teamSearch]);

  const activeRules = useMemo(() => ([
      {
          icon: <RiExchangeLine />,
          title: "Sustituciones",
          detail: `${tournamentConfigForUi.cambios || reglas?.cambios || "Ilimitados"}`,
      },
      {
          icon: <RiFileWarningLine />,
          title: "Acumulacion Tarjetas",
          detail: tournamentConfigForUi.suspensionYellowCards
              ? `Suspension tras ${tournamentConfigForUi.suspensionYellowCards} amarillas`
              : "Suspension tras 5 amarillas",
      },
      {
          icon: <RiBarChartGroupedLine />,
          title: "Sistema Puntos",
          detail: `V: ${tournamentConfigForUi.winPoints ?? form.winPoints ?? 3} | E: ${tournamentConfigForUi.drawPoints ?? form.drawPoints ?? 1} | D: ${tournamentConfigForUi.lossPoints ?? form.lossPoints ?? 0}`,
      },
  ]), [tournamentConfigForUi, reglas?.cambios, form.winPoints, form.drawPoints, form.lossPoints]);

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
                            <RiInformationLine />
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

                <section className="participants-card active-card">
                    <div className="section-heading">
                        <h3><v.iconocorona /> Equipos Participantes ({participatingTeams.length})</h3>
                        <label className="search-box">
                            <RiSearchLine />
                            <input
                                value={teamSearch}
                                onChange={(event) => setTeamSearch(event.target.value)}
                                placeholder="Buscar equipo..."
                            />
                        </label>
                    </div>
                    <div className="teams-grid">
                        {filteredParticipatingTeams.map((team, index) => (
                            <div className="team-chip" key={team.id}>
                                <span className="team-rank">{participatingTeams.findIndex((item) => item.id === team.id) + 1 || index + 1}</span>
                                <span className="team-name" title={team.name}>{team.name}</span>
                            </div>
                        ))}
                        {filteredParticipatingTeams.length === 0 && (
                            <div className="empty-inline">No se encontro ningun equipo.</div>
                        )}
                    </div>
                </section>

                <section className="standings-card active-card">
                    <div className="section-heading">
                        <h3><RiBarChartGroupedLine /> Top 5 - General</h3>
                        <button className="text-link" type="button" onClick={() => navigate("/torneos/standings")}>
                            Ver Completa
                        </button>
                    </div>
                    <div className="mini-table">
                        <div className="mini-head">
                            <span>Equipo</span>
                            <span>PJ</span>
                            <span>DIF</span>
                            <span>PTS</span>
                        </div>
                        {topGeneralRows.map((row) => (
                            <div className="mini-row" key={row.id}>
                                <div className="mini-team">
                                    <span className={row.rank === 1 ? "rank leader" : "rank"}>{row.rank}</span>
                                    <strong title={row.name}>{row.name}</strong>
                                </div>
                                <span>{row.pj}</span>
                                <span>{Number(row.dif) > 0 ? `+${row.dif}` : row.dif}</span>
                                <span className="points">{row.pts}</span>
                            </div>
                        ))}
                        {topGeneralRows.length === 0 && (
                            <div className="empty-inline">La tabla general aun no tiene datos.</div>
                        )}
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
        "teams standings";
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
        min-height: 260px;
        padding: 26px;
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
    .search-box,
    .rule-item,
    .mini-team {
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
    .mini-head {
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
        margin: 26px 0;
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
        padding: 22px;
    }

    .section-heading {
        margin-bottom: 18px;
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
        gap: 12px;
    }

    .rule-item {
        gap: 12px;
        min-height: 58px;
        padding: 12px;
        border-radius: 8px;
        background: ${({theme}) => theme.bgtotal};
        border: 1px solid ${({theme}) => theme.bg4};
    }

    .rule-icon {
        width: 34px;
        height: 34px;
        border-radius: 8px;
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
        gap: 3px;
    }

    .rule-item strong,
    .team-name,
    .mini-row strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .rule-item strong {
        font-size: 0.82rem;
    }

    .participants-card {
        grid-area: teams;
        padding: 24px;
        min-height: 340px;
    }

    .search-box {
        width: min(230px, 45%);
        gap: 8px;
        padding: 0 12px;
        height: 38px;
        border-radius: 8px;
        background: ${({theme}) => theme.bgtotal};
        border: 1px solid ${({theme}) => theme.bg4};
        color: ${({theme}) => theme.text}8c;
    }

    .search-box input {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: ${({theme}) => theme.text};
        font-weight: 700;
        font-size: 0.78rem;
    }

    .teams-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
    }

    .team-chip {
        min-width: 0;
        height: 48px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 14px;
        border-radius: 8px;
        background: ${({theme}) => theme.bgtotal};
        border: 1px solid ${({theme}) => theme.bg4};
    }

    .team-rank,
    .rank {
        display: inline-grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: ${({theme}) => theme.bg4};
        color: ${({theme}) => theme.text}b8;
        font-size: 0.72rem;
        font-weight: 900;
        flex: 0 0 auto;
    }

    .team-name {
        min-width: 0;
        font-size: 0.82rem;
        font-weight: 800;
    }

    .standings-card {
        grid-area: standings;
        padding: 22px;
        min-height: 340px;
    }

    .text-link {
        width: auto;
        height: auto;
        color: ${v.colorPrincipal};
        font-size: 0.68rem;
        font-weight: 900;
        background: transparent;
        white-space: nowrap;
    }

    .mini-table {
        display: grid;
        gap: 8px;
    }

    .mini-head,
    .mini-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 34px 42px 42px;
        align-items: center;
        gap: 8px;
    }

    .mini-head span:not(:first-child),
    .mini-row > span {
        text-align: center;
    }

    .mini-row {
        min-height: 36px;
        font-size: 0.78rem;
        font-weight: 800;
    }

    .mini-team {
        min-width: 0;
        gap: 9px;
    }

    .rank {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        font-size: 0.66rem;
    }

    .rank.leader {
        color: #fff;
        background: ${v.verde};
    }

    .mini-row strong {
        min-width: 0;
        font-size: 0.76rem;
    }

    .points {
        color: ${v.colorPrincipal};
        font-weight: 950;
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
            "teams"
            "standings";

        .teams-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 620px) {
        gap: 14px;

        .active-hero,
        .rules-card,
        .participants-card,
        .standings-card {
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

        .search-box {
            width: 100%;
        }

        .teams-grid {
            grid-template-columns: 1fr;
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
