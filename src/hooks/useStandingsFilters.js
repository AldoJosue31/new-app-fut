import { useState, useMemo } from 'react';

export const useStandingsFilters = (partidos = []) => {
  const [selectedJornadaView, setSelectedJornadaView] = useState('recent');

  const { currentJornada, lastConfirmedJornada, allJornadas } = useMemo(() => {
    if (!partidos || partidos.length === 0) {
      return { currentJornada: 1, lastConfirmedJornada: null, allJornadas: [] };
    }

    const jornadasSet = new Set(
      partidos.map(p => {
        if (p.jornadas && p.jornadas.name) {
          return parseInt(p.jornadas.name.replace(/\D/g, ''), 10);
        }
        return p.jornada || 1;
      })
    );
    const jornadasList = Array.from(jornadasSet).filter(Boolean).sort((a, b) => a - b);
    
    const maxJornada = jornadasList.length > 0 ? Math.max(...jornadasList) : 1;

    let confirmed = null;
    for (let i = jornadasList.length - 1; i >= 0; i--) {
      const jornadaActual = jornadasList[i];
      const partidosDeJornada = partidos.filter(p => (p.jornada || p.round) === jornadaActual);
      
      // Ajusta 'completado' o 'finalizado' según tu base de datos
      const todosCompletados = partidosDeJornada.every(p => 
        p.estado === 'completado' || p.estatus === 'completado' || p.status === 'completed'
      );
      
      if (todosCompletados && partidosDeJornada.length > 0) {
        confirmed = jornadaActual;
        break;
      }
    }

    return {
      currentJornada: maxJornada,
      lastConfirmedJornada: confirmed,
      allJornadas: jornadasList
    };
  }, [partidos]);

  const partidosFiltrados = useMemo(() => {
    let limitJornada;
    if (selectedJornadaView === 'recent') limitJornada = currentJornada;
    else if (selectedJornadaView === 'confirmed') limitJornada = lastConfirmedJornada || currentJornada;
    else limitJornada = parseInt(selectedJornadaView, 10);

    return partidos.filter(p => (p.jornada || p.round) <= limitJornada);
  }, [partidos, selectedJornadaView, currentJornada, lastConfirmedJornada]);

  return {
    selectedJornadaView,
    setSelectedJornadaView,
    currentJornada,
    lastConfirmedJornada,
    allJornadas,
    partidosFiltrados
  };
};