import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { supabase } from "../../../../supabase/supabase.config";
import { Toast } from "../../../../index";
import { JornadaPlanificacion } from "./JornadaPlanificacion"; 
import { JornadaResultados } from "./JornadaResultados";
import { guardarJornadaService, actualizarConfigTorneoService } from "../../../../services/torneos";
import { Device } from "../../../../styles/breakpoints"; 

export function TorneoJornadasTab({ activeTournament: initialTournament, participatingTeams, refreshStandings }) {
  const [activeTournament, setActiveTournament] = useState(initialTournament);
  const [jornadas, setJornadas] = useState([]);
  const [currentJornadaIndex, setCurrentJornadaIndex] = useState(0);
  const [currentMatches, setCurrentMatches] = useState([]); 
  const [globalPendingMatches, setGlobalPendingMatches] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  useEffect(() => {
    setActiveTournament(initialTournament);
  }, [initialTournament]);

  useEffect(() => {
    if (activeTournament) {
        fetchJornadas();
        fetchGlobalPendingMatches();
    }
  }, [activeTournament.id]);

  useEffect(() => {
    if (jornadas.length > 0 && jornadas[currentJornadaIndex]?.id) {
      fetchCurrentJornadaMatches(jornadas[currentJornadaIndex].id);
    } else {
      setCurrentMatches([]);
    }
  }, [currentJornadaIndex, jornadas]);

  const fetchJornadas = async () => {
    try {
      const { data, error } = await supabase
        .from('jornadas')
        .select('*')
        .eq('tournament_id', activeTournament.id)
        .order('id', { ascending: true });
      if (error) throw error;
      setJornadas(data);
      const activeIndex = data.findIndex(j => j.status !== 'Finalizada' && j.status !== 'Confirmada');
      if (activeIndex !== -1) setCurrentJornadaIndex(activeIndex);
      else if (data.length > 0) setCurrentJornadaIndex(data.length - 1);
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
    } finally { setLoading(false); }
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

  const handleConfirmJornada = async (dataToSave) => {
    setLoading(true);
    try {
        await guardarJornadaService(activeTournament.id, dataToSave);
        setToastConfig({ show: true, message: "Jornada confirmada exitosamente.", type: "success" });
        await fetchJornadas();
        fetchGlobalPendingMatches();
    } catch (error) { setToastConfig({ show: true, message: error.message, type: "error" }); }
    finally { setLoading(false); }
  };

  const handleSaveConfig = async (newConfig) => {
    setLoading(true);
    try {
        const baseJornadas = participatingTeams.length % 2 === 0 
            ? participatingTeams.length - 1 
            : participatingTeams.length;

        await actualizarConfigTorneoService(activeTournament.id, newConfig, baseJornadas);
        
        // CORRECCIÓN AQUÍ: Actualizamos 'start_date' en el estado local también
        setActiveTournament(prev => ({ 
            ...prev, 
            config: newConfig,
            start_date: newConfig.startDate || prev.start_date // <--- ACTUALIZACIÓN CRÍTICA
        }));
        
        setToastConfig({ show: true, message: "Cambios guardados exitosamente.", type: "success" });
        await fetchJornadas(); 
    } catch (error) {
        setToastConfig({ show: true, message: error.message, type: "error" });
    } finally { setLoading(false); }
  };

  const handleMatchUpdate = async (matchId, updates) => {
    try {
      const { error } = await supabase.from('matches').update(updates).eq('id', matchId);
      if (error) throw error;
      await new Promise(res => setTimeout(res, 80));
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
      {loading ? ( <LoadingBox>Procesando...</LoadingBox> ) : (
        <>
           {isPhaseAssignment ? (
              <JornadaPlanificacion 
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
              />
           ) : (
            <JornadaResultados 
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

const TabContainer = styled.div` 
    display: flex; 
    flex-direction: column; 
    gap: 20px; 
    width: 100%; 
    max-width: 100vw; 
    box-sizing: border-box;
    animation: ${fadeIn} 0.5s ease-out; 
    
    @media ${Device.tablet} {
    }
`;

const EmptyState = styled.div` padding: 40px; text-align: center; opacity: 0.6; `;
const LoadingBox = styled.div` padding: 50px; text-align: center; font-weight:600; `;