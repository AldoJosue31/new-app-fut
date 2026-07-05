import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase/supabase.config";
import { useAuthStore } from "../../store/AuthStore";
import {
  getLeagueDelegateChangeRequests,
  reviewDelegateChangeRequest,
} from "../../services/delegates";

let ligaCache = {
  isFetched: false,
  leagueData: null,
  allDivisions: [],
  referees: [],
  delegateRequests: [],
};

export const useLigaLogic = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(!ligaCache.isFetched);
  const [leagueData, setLeagueData] = useState(ligaCache.leagueData);
  const [allDivisions, setAllDivisions] = useState(ligaCache.allDivisions);
  const [referees, setReferees] = useState(ligaCache.referees);
  const [delegateRequests, setDelegateRequests] = useState(ligaCache.delegateRequests);
  const [delegateRequestsLoading, setDelegateRequestsLoading] = useState(false);

  const loadDelegateRequests = useCallback(async (leagueId, options = {}) => {
    if (!leagueId) {
      ligaCache.delegateRequests = [];
      setDelegateRequests([]);
      return [];
    }

    const { silent = false } = options;

    if (!silent) {
      setDelegateRequestsLoading(true);
    }

    try {
      const requests = await getLeagueDelegateChangeRequests(leagueId);
      ligaCache.delegateRequests = requests;
      setDelegateRequests(requests);
      return requests;
    } catch (error) {
      console.error("Error cargando solicitudes de delegados:", error);
      if (!silent) {
        alert("Error al cargar las solicitudes de delegados.");
      }
      return [];
    } finally {
      if (!silent) {
        setDelegateRequestsLoading(false);
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      if (!ligaCache.isFetched) {
        setLoading(true);
      }

      if (!user?.id) return;

      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (leagueError && leagueError.code !== "PGRST116") throw leagueError;

      if (!league) {
        ligaCache = {
          isFetched: true,
          leagueData: null,
          allDivisions: [],
          referees: [],
          delegateRequests: [],
        };
        setLeagueData(null);
        setAllDivisions([]);
        setReferees([]);
        setDelegateRequests([]);
        setLoading(false);
        return;
      }

      const [
        { data: divisions, error: divError },
        { data: refs, error: refError },
        requests,
      ] = await Promise.all([
        supabase
          .from("divisions")
          .select("*")
          .eq("league_id", league.id)
          .order("id", { ascending: true }),
        supabase
          .from("referees")
          .select("*")
          .eq("league_id", league.id)
          .order("created_at", { ascending: false }),
        getLeagueDelegateChangeRequests(league.id),
      ]);

      if (divError) throw divError;
      if (refError) throw refError;

      ligaCache = {
        isFetched: true,
        leagueData: league,
        allDivisions: divisions || [],
        referees: refs || [],
        delegateRequests: requests || [],
      };

      setLeagueData(ligaCache.leagueData);
      setAllDivisions(ligaCache.allDivisions);
      setReferees(ligaCache.referees);
      setDelegateRequests(ligaCache.delegateRequests);
    } catch (error) {
      console.error("Error cargando datos:", error);
      alert("Error al cargar la información de la liga.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateLeague = async (updates) => {
    try {
      const { error } = await supabase
        .from("leagues")
        .update(updates)
        .eq("id", leagueData.id);

      if (error) throw error;

      const updatedInfo = { ...leagueData, ...updates };
      ligaCache.leagueData = updatedInfo;
      setLeagueData(updatedInfo);
      return true;
    } catch (error) {
      console.error(error);
      alert("Error al actualizar liga");
      return false;
    }
  };

  const handleAddCategory = async (name) => {
    try {
      const { error } = await supabase
        .from("categories")
        .insert([{ name, league_id: leagueData.id, tier: 99 }])
        .select()
        .single();

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(error);
      alert("Error al crear categoría: " + error.message);
      return false;
    }
  };

  const handleEditCategory = async (id, name) => {
    try {
      const { error } = await supabase.from("categories").update({ name }).eq("id", id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(error);
      alert("Error al editar categoría");
      return false;
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(error);
      alert("No se puede eliminar: tiene divisiones asociadas.");
      return false;
    }
  };

  const handleAddDivision = async (divisionData) => {
    try {
      const newDivision = {
        name: divisionData.name,
        category_id: divisionData.category_id,
        tier: Number(divisionData.tier) || 99,
        league_id: leagueData.id,
      };

      const { data, error } = await supabase
        .from("divisions")
        .insert([newDivision])
        .select()
        .single();

      if (error) throw error;

      ligaCache.allDivisions = [...allDivisions, data];
      setAllDivisions(ligaCache.allDivisions);
      return true;
    } catch (error) {
      console.error("Error al crear división:", error);
      alert("Error al crear división: " + error.message);
      return false;
    }
  };

  const handleEditDivision = async (id, divisionData) => {
    try {
      const updateData = {
        name: divisionData.name,
        category_id: divisionData.category_id,
        tier: divisionData.tier ? Number(divisionData.tier) : undefined,
      };

      if (updateData.tier === undefined) delete updateData.tier;

      const { error } = await supabase
        .from("divisions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      ligaCache.allDivisions = allDivisions.map((division) =>
        division.id === id ? { ...division, ...updateData } : division
      );
      setAllDivisions(ligaCache.allDivisions);
      return true;
    } catch (error) {
      console.error("Error al editar división:", error);
      alert("Error al editar división");
      return false;
    }
  };

  const handleDeleteDivision = async (id) => {
    try {
      const { error } = await supabase.from("divisions").delete().eq("id", id);
      if (error) throw error;

      ligaCache.allDivisions = allDivisions.filter((division) => division.id !== id);
      setAllDivisions(ligaCache.allDivisions);
      return true;
    } catch (error) {
      console.error(error);
      alert("No se puede eliminar: es posible que tenga equipos o torneos asociadas.");
      return false;
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

      ligaCache.referees = [data, ...referees];
      setReferees(ligaCache.referees);
    } catch (error) {
      console.error(error);
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

      ligaCache.referees = referees.map((referee) =>
        referee.id === id ? { ...referee, ...refereeData } : referee
      );
      setReferees(ligaCache.referees);
    } catch (error) {
      console.error(error);
      alert("Error al editar árbitro");
    }
  };

  const handleDeleteReferee = async (id) => {
    try {
      const { error } = await supabase.from("referees").delete().eq("id", id);
      if (error) throw error;

      ligaCache.referees = referees.filter((referee) => referee.id !== id);
      setReferees(ligaCache.referees);
    } catch (error) {
      console.error(error);
      alert("Error al eliminar árbitro");
    }
  };

  const handleReviewDelegateRequest = async ({
    requestId,
    decision,
    reviewNotes = null,
  }) => {
    try {
      const result = await reviewDelegateChangeRequest({
        requestId,
        decision,
        reviewNotes,
      });

      await loadDelegateRequests(leagueData?.id, { silent: true });
      return result;
    } catch (error) {
      console.error("Error revisando solicitud de delegado:", error);
      throw error;
    }
  };

  return {
    state: {
      loading,
      leagueData,
      allDivisions,
      referees,
      delegateRequests,
      delegateRequestsLoading,
    },
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
      handleDeleteReferee,
      handleReviewDelegateRequest,
      refreshDelegateRequests: () => loadDelegateRequests(leagueData?.id),
    },
  };
};
