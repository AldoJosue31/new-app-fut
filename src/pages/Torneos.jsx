import React, { useState } from "react";
import { TorneosTemplate } from "../components/template/TorneosTemplate";
import { generarFixture, iniciarTorneoService } from "../services/torneos";
import { supabase } from "../supabase/supabase.config";
import { useDivisionStore } from "../store/DivisionStore"; // 1. Importar Store

export function Torneos() {
  const [loading, setLoading] = useState(false);
  const { selectedDivision } = useDivisionStore(); // 2. Usar la división seleccionada
  
  const [form, setForm] = useState({
    season: "Apertura 2025",
    startDate: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación de seguridad
    if (!selectedDivision) return alert("Por favor selecciona una división en el menú lateral.");

    setLoading(true);
    try {
      // 3. CORRECCIÓN: Filtramos por 'division_id' usando el ID del store
      const { data: equipos } = await supabase
        .from('teams')
        .select('id')
        .eq('division_id', selectedDivision.id) // <--- CAMBIO CLAVE
        .eq('status', 'Activo');

      if (!equipos || equipos.length < 2) {
        return alert(`Necesitas al menos 2 equipos activos en ${selectedDivision.name} para crear un torneo.`);
      }

      // 4. Generar Fixture
      const fixture = generarFixture(equipos);

      // 5. Guardar usando datos reales
      await iniciarTorneoService({
        divisionId: selectedDivision.id, // Enviamos ID
        divisionName: selectedDivision.name, // Enviamos Nombre (para la función SQL)
        season: form.season,
        startDate: form.startDate,
        totalJornadas: fixture.length,
      });

      alert("¡Torneo iniciado correctamente!");
      
    } catch (error) {
      console.error(error);
      alert("Error al iniciar el torneo: " + error.message);
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
      // Pasamos el nombre para mostrarlo en el Template (solo lectura)
      divisionName={selectedDivision?.name} 
    />
  );
}