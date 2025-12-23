import React, { useState } from "react";
import { TorneosTemplate } from "../components/template/TorneosTemplate";
import { generarFixture, iniciarTorneoService } from "../services/torneos";
import { supabase } from "../supabase/supabase.config";

export function Torneos() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    division: "Primera",
    season: "Apertura 2025",
    startDate: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Obtener equipos activos (Lógica simplificada, podrías moverla a un servicio también)
      const { data: equipos } = await supabase
        .from('teams')
        .select('id')
        .eq('division', form.division)
        .eq('status', 'Activo');

      if (!equipos || equipos.length < 2) {
        return alert("Necesitas al menos 2 equipos activos en esta división.");
      }

      // 2. Generar Fixture en memoria (Reciclado)
      const fixture = generarFixture(equipos);

      // 3. Guardado Atómico (Optimizado)
      await iniciarTorneoService({
        division: form.division,
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
    />
  );
}