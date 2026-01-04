import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { supabase } from "../../../../supabase/supabase.config";
import { Toast } from "../../../../index";
import { JornadaPlanificacion } from "./JornadaPlanificacion"; 
import { JornadaResultados } from "./JornadaResultados";
import { guardarJornadaService } from "../../../../services/torneos";

export function TorneoJornadasTab({ activeTournament, participatingTeams }) {
  const [jornadas, setJornadas] = useState([]);
  const [currentJornadaIndex, setCurrentJornadaIndex] = useState(0);
  const [currentMatches, setCurrentMatches] = useState([]); 
  const [globalPendingMatches, setGlobalPendingMatches] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  useEffect(() => {
    if (activeTournament) {
        fetchJornadas();
        fetchGlobalPendingMatches();
    }
  }, [activeTournament]);

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
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchCurrentJornadaMatches = async (jornadaId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('jornada_id', jornadaId);
      if (error) throw error;
      setCurrentMatches(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalPendingMatches = async () => {
      try {
          // Solicitamos el nombre de la jornada para mostrarlo en la tarjeta
          const { data, error } = await supabase
            .from('matches')
            .select('*, jornadas!inner(id, name, tournament_id)') 
            .eq('jornadas.tournament_id', activeTournament.id)
            .eq('status', 'Pendiente');
            
          if(error) throw error;
          setGlobalPendingMatches(data);
      } catch (error) {
          console.error("Error cargando pendientes globales:", error);
      }
  };

  const handleConfirmJornada = async (dataToSave) => {
    setLoading(true);
    try {
        await guardarJornadaService(activeTournament.id, dataToSave);
        setToastConfig({ show: true, message: "Jornada confirmada exitosamente.", type: "success" });
        
        const updatedJornadas = [...jornadas];
        if(updatedJornadas[currentJornadaIndex]) {
            updatedJornadas[currentJornadaIndex].status = 'Confirmada';
            setJornadas(updatedJornadas);
        }
        
        fetchCurrentJornadaMatches(jornadas[currentJornadaIndex].id);
        fetchGlobalPendingMatches();
    } catch (error) {
        setToastConfig({ show: true, message: error.message, type: "error" });
    } finally {
        setLoading(false);
    }
  };

  const handleMatchUpdate = async (matchId, updates) => {
      try {
          const { error } = await supabase.from('matches').update(updates).eq('id', matchId);
          if (error) throw error;
          setToastConfig({ show: true, message: "Partido actualizado.", type: "success" });
          fetchCurrentJornadaMatches(jornadas[currentJornadaIndex].id);
          fetchGlobalPendingMatches();
      } catch (error) {
          setToastConfig({ show: true, message: "Error al actualizar.", type: "error" });
      }
  };

  if (!activeTournament) return <EmptyState>No hay torneo activo.</EmptyState>;
  if (jornadas.length === 0) return <EmptyState>Cargando estructura...</EmptyState>;

  const currentJornada = jornadas[currentJornadaIndex];
  const isPhaseAssignment = currentJornada.status !== 'Finalizada';
  const prevJornada = currentJornadaIndex > 0 ? jornadas[currentJornadaIndex - 1] : null;
  const canConfirm = !prevJornada || ['Confirmada', 'Finalizada'].includes(prevJornada.status);

  return (
    <TabContainer>
      <Toast 
          show={toastConfig.show} 
          message={toastConfig.message} 
          type={toastConfig.type} 
          onClose={() => setToastConfig({ ...toastConfig, show: false })}
      />

      {loading ? (
        <LoadingBox>Procesando...</LoadingBox>
      ) : (
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
              />
           ) : (
              <JornadaResultados 
                matches={currentMatches} 
                teams={participatingTeams}
                jornadaId={currentJornada.id}
                refreshMatches={() => fetchCurrentJornadaMatches(currentJornada.id)}
              />
           )}
        </>
      )}
    </TabContainer>
  );
}

// Estilos
const fadeIn = keyframes` from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } `;
const TabContainer = styled.div` display: flex; flex-direction: column; gap: 20px; width: 100%; animation: ${fadeIn} 0.5s ease-out; `;
const EmptyState = styled.div` padding: 40px; text-align: center; opacity: 0.6; `;
const LoadingBox = styled.div` padding: 50px; text-align: center; font-weight:600; `;