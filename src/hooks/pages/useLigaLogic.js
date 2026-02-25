import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase/supabase.config";
import { useAuthStore } from "../../store/AuthStore";

export const useLigaLogic = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  // Estados de datos
  const [leagueData, setLeagueData] = useState(null);
  const [allDivisions, setAllDivisions] = useState([]);
  const [referees, setReferees] = useState([]);
  const [standings, setStandings] = useState([]);
  const [season, setSeason] = useState("2024");
  
  // --- CARGA DE DATOS ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (leagueError && leagueError.code !== 'PGRST116') throw leagueError;
      
      if (!league) {
        setLoading(false);
        return;
      }

      setLeagueData(league);

      const { data: divisions, error: divError } = await supabase
        .from("divisions")
        .select("*")
        .eq("league_id", league.id)
        .order("id", { ascending: true });
        
      if (divError) throw divError;
      setAllDivisions(divisions || []);

      const { data: refs, error: refError } = await supabase
        .from("referees")
        .select("*")
        .eq("league_id", league.id)
        .order("created_at", { ascending: false });

      if (refError) throw refError;
      setReferees(refs || []);

    } catch (err) {
      console.error("Error cargando datos:", err);
      alert("Error al cargar la información de la liga.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- HANDLERS ---
  const handleUpdateLeague = async (updates) => {
    console.log("-> [BD] Intentando actualizar tabla 'leagues' con:", updates);
    try {
      const { data, error } = await supabase
        .from("leagues")
        .update(updates)
        .eq("id", leagueData.id)
        .select(); 

      if (error) {
        console.error("-> [BD] Error de Supabase al actualizar:", error);
        throw error;
      }
      
      console.log("-> [BD] Update exitoso en tabla leagues:", data);
      setLeagueData({ ...leagueData, ...updates });
      return true; 
    } catch (err) {
      console.error("-> [BD] Error capturado en handleUpdateLeague:", err);
      
      // Código de error 42703 de PostgreSQL significa "Undefined Column" (Columna no existe)
      if (err.code === '42703') {
         alert("❌ ERROR CRÍTICO BD: La columna 'logo_url' NO existe en tu tabla 'leagues'. Ve a tu SQL Editor en Supabase y ejecuta: ALTER TABLE public.leagues ADD COLUMN logo_url text, ADD COLUMN original_logo_url text;");
      } else {
         alert(`❌ Error en Base de Datos: ${err.message || "Error desconocido"}`);
      }
      return false;
    }
  };

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

  return {
    state: { loading, leagueData, allDivisions, referees, standings, season },
    actions: { handleUpdateLeague, handleAddDivision, handleEditDivision, handleDeleteDivision, handleAddReferee, handleEditReferee, handleDeleteReferee }
  };
};