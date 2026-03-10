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

  // --- HANDLERS LIGA ---
  const handleUpdateLeague = async (updates) => {
    try {
      const { data, error } = await supabase.from("leagues").update(updates).eq("id", leagueData.id).select(); 
      if (error) throw error;
      setLeagueData({ ...leagueData, ...updates });
      return true; 
    } catch (err) {
      console.error(err);
      alert(`❌ Error al actualizar liga`);
      return false;
    }
  };

  // --- HANDLERS DE CATEGORÍAS (NUEVOS) ---
  const handleAddCategory = async (name) => {
    try {
      const { error } = await supabase
        .from("categories")
        .insert([{ name, league_id: leagueData.id, tier: 99 }])
        .select()
        .single();
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(err);
      alert("Error al crear categoría: " + err.message);
      return false;
    }
  };

  const handleEditCategory = async (id, name) => {
    try {
      const { error } = await supabase.from("categories").update({ name }).eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(err);
      alert("Error al editar categoría");
      return false;
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(err);
      alert("No se puede eliminar: tiene divisiones asociadas.");
      return false;
    }
  };

  // --- HANDLERS DE DIVISIONES ---
  const handleAddDivision = async (divisionData) => {
    try {
      const newDivision = { 
        name: divisionData.name, 
        category_id: divisionData.category_id, 
        tier: Number(divisionData.tier) || 99,
        league_id: leagueData.id 
      };

      const { data, error } = await supabase.from("divisions").insert([newDivision]).select().single();
      if (error) throw error;
      setAllDivisions([...allDivisions, data]);
      return true;
    } catch (err) {
      console.error("Error al crear división:", err);
      alert("Error al crear división: " + err.message);
      return false;
    }
  };

  const handleEditDivision = async (id, divisionData) => {
    try {
      const updateData = {
          name: divisionData.name,
          category_id: divisionData.category_id,
          tier: divisionData.tier ? Number(divisionData.tier) : undefined
      };
      if (updateData.tier === undefined) delete updateData.tier;

      const { error } = await supabase.from("divisions").update(updateData).eq("id", id);
      if (error) throw error;
      setAllDivisions(allDivisions.map(d => d.id === id ? { ...d, ...updateData } : d));
      return true;
    } catch (err) {
      console.error("Error al editar división:", err);
      alert("Error al editar división");
      return false;
    }
  };

  const handleDeleteDivision = async (id) => {
    try {
      const { error } = await supabase.from("divisions").delete().eq("id", id);
      if (error) throw error;
      setAllDivisions(allDivisions.filter(d => d.id !== id));
      return true;
    } catch (err) {
      console.error(err);
      alert("No se puede eliminar: es posible que tenga equipos o torneos asociadas.");
      return false;
    }
  };

  // --- HANDLERS ÁRBITROS ---
  const handleAddReferee = async (refereeData) => {
    try {
      const { data, error } = await supabase.from("referees").insert([{ ...refereeData, league_id: leagueData.id }]).select().single();
      if (error) throw error;
      setReferees([data, ...referees]);
    } catch (err) {
      console.error(err);
      alert("Error al agregar árbitro");
    }
  };

  const handleEditReferee = async (id, refereeData) => {
    try {
      const { error } = await supabase.from("referees").update(refereeData).eq("id", id);
      if (error) throw error;
      setReferees(referees.map(r => r.id === id ? { ...r, ...refereeData } : r));
    } catch (err) {
      console.error(err);
      alert("Error al editar árbitro");
    }
  };

  const handleDeleteReferee = async (id) => {
    try {
      const { error } = await supabase.from("referees").delete().eq("id", id);
      if (error) throw error;
      setReferees(referees.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert("Error al eliminar árbitro");
    }
  };

  return {
    state: { loading, leagueData, allDivisions, referees, standings, season },
    actions: { 
        handleUpdateLeague, 
        handleAddCategory, 
        handleEditCategory, 
        handleDeleteCategory, 
        handleAddDivision, 
        handleEditDivision, 
        handleDeleteDivision, 
        handleAddReferee, 
        handleEditReferee, 
        handleDeleteReferee 
    }
  };
};