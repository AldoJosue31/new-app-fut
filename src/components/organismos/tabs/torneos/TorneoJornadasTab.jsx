import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { supabase } from "../../../../supabase/supabase.config";
import { Toast } from "../../../../index";
import { JornadaPlanificacion } from "./JornadaPlanificacion"; 
import { JornadaResultados } from "./JornadaResultados";
import { FixturePreviewModal } from "./subcomponents/FixturePreviewModal";
import { guardarJornadaService, actualizarConfigTorneoService, bulkUpdateJornadaFechas } from "../../../../services/torneos";
import { addDaysToDate } from "../../../../utils/dateUtils";

export function TorneoJornadasTab({ activeTournament: initialTournament, participatingTeams, refreshStandings }) {
  const [activeTournament, setActiveTournament] = useState(initialTournament);
  const [jornadas, setJornadas] = useState([]);
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

  useEffect(() => {
    if (jornadas.length > 0 && jornadas[currentJornadaIndex]?.id) {
      fetchCurrentJornadaMatches(jornadas[currentJornadaIndex].id);
    } else {
      setCurrentMatches([]);
    }
  }, [currentJornadaIndex, jornadas]);

  const loadTournamentData = async () => {
      await fetchJornadas();
      await fetchGlobalPendingMatches();
  };

  const fetchJornadas = async () => {
    try {
      const { data, error } = await supabase
        .from('jornadas')
        .select('*')
        .eq('tournament_id', activeTournament.id)
        .order('id', { ascending: true });
      if (error) throw error;
      
      const sorted = data.sort((a, b) => {
          const numA = parseInt(a.name.replace(/\D/g, '')) || a.id;
          const numB = parseInt(b.name.replace(/\D/g, '')) || b.id;
          return numA - numB;
      });
      setJornadas(sorted);

      if (sorted.length > 0 && currentJornadaIndex === 0) {
        const activeIndex = sorted.findIndex(j => j.status !== 'Finalizada' && j.status !== 'Confirmada');
        if (activeIndex !== -1) setCurrentJornadaIndex(activeIndex);
        else setCurrentJornadaIndex(sorted.length - 1);
      }
    } catch (error) { console.error("Error fetchJornadas:", error); }
  };

  const fetchCurrentJornadaMatches = async (jornadaId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*, jornadas(name)')
        .eq('jornada_id', jornadaId);
      if (error) throw error;
      setCurrentMatches(data);
    } catch (e) { 
        console.error(e);
    } finally { 
        setLoading(false); 
    }
  };

  const fetchGlobalPendingMatches = async () => {
      try {
          const { data, error } = await supabase
            .from('matches')
            .select('*, jornadas!inner(id, name, tournament_id)') 
            .eq('jornadas.tournament_id', activeTournament.id)
            .eq('status', 'Pendiente'); 
          if(error) throw error;
          setGlobalPendingMatches(data);
      } catch (error) { console.error("Error fetchGlobalPending:", error); }
  };

  const handleOpenFixtureEditor = async () => {
      setLoading(true);
      try {
          const { data: allMatches, error } = await supabase
            .from('matches')
            .select('*')
            .in('jornada_id', jornadas.map(j => j.id));
          
          if(error) throw error;

          setEditorData({
              matches: allMatches,
              jornadas: jornadas 
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
            const { error } = await supabase
                .from('matches')
                .upsert(updates, { onConflict: 'id' }); 

            if (error) throw error;
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
        await guardarJornadaService(activeTournament.id, dataToSave);
        setToastConfig({ show: true, message: "Jornada confirmada exitosamente.", type: "success" });

        await Promise.all([
            fetchJornadas(), 
            fetchGlobalPendingMatches(), 
            fetchCurrentJornadaMatches(jornadas[currentJornadaIndex].id) 
        ]);
        
        setDataVersion(prev => prev + 1);
        
    } catch (error) { 
        setToastConfig({ show: true, message: error.message, type: "error" }); 
    } finally { 
        setLoading(false); 
    }
  };

  // --- LÓGICA CLAVE DE CONFIGURACIÓN ---
  const handleSaveConfig = async (newConfig) => {
    setLoading(true);
    try {
        const baseJornadas = participatingTeams.length % 2 === 0 
            ? participatingTeams.length - 1 
            : participatingTeams.length;

        // 1. Detectar si la fecha de inicio cambió
        if (newConfig.startDate && newConfig.startDate !== activeTournament.start_date) {
            
            // 2. Solo aplicamos cambios masivos si la Jornada 1 NO está confirmada
            const isFirstConfirmed = jornadas.some(j => j.name === 'Jornada 1' && j.status === 'Confirmada');
            
            if (!isFirstConfirmed) {
                // 3. Recalculamos matemáticamente todas las fechas: J1=Inicio, J2=Inicio+7, etc.
                const updates = jornadas.map((j) => {
                    const num = parseInt(j.name.replace(/\D/g, '')) || 0;
                    if (num === 0) return null;

                    const weeksOffset = (num - 1) * 7;
                    const newStart = addDaysToDate(newConfig.startDate, weeksOffset);
                    const newEnd = addDaysToDate(newStart, 6); // Lunes -> Domingo

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
        
        if (!toastConfig.show) { // Evitar sobrescribir el toast de fechas si ya salió
            setToastConfig({ show: true, message: "Cambios guardados exitosamente.", type: "success" });
        }
        
        await fetchJornadas(); 
    } catch (error) {
        setToastConfig({ show: true, message: error.message, type: "error" });
    } finally { setLoading(false); }
  };

  const handleMatchUpdate = async (matchId, updates) => {
    try {
      const { error } = await supabase.from('matches').update(updates).eq('id', matchId);
      if (error) throw error;
      await new Promise(res => setTimeout(res, 100));
      if (refreshStandings) await refreshStandings(); 
      await fetchCurrentJornadaMatches(jornadas[currentJornadaIndex].id);
      await fetchGlobalPendingMatches();
    } catch (e) { throw e; }
  };

  if (!activeTournament) return <EmptyState>No hay torneo activo.</EmptyState>;
  if (jornadas.length === 0) return <EmptyState>Cargando estructura...</EmptyState>;

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

      {loading && !isEditorOpen ? ( <LoadingBox>Sincronizando datos...</LoadingBox> ) : (
        <>
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
                onChangeJornada={(idx) => setCurrentJornadaIndex(idx)}
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
        </>
      )}
    </TabContainer>
  );
}

const fadeIn = keyframes` from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } `;
const TabContainer = styled.div`display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 100vw; box-sizing: border-box; animation: ${fadeIn} 0.5s ease-out;`;
const EmptyState = styled.div` padding: 40px; text-align: center; opacity: 0.6; `;
const LoadingBox = styled.div` padding: 50px; text-align: center; font-weight:600; color: #7f8c8d; `;