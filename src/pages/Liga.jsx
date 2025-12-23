import React, { useEffect, useState } from "react";
import { LigaTemplate } from "../components/template/LigaTemplate";
import { getTablaPosicionesService } from "../services/estadisticas";

export function Liga() {
  const [standings, setStandings] = useState([]);
  // Podrías manejar estos filtros con un estado global o props
  const [filters, setFilters] = useState({ division: "Primera", season: "Apertura 2025" });

  useEffect(() => {
    cargarDatos();
  }, [filters]);

  const cargarDatos = async () => {
    try {
      const data = await getTablaPosicionesService(filters.division, filters.season);
      setStandings(data);
    } catch (error) {
      console.error("Error cargando tabla:", error);
    }
  };

  return (
    <LigaTemplate 
      standings={standings} 
      division={filters.division} 
      season={filters.season}
    />
  );
}