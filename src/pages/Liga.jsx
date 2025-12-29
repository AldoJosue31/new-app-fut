import React, { useState, useEffect, useCallback } from "react";
import { LigaTemplate } from "../components/template/LigaTemplate";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore"; // Asumo que tienes esto para el user logueado

export function Liga() {
  const { user } = useAuthStore(); // Obtenemos el usuario logueado
  const [loading, setLoading] = useState(true);
  
  // Estados de datos
  const [leagueData, setLeagueData] = useState(null);
  const [allDivisions, setAllDivisions] = useState([]);
  const [referees, setReferees] = useState([]);
  const [standings, setStandings] = useState([]); // Tu lógica de tabla general actual
  const [season, setSeason] = useState("2024"); // O dinámica
  
  // Estado para feedback (opcional)
  const [error, setError] = useState(null);

  // --- 1. CARGA INICIAL DE DATOS ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user) return;

      // A) Obtener la Liga del usuario
      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (leagueError && leagueError.code !== 'PGRST116') throw leagueError;
      
      // Si no tiene liga, podrías crear una por defecto o manejar estado vacío
      if (!league) {
        setLoading(false);
        return;
      }

      setLeagueData(league);

      // B) Cargar Divisiones de esa liga
      const { data: divisions, error: divError } = await supabase
        .from("divisions")
        .select("*")
        .eq("league_id", league.id)
        .order("id", { ascending: true });
        
      if (divError) throw divError;
      setAllDivisions(divisions || []);

      // C) Cargar Árbitros de esa liga
      const { data: refs, error: refError } = await supabase
        .from("referees")
        .select("*")
        .eq("league_id", league.id)
        .order("created_at", { ascending: false });

      if (refError) throw refError;
      setReferees(refs || []);

      // D) Cargar Standings (Aquí mantienes tu lógica existente o query compleja)
      // Por ahora simulamos vacío o tu fetch actual
      // const stats = await fetchStandings(league.id); 
      // setStandings(stats);

    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar la información de la liga.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- 2. HANDLERS PARA CONFIGURACIÓN GENERAL ---
  const handleUpdateLeague = async (name) => {
    try {
      const { error } = await supabase
        .from("leagues")
        .update({ name })
        .eq("id", leagueData.id);

      if (error) throw error;
      setLeagueData({ ...leagueData, name });
      alert("Nombre actualizado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la liga");
    }
  };

  // --- 3. HANDLERS PARA DIVISIONES ---
  const handleAddDivision = async (name) => {
    try {
      const { data, error } = await supabase
        .from("divisions")
        .insert([{ name, league_id: leagueData.id, tier: allDivisions.length + 1 }])
        .select()
        .single();

      if (error) throw error;
      setAllDivisions([...allDivisions, data]);
    } catch (err) {
      console.error(err);
      alert("Error al crear división");
    }
  };

  const handleEditDivision = async (id, name) => {
    try {
      const { error } = await supabase
        .from("divisions")
        .update({ name })
        .eq("id", id);

      if (error) throw error;
      setAllDivisions(allDivisions.map(d => d.id === id ? { ...d, name } : d));
    } catch (err) {
      console.error(err);
      alert("Error al editar división");
    }
  };

  const handleDeleteDivision = async (id) => {
    try {
      const { error } = await supabase
        .from("divisions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setAllDivisions(allDivisions.filter(d => d.id !== id));
    } catch (err) {
      console.error(err);
      alert("No se puede eliminar: es posible que tenga equipos o torneos asociados.");
    }
  };

  // --- 4. HANDLERS PARA ÁRBITROS ---
  const handleAddReferee = async (refereeData) => {
    try {
      const { data, error } = await supabase
        .from("referees")
        .insert([{ ...refereeData, league_id: leagueData.id }])
        .select()
        .single();

      if (error) throw error;
      setReferees([data, ...referees]);
    } catch (err) {
      console.error(err);
      alert("Error al agregar árbitro");
    }
  };

  const handleEditReferee = async (id, refereeData) => {
    try {
      const { error } = await supabase
        .from("referees")
        .update(refereeData)
        .eq("id", id);

      if (error) throw error;
      setReferees(referees.map(r => r.id === id ? { ...r, ...refereeData } : r));
    } catch (err) {
      console.error(err);
      alert("Error al editar árbitro");
    }
  };

  const handleDeleteReferee = async (id) => {
    try {
      const { error } = await supabase
        .from("referees")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setReferees(referees.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert("Error al eliminar árbitro");
    }
  };

  // --- RENDERIZADO ---
  return (
    <LigaTemplate
      // Datos
      loading={loading}
      standings={standings} // Array de objetos según tu tabla
      division={allDivisions[0]} // Puedes pasar la división seleccionada o la primera por defecto para la vista inicial
      season={season}
      leagueData={leagueData}
      allDivisions={allDivisions}
      referees={referees}
      
      // Funciones
      onUpdateLeague={handleUpdateLeague}
      onAddDivision={handleAddDivision}
      onEditDivision={handleEditDivision}
      onDeleteDivision={handleDeleteDivision}
      onAddReferee={handleAddReferee}
      onEditReferee={handleEditReferee}
      onDeleteReferee={handleDeleteReferee}
    />
  );
}