import React, { useState, useEffect, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { Toast } from "../../../../index";
import { JornadaPlanificacion } from "./JornadaPlanificacion"; 
import { JornadaResultados } from "./JornadaResultados";
import { FixturePreviewModal } from "./subcomponents/FixturePreviewModal";
import {
  actualizarConfigTorneoService,
  bulkUpdateJornadaFechas,
  bulkUpsertMatchesService,
  getAllMatchesByTournament,
  getJornadas,
  getMatchesByIdsService,
  getMatchesByJornadaService,
  getPendingMatchesByTournamentService,
  getTournamentConfigService,
  guardarJornadaService,
  updateMatchResultService,
} from "../../../../services/torneos";
import { addDaysToDate } from "../../../../utils/dateUtils";
import {
  isOfficialJornadaName,
  parseJornadaNumber,
  resolveRepositionMappings,
  sortJornadas,
} from "../../../../utils/jornadaUtils";

import { JornadaPlanificacionSkeleton } from "./planificacion/Skeletons";

export function TorneoJornadasTab({ activeTournament: initialTournament, participatingTeams, refreshStandings }) {
  const [activeTournament, setActiveTournament] = useState(initialTournament);
  const [jornadas, setJornadas] = useState([]);
  const [repositionMappings, setRepositionMappings] = useState([]);
  const [repositionMatchMappings, setRepositionMatchMappings] = useState([]);
  const [currentJornadaIndex, setCurrentJornadaIndex] = useState(0);
  const [currentMatches, setCurrentMatches] = useState([]); 
  const [globalPendingMatches, setGlobalPendingMatches] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });
  
  const [dataVersion, setDataVersion] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorData, setEditorData] = useState(null); 

  useEffect(() => {
    setActiveTournament(initialTournament);
  }, [initialTournament]);

  useEffect(() => {
    if (activeTournament?.id) {
        loadTournamentData();
    }
  }, [activeTournament?.id]);

  const resolveSelectedJornada = useCallback((sortedJornadas = [], preferredJornadaId = null) => {
    if (!Array.isArray(sortedJornadas) || sortedJornadas.length === 0) {
      return { selectedIndex: 0, selectedJornada: null };
    }

    if (preferredJornadaId) {
      const preferredIndex = sortedJornadas.findIndex(
        (jornada) => String(jornada.id) === String(preferredJornadaId)
      );
      if (preferredIndex !== -1) {
        return {
          selectedIndex: preferredIndex,
          selectedJornada: sortedJornadas[preferredIndex],
        };
      }
    }

    const currentVisibleJornadaId = jornadas[currentJornadaIndex]?.id || null;
    if (currentVisibleJornadaId) {
      const currentIndex = sortedJornadas.findIndex(
        (jornada) => String(jornada.id) === String(currentVisibleJornadaId)
      );
      if (currentIndex !== -1) {
        return {
          selectedIndex: currentIndex,
          selectedJornada: sortedJornadas[currentIndex],
        };
      }
    }

    const currentCandidate = sortedJornadas[currentJornadaIndex] || null;
    if (
      currentCandidate &&
      currentCandidate.status !== 'Finalizada' &&
      currentCandidate.status !== 'Confirmada'
    ) {
      return {
        selectedIndex: currentJornadaIndex,
        selectedJornada: currentCandidate,
      };
    }

    const activeIndex = sortedJornadas.findIndex(
      (jornada) => jornada.status !== 'Finalizada' && jornada.status !== 'Confirmada'
    );
    const selectedIndex = activeIndex !== -1 ? activeIndex : sortedJornadas.length - 1;

    return {
      selectedIndex,
      selectedJornada: sortedJornadas[selectedIndex] || null,
    };
  }, [currentJornadaIndex, jornadas]);

  const handleChangeJornada = async (newIndex) => {
      const targetJornada = jornadas[newIndex];
      if (!targetJornada?.id) return;

      setCurrentMatches([]); 
      setLoading(true);
      setCurrentJornadaIndex(newIndex);

      try {
        await fetchCurrentJornadaMatches(
          targetJornada.id,
          jornadas,
          repositionMappings,
          repositionMatchMappings
        );
      } finally {
        setLoading(false);
      }
  };

  const loadTournamentData = useCallback(async () => {
      setLoading(true);
      setJornadas([]);
      setCurrentMatches([]);
      setGlobalPendingMatches([]);

      try {
        const updatedMappings = await fetchTournamentConfig();
        const jornadasResult = await fetchJornadas();
        const sortedJornadas = jornadasResult?.jornadas || [];
        const selectedJornada = jornadasResult?.selectedJornada || null;

        await Promise.all([
          fetchGlobalPendingMatches(),
          selectedJornada?.id
            ? fetchCurrentJornadaMatches(
                selectedJornada.id,
                sortedJornadas,
                updatedMappings?.jornadaMappings || [],
                updatedMappings?.matchMappings || []
              )
            : Promise.resolve(),
        ]);
      } finally {
        setLoading(false);
      }
  }, [activeTournament?.id, currentJornadaIndex]);

  const fetchTournamentConfig = async () => {
    try {
      const nextConfig = await getTournamentConfigService(activeTournament.id);

      const nextMappings = Array.isArray(nextConfig.repositionMappings)
        ? nextConfig.repositionMappings
        : [];
      const nextMatchMappings = Array.isArray(nextConfig.repositionMatchMappings)
        ? nextConfig.repositionMatchMappings
        : [];

      setRepositionMappings(nextMappings);
      setRepositionMatchMappings(nextMatchMappings);

      setActiveTournament((prev) => ({
        ...prev,
        config: {
          ...(prev?.config || {}),
          ...nextConfig,
        },
      }));

      return {
        jornadaMappings: nextMappings,
        matchMappings: nextMatchMappings,
      };
    } catch (error) {
      console.error("Error fetchTournamentConfig:", error);
      setRepositionMappings([]);
      setRepositionMatchMappings([]);
      return {
        jornadaMappings: [],
        matchMappings: [],
      };
    }
  };

  const fetchJornadas = async (preferredJornadaId = null) => {
    try {
      const data = await getJornadas(activeTournament.id);
      const sorted = sortJornadas(data);
      setJornadas(sorted);

      const { selectedIndex, selectedJornada } = resolveSelectedJornada(sorted, preferredJornadaId);
      setCurrentJornadaIndex(selectedIndex);

      return {
        jornadas: sorted,
        selectedIndex,
        selectedJornada,
      };
    } catch (error) { console.error("Error fetchJornadas:", error); }
  };

  const fetchCurrentJornadaMatches = async (
    jornadaId,
    jornadasSource = jornadas,
    mappingsSource = repositionMappings,
    matchMappingsSource = repositionMatchMappings
  ) => {
    try {
      const selectedJornada =
        (jornadasSource || []).find((jornada) => String(jornada.id) === String(jornadaId)) ||
        null;
      const resolvedJornadaMappings = resolveRepositionMappings({
        jornadas: jornadasSource,
        configuredMappings: mappingsSource,
      });
      const normalizedMatchMappings = Array.isArray(matchMappingsSource)
        ? matchMappingsSource
        : [];

      const directMatches = await getMatchesByJornadaService(jornadaId);

      const extraMatchIds = normalizedMatchMappings
        .filter((mapping) => String(mapping?.originalJornadaId) === String(jornadaId))
        .map((mapping) => mapping.matchId)
        .filter(Boolean);
      const extraMatches = await getMatchesByIdsService(extraMatchIds);

      const mergedMatches = [...directMatches];
      extraMatches.forEach((match) => {
        if (!mergedMatches.some((current) => String(current.id) === String(match.id))) {
          mergedMatches.push(match);
        }
      });

      const enhancedMatches = mergedMatches.map((match) => {
        const matchMapping = normalizedMatchMappings.find(
          (mapping) => String(mapping?.matchId) === String(match.id)
        );

        if (matchMapping && String(matchMapping.originalJornadaId) === String(jornadaId)) {
          return {
            ...match,
            originJornada: matchMapping.originalJornadaName || selectedJornada?.name || "",
            originJornadaId: matchMapping.originalJornadaId || null,
            playedInJornada:
              matchMapping.repositionJornadaName || match.jornadas?.name || "",
            isReferenceOnly: String(match.jornada_id) !== String(jornadaId),
          };
        }

        if (matchMapping && String(matchMapping.repositionJornadaId) === String(jornadaId)) {
          return {
            ...match,
            originJornada: matchMapping.originalJornadaName || "",
            originJornadaId: matchMapping.originalJornadaId || null,
            isRepositionScheduled: true,
          };
        }

        const fallbackJornadaMapping = resolvedJornadaMappings.find(
          (mapping) => String(mapping?.repositionJornadaId) === String(match.jornada_id)
        );

        if (
          fallbackJornadaMapping &&
          String(fallbackJornadaMapping.repositionJornadaId) === String(jornadaId)
        ) {
          return {
            ...match,
            originJornada: fallbackJornadaMapping.originalJornadaName || "",
            originJornadaId: fallbackJornadaMapping.originalJornadaId || null,
            isRepositionScheduled: true,
          };
        }

        return match;
      });

      setCurrentMatches(enhancedMatches);
    } catch (e) { 
        console.error(e);
    }
  };

  const fetchGlobalPendingMatches = async () => {
      try {
          const data = await getPendingMatchesByTournamentService(activeTournament.id);

          // Se mantiene la busqueda de Programados sin fecha para que la UI 
          // los detecte de tu base de datos y no se vuelvan invisibles.
          const realPendingMatches = data.filter(m => 
              m.status === 'Pendiente' || (m.status === 'Programado' && !m.date)
          );

          setGlobalPendingMatches(realPendingMatches);
      } catch (error) { console.error("Error fetchGlobalPending:", error); }
  };

  const handleOpenFixtureEditor = async () => {
      setLoading(true);
      try {
          const allMatches = await getAllMatchesByTournament(activeTournament.id);

          setEditorData({
              matches: allMatches,
              jornadas: jornadas,
              repositionMappings,
              repositionMatchMappings,
          });
          setIsEditorOpen(true);

      } catch (error) {
          setToastConfig({ show: true, message: "Error cargando fixture: " + error.message, type: "error" });
      } finally {
          setLoading(false);
      }
  };

  const handleConfirmFixtureUpdate = async (updatedMatches) => {
      setLoading(true);
      try {
        const updates = [];
        const originalMap = new Map(editorData.matches.map(m => [m.id, m]));

        updatedMatches.forEach(m => {
            if (m.dbId && !m.roundLocked) {
                const targetJornada = jornadas[m.jornadaIndex];
                const original = originalMap.get(m.dbId);

                if (targetJornada && original) {
                    if (original.jornada_id !== targetJornada.id) {
                        updates.push({
                            id: m.dbId,
                            jornada_id: targetJornada.id,
                            date: null, 
                            status: 'Pendiente' 
                        });
                    }
                }
            }
        });

        if(updates.length > 0) {
            await bulkUpsertMatchesService(updates);
            setToastConfig({ show: true, message: "Fixture reorganizado correctamente.", type: "success" });
            
            await fetchGlobalPendingMatches(); 
            if (jornadas[currentJornadaIndex]?.id) {
                await fetchCurrentJornadaMatches(jornadas[currentJornadaIndex].id);
            }

            setDataVersion(prev => prev + 1);
            
        } else {
            setToastConfig({ show: true, message: "No se detectaron cambios de jornada.", type: "warning" });
        }

        setIsEditorOpen(false);

      } catch (error) {
          setToastConfig({ show: true, message: "Error guardando cambios: " + error.message, type: "error" });
      } finally {
          setLoading(false);
      }
  };

  const handleCascadingDateUpdate = async (newStart, newEnd) => {
      setLoading(true);
      try {
          const currentJornada = jornadas[currentJornadaIndex];
          
          let daysDiff = 0;
          if (currentJornada.start_date && newStart) {
              const oldDate = new Date(currentJornada.start_date);
              const newDate = new Date(newStart);
              const diffTime = newDate - oldDate;
              daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          }

          const updates = [];

          updates.push({
              id: currentJornada.id,
              tournament_id: activeTournament.id, 
              name: currentJornada.name,
              status: currentJornada.status,
              start_date: newStart,
              end_date: newEnd
          });

          if (daysDiff !== 0) {
              for (let i = currentJornadaIndex + 1; i < jornadas.length; i++) {
                  const j = jornadas[i];
                  if (j.start_date && j.end_date) {
                      updates.push({
                          id: j.id,
                          tournament_id: activeTournament.id,
                          name: j.name,
                          status: j.status,
                          start_date: addDaysToDate(j.start_date, daysDiff),
                          end_date: addDaysToDate(j.end_date, daysDiff)
                      });
                  }
              }
          }

          await bulkUpdateJornadaFechas(updates);

          setToastConfig({ show: true, message: `Fechas actualizadas. Se recorrieron ${updates.length - 1} jornadas futuras.`, type: "success" });
          await fetchJornadas(); 
          
      } catch (error) {
          console.error(error);
          setToastConfig({ show: true, message: "Error actualizando fechas: " + error.message, type: "error" });
      } finally {
          setLoading(false);
      }
  };

  const handleConfirmJornada = async (dataToSave) => {
    setLoading(true);
    try {
        const preservedJornadaId = jornadas[currentJornadaIndex]?.id || null;
        await guardarJornadaService(activeTournament.id, dataToSave);
        setToastConfig({ show: true, message: "Jornada confirmada exitosamente.", type: "success" });

        const updatedMappings = await fetchTournamentConfig();
        const updatedJornadasResult = await fetchJornadas(preservedJornadaId);
        const updatedJornadas = updatedJornadasResult?.jornadas || [];
        await fetchGlobalPendingMatches();

        const jornadaToRefresh =
          updatedJornadasResult?.selectedJornada ||
          updatedJornadas.find((jornada) => String(jornada.id) === String(preservedJornadaId)) ||
          updatedJornadas[currentJornadaIndex];

        if (jornadaToRefresh?.id) {
          await fetchCurrentJornadaMatches(
            jornadaToRefresh.id,
            updatedJornadas,
            updatedMappings?.jornadaMappings || [],
            updatedMappings?.matchMappings || []
          );
        }
        
        setDataVersion(prev => prev + 1);
        if (refreshStandings) await refreshStandings();
        
    } catch (error) { 
        setToastConfig({ show: true, message: error.message, type: "error" }); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleSaveConfig = async (newConfig) => {
    setLoading(true);
    try {
        const baseJornadas = participatingTeams.length % 2 === 0 
            ? participatingTeams.length - 1 
            : participatingTeams.length;

        if (newConfig.startDate && newConfig.startDate !== activeTournament.start_date) {
            
            const isFirstConfirmed = jornadas.some(j => j.name === 'Jornada 1' && j.status === 'Confirmada');
            
            if (!isFirstConfirmed) {
                const updates = jornadas.map((j) => {
                    if (!isOfficialJornadaName(j.name)) return null;

                    const num = parseJornadaNumber(j.name, 0);
                    if (num === 0) return null;

                    const weeksOffset = (num - 1) * 7;
                    const newStart = addDaysToDate(newConfig.startDate, weeksOffset);
                    const newEnd = addDaysToDate(newStart, 6); 

                    return {
                        id: j.id,
                        tournament_id: activeTournament.id,
                        name: j.name,
                        status: j.status,
                        start_date: newStart,
                        end_date: newEnd
                    };
                }).filter(Boolean);

                if (updates.length > 0) {
                    await bulkUpdateJornadaFechas(updates);
                    setToastConfig(prev => ({ ...prev, show: true, message: "Fechas de jornadas recalculadas por cambio de inicio.", type: "success" }));
                }
            }
        }

        await actualizarConfigTorneoService(activeTournament.id, newConfig, baseJornadas);
        
        setActiveTournament(prev => ({ 
            ...prev, 
            config: newConfig,
            start_date: newConfig.startDate || prev.start_date 
        }));
        
        if (!toastConfig.show) { 
            setToastConfig({ show: true, message: "Cambios guardados exitosamente.", type: "success" });
        }
        
        await fetchJornadas(); 
    } catch (error) {
        setToastConfig({ show: true, message: error.message, type: "error" });
    } finally { setLoading(false); }
  };

  const handleMatchUpdate = async (matchId, updates) => {
    await updateMatchResultService(matchId, updates);
    await new Promise(res => setTimeout(res, 100));
    if (refreshStandings) await refreshStandings(); 
    await fetchCurrentJornadaMatches(jornadas[currentJornadaIndex].id);
    await fetchGlobalPendingMatches();
  };

  if (!activeTournament) return <EmptyState>No hay torneo activo.</EmptyState>;
  
  if (jornadas.length === 0 || (loading && !isEditorOpen)) {
      return (
        <TabContainer>
             <JornadaPlanificacionSkeleton />
        </TabContainer>
      );
  }

  const currentJornada = jornadas[currentJornadaIndex];
  const isPhaseAssignment = currentJornada.status !== 'Finalizada'; 
  const prevJornada = currentJornadaIndex > 0 ? jornadas[currentJornadaIndex - 1] : null;
  const canConfirm = !prevJornada || ['Confirmada', 'Finalizada'].includes(prevJornada.status);

  return (
    <TabContainer>
      <Toast show={toastConfig.show} message={toastConfig.message} type={toastConfig.type} onClose={() => setToastConfig({ ...toastConfig, show: false })} />
      
      <FixturePreviewModal 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        teams={participatingTeams}
        config={activeTournament.config}
        onConfirm={handleConfirmFixtureUpdate}
        isLoading={loading}
        existingData={editorData} 
      />

       {isPhaseAssignment ? (
          <JornadaPlanificacion 
            key={`plan-${currentJornada.id}-${dataVersion}`} 
            matchesDB={currentMatches} 
            globalPendingMatches={globalPendingMatches}
            teams={participatingTeams} 
            jornadaIndex={currentJornadaIndex} 
            activeTournament={activeTournament} 
            jornadaData={currentJornada}
            onConfirm={handleConfirmJornada} 
            onChangeJornada={handleChangeJornada}
            totalJornadas={jornadas.length} 
            onMatchUpdate={handleMatchUpdate}
            canConfirm={canConfirm} 
            onSaveConfig={handleSaveConfig}
            onEditFixture={handleOpenFixtureEditor}
            isTournamentActive={true} 
            dataVersion={dataVersion}
            jornadas={jornadas} 
            onUpdateDates={handleCascadingDateUpdate}
          />
       ) : (
        <JornadaResultados 
            key={`res-${currentJornada.id}-${dataVersion}`}
            matches={currentMatches} 
            teams={participatingTeams} 
            jornadaId={currentJornada.id} 
            activeTournament={activeTournament}
            refreshMatches={() => {
                fetchCurrentJornadaMatches(currentJornada.id);
                if(refreshStandings) refreshStandings(); 
            }} 
        />
       )}
    </TabContainer>
  );
}

const fadeIn = keyframes` from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } `;
const TabContainer = styled.div`
    display: flex; 
    flex-direction: column; 
    gap: 20px; 
    width: 100%; 
    flex: 1 1 auto;
    min-height: 0;
    max-width: 100vw; 
    box-sizing: border-box; 
    animation: ${fadeIn} 0.5s ease-out;
    overflow-x: hidden; 
`;
const EmptyState = styled.div` padding: 40px; text-align: center; opacity: 0.6; `;
