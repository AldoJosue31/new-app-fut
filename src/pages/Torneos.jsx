import React, { useState, useEffect } from "react";
import { TorneosTemplate } from "../components/template/TorneosTemplate";
import { generarFixture, iniciarTorneoService } from "../services/torneos";
import { supabase } from "../supabase/supabase.config";
import { useDivisionStore } from "../store/DivisionStore";

export function Torneos() {
  const [loading, setLoading] = useState(false);
  const { selectedDivision } = useDivisionStore();
  
  // Estados nuevos para la vista
  const [activeTournament, setActiveTournament] = useState(null);
  const [equipos, setEquipos] = useState([]);

  const [form, setForm] = useState({
    season: "",
    startDate: "",
    vueltas: "1",       // Default: Solo Ida
    ascensos: "",
    descensos: "",
    zonaLiguilla: false,
    clasificados: "8"
  });

  // Cargar datos cuando cambia la división
  useEffect(() => {
    if (selectedDivision) {
      fetchData();
    }
  }, [selectedDivision]);

  const fetchData = async () => {
    try {
      // 1. Buscar si hay torneo activo en esta división
      const { data: torneo } = await supabase
        .from('tournaments')
        .select('*')
        .eq('division_id', selectedDivision.id)
        .eq('status', 'En Curso') // O el estado que uses para activo
        .maybeSingle(); // maybeSingle no lanza error si no hay datos
      
      setActiveTournament(torneo);

      // 2. Buscar equipos aptos (Activos)
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('division_id', selectedDivision.id)
        .eq('status', 'Activo')
        .order('name');
        
      setEquipos(teams || []);

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDivision) return alert("Selecciona una división");
    if (activeTournament) return alert("Ya hay un torneo en curso");
    if (equipos.length < 2) return alert("Necesitas al menos 2 equipos activos");

    setLoading(true);
    try {
      // 1. Generar Fixture (Lógica de Ida/Vuelta)
      const dobleVuelta = form.vueltas === "2";
      const fixture = generarFixture(equipos, dobleVuelta);

      // 2. Guardar en BD
      await iniciarTorneoService({
        divisionId: selectedDivision.id,
        divisionName: selectedDivision.name,
        season: form.season,
        startDate: form.startDate,
        totalJornadas: fixture.length,
        // Aquí podrías pasar config extra a tu servicio si actualizaste la BD
        // config: { ascensos: form.ascensos, liguilla: form.zonaLiguilla ... }
      });

      alert("¡Torneo iniciado correctamente!");
      fetchData(); // Recargar para mostrar el bloqueo
      
    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TorneosTemplate
      form={form}
      onChange={handleChange}
      onSubmit={handleSubmit}
      loading={loading}
      divisionName={selectedDivision?.name}
      equipos={equipos}                  // Pasamos la lista de equipos
      activeTournament={activeTournament} // Pasamos el estado del torneo
    />
  );
}