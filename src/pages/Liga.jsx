import React, { useEffect, useState } from "react";
import { LigaTemplate } from "../components/template/LigaTemplate";
import { getTablaPosicionesService } from "../services/estadisticas";
import { useDivisionStore } from "../store/DivisionStore";

export function Liga() {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 1. Nos suscribimos al store para obtener la división seleccionada
  const { selectedDivision } = useDivisionStore();
  
  // Define la temporada actual (podrías moverlo a un config global o store también)
  const season = "Apertura 2025"; 

  useEffect(() => {
    // 2. Cada vez que cambia selectedDivision, recargamos datos
    if (selectedDivision) {
      cargarDatos();
    }
  }, [selectedDivision]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Pasamos el NOMBRE de la división porque tu vista SQL filtra por nombre
      const data = await getTablaPosicionesService(selectedDivision.name, season);
      setStandings(data);
    } catch (error) {
      console.error("Error cargando tabla:", error);
      setStandings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LigaTemplate 
      standings={standings} 
      division={selectedDivision} // Pasamos el objeto completo o null
      season={season}
      loading={loading}
    />
  );
}