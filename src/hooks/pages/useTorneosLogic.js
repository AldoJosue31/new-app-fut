import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { 
    iniciarTorneoService, 
    updateJornadaFechas, 
    bulkUpdateJornadaFechas
} from "../../services/torneos"; 
import { getDivisionWorkspace } from "../../services/divisionWorkspace";
import { useDivisionStore } from "../../store/DivisionStore";
import { 
  TOURNAMENT_FORMAT, 
  TEAM_STATUS 
} from "../../utils/constants";
import { addDaysToDate, isValidDate } from "../../utils/dateUtils";

const getParsedLeagueConfig = (leagueData) => {
  if (!leagueData?.default_config) return {};
  if (typeof leagueData.default_config === "string") {
    try {
      return JSON.parse(leagueData.default_config);
    } catch {
      return {};
    }
  }
  return leagueData.default_config || {};
};

const createLeagueRuleDraft = (leagueData) => {
  const parsed = getParsedLeagueConfig(leagueData);

  return {
    form: {
      season: "",
      startDate: "",
      vueltas: "1",
      minPlayers: parsed.minPlayers ?? 7,
      maxPlayers: parsed.maxPlayers ?? 25,
      maxTeams: parsed.maxTeams ?? 20,
      format: TOURNAMENT_FORMAT.LEAGUE,
      tieBreakType: parsed.tieBreakType ?? "normal",
      winPoints: parsed.winPoints ?? 3,
      drawPoints: parsed.drawPoints ?? 1,
      lossPoints: parsed.lossPoints ?? 0,
      zonaLiguilla: false,
      clasificados: 4,
      hasRepechaje: false,
      repechajeTeams: 0,
      playoffReseed: true,
      playoffTieBreaker: "bestSeed",
      repechajeLegs: "single",
      playoffLegsRound32: "single",
      playoffLegsRound16: "single",
      playoffLegsQuarterfinals: "single",
      playoffLegsSemifinals: "single",
      playoffLegsFinal: "single",
      countGoalsPlayoffs: false,
      countGoalsRepechaje: false,
      ascensos: 0,
      descensos: 0,
    },
    reglas: {
      minutosPorTiempo: parsed.minutosPorTiempo ?? 45,
      minutosDescanso: parsed.minutosDescanso ?? 15,
      cambios: parsed.cambios ?? "Ilimitados",
      observaciones: "",
    },
  };
};

export const useTorneosLogic = () => {
  const { divisionId: routeDivisionId } = useParams();
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { selectedDivision, setDivision } = useDivisionStore();
  const routeDivisionIdNumber = Number(routeDivisionId);
  const activeDivisionId =
    Number.isInteger(routeDivisionIdNumber) && routeDivisionIdNumber > 0
      ? routeDivisionIdNumber
      : selectedDivision?.id;
  
  const [activeTournament, setActiveTournament] = useState(null);
  const [leagueData, setLeagueData] = useState(null); 
  const [divisionContext, setDivisionContext] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [participatingIds, setParticipatingIds] = useState([]); 
  const [standings, setStandings] = useState([]);
  const [partidos, setPartidos] = useState([]);

  const [reglas, setReglas] = useState(() => {
    const savedData = localStorage.getItem("torneo_reglas_draft");
    if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.reglasDraft) return parsed.reglasDraft;
    }
    return {
      minutosPorTiempo: "", 
      cambios: "Ilimitados",
      observaciones: ""
    };
  });

  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const defaultForm = {
      season: "",
      startDate: today,
      vueltas: "1",       
      minPlayers: 7,
      maxPlayers: 25, 
      format: TOURNAMENT_FORMAT.LEAGUE,
      tieBreakType: "normal", // <-- CORREGIDO A NORMAL
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      zonaLiguilla: false,
      clasificados: 4, 
      hasRepechaje: false,
      repechajeTeams: 0,
      playoffReseed: true,
      playoffTieBreaker: "bestSeed",
      repechajeLegs: "single",
      playoffLegsRound32: "single",
      playoffLegsRound16: "single",
      playoffLegsQuarterfinals: "single",
      playoffLegsSemifinals: "single",
      playoffLegsFinal: "single",
      countGoalsPlayoffs: false,
      countGoalsRepechaje: false,
      maxTeams: 16,
      ascensos: 0,
      descensos: 0
    };

    const savedRules = localStorage.getItem("torneo_reglas_draft");
    if (savedRules) {
        const parsed = JSON.parse(savedRules);
        const parsedRepechajeTeams = parseInt(parsed.repechajeTeams, 10) || 0;
        return {
            ...defaultForm,
            ...parsed,
            hasRepechaje: parsed.hasRepechaje ?? parsedRepechajeTeams > 0,
            season: "", 
            startDate: today
        };
    }
    
    return defaultForm;
  });
  const effectiveDivision =
    divisionContext ||
    (activeDivisionId && selectedDivision?.id !== activeDivisionId ? null : selectedDivision);

  const showToast = (message, type = 'error') => setToastConfig({ show: true, message, type });
  const closeToast = () => setToastConfig({ ...toastConfig, show: false });

  useEffect(() => {
    if (!form.hasRepechaje && form.repechajeTeams !== 0) {
        setForm(prev => ({ ...prev, repechajeTeams: 0 }));
    }
  }, [form.hasRepechaje, form.repechajeTeams]);

  useEffect(() => {
    const max = parseInt(form.maxTeams || 0);
    if (max > 0 && participatingIds.length > max) {
        const excessCount = participatingIds.length - max;
        setParticipatingIds(prev => prev.slice(0, max));
        showToast(`Se movieron ${excessCount} equipos a 'No Participantes' por límite de cupo (${max}).`, "warning");
    }
  }, [form.maxTeams, participatingIds.length]);

  const fetchData = useCallback(async () => {
    if (!activeDivisionId) {
      setIsLoadingData(false);
      return;
    }
    
    setIsLoadingData(true); 
    try {
      const workspace = await getDivisionWorkspace(activeDivisionId);
      const resolvedDivision = workspace?.division || selectedDivision;
      const torneo = workspace?.activeTournament || null;
      const teams = workspace?.teams || [];
      const lData = workspace?.league || resolvedDivision?.league || null;

      setDivisionContext(resolvedDivision);
      if (resolvedDivision && selectedDivision?.id !== resolvedDivision.id) {
        setDivision(resolvedDivision);
      }
      setActiveTournament(torneo);
      setLeagueData(lData);

      const processedTeams = teams.map(t => ({
        ...t,
        playerCount: t.players?.length || 0
      }));
      setAllTeams(processedTeams);

      if (torneo) {
        setForm(prev => ({
            ...prev,
            season: torneo.season,
            startDate: torneo.start_date,
            vueltas: torneo.config?.vueltas || "1",
            format: torneo.config?.format || TOURNAMENT_FORMAT.LEAGUE,
            maxTeams: torneo.config?.maxTeams || prev.maxTeams,
            minPlayers: torneo.config?.minPlayers || prev.minPlayers, 
            maxPlayers: torneo.config?.maxPlayers || prev.maxPlayers, 
            winPoints: torneo.config?.winPoints ?? 3,
            drawPoints: torneo.config?.drawPoints ?? 1,
            lossPoints: torneo.config?.lossPoints ?? 0,
            zonaLiguilla: torneo.config?.zonaLiguilla || false,
            clasificados: torneo.config?.clasificados || 4,
            hasRepechaje: torneo.config?.hasRepechaje ?? (parseInt(torneo.config?.repechajeTeams, 10) || 0) > 0,
            repechajeTeams: torneo.config?.repechajeTeams || 0,
            playoffReseed: torneo.config?.playoffReseed ?? true,
            playoffTieBreaker: torneo.config?.playoffTieBreaker || "bestSeed",
            repechajeLegs: torneo.config?.repechajeLegs || "single",
            playoffLegsRound32: torneo.config?.playoffLegsRound32 || "single",
            playoffLegsRound16: torneo.config?.playoffLegsRound16 || "single",
            playoffLegsQuarterfinals: torneo.config?.playoffLegsQuarterfinals || "single",
            playoffLegsSemifinals: torneo.config?.playoffLegsSemifinals || "single",
            playoffLegsFinal: torneo.config?.playoffLegsFinal || "single",
            countGoalsPlayoffs: torneo.config?.countGoalsPlayoffs ?? false,
            countGoalsRepechaje: torneo.config?.countGoalsRepechaje ?? false,
            ascensos: torneo.config?.ascensos || 0, 
            descensos: torneo.config?.descensos || 0
        }));
        
        if (torneo.config) {
          setReglas({
            minutosPorTiempo: torneo.config.minutosPorTiempo || "45",
            minutosDescanso: torneo.config.minutosDescanso || "15",
            cambios: torneo.config.cambios || "Ilimitados",
            observaciones: torneo.config.observaciones || ""
          });
          if (Array.isArray(torneo.config.participatingIds)) {
             setParticipatingIds(torneo.config.participatingIds);
          }
        }

        setStandings(workspace?.standings || []);
        setPartidos(workspace?.matches || []);

      } else {
        setStandings([]);
        setPartidos([]);
        const defaultParticipating = processedTeams
            .filter(t => t.status === TEAM_STATUS.ACTIVE && t.playerCount >= form.minPlayers)
            .map(t => t.id);
        setParticipatingIds(defaultParticipating);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      setDivisionContext(null);
      showToast("Error al cargar datos: " + error.message, "error");
    } finally {
      setIsLoadingData(false);
    }
  }, [activeDivisionId, form.minPlayers, selectedDivision, setDivision]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const syncTournamentDates = async (tournamentId, startDateString) => {
    if (!tournamentId || !startDateString || !activeTournament?.jornadas) return;

    try {
        setLoading(true);
        if (!isValidDate(startDateString)) throw new Error("Fecha de inicio inválida");

        const updates = activeTournament.jornadas.map((jornada, index) => {
            const weekStartStr = addDaysToDate(startDateString, index * 7);
            const weekEndStr = addDaysToDate(weekStartStr, 6);
            
            return {
                id: jornada.id,
                start_date: weekStartStr,
                end_date: weekEndStr
            };
        });

        await bulkUpdateJornadaFechas(updates);
        await fetchData(); 
        showToast("Fechas calculadas y guardadas automáticamente", "success");
    } catch (error) {
        console.error("Error sync dates:", error);
        showToast("Error al sincronizar fechas", "error");
    } finally {
        setLoading(false);
    }
  };

  const updateJornadaDatesLocal = async (jornadaId, field, value) => {
    try {
        const jornada = activeTournament?.jornadas?.find(j => j.id === jornadaId);
        if (!jornada) return;

        const newStart = field === 'start_date' ? value : jornada.start_date;
        const newEnd = field === 'end_date' ? value : jornada.end_date;

        await updateJornadaFechas(jornadaId, newStart, newEnd);
        
        setActiveTournament(prev => ({
            ...prev,
            jornadas: prev.jornadas.map(j => j.id === jornadaId ? { ...j, [field]: value } : j)
        }));

    } catch (error) {
        console.error("Error updating single jornada date:", error);
        showToast("Error al actualizar fecha", "error");
    }
  };

  const moveTeamToParticipating = (teamId) => {
    if(activeTournament) return;
    const max = parseInt(form.maxTeams || 0);
    if (max > 0 && participatingIds.length >= max) {
        showToast(`Cupo lleno. El límite es de ${max} equipos.`, "warning");
        return;
    }
    setParticipatingIds(prev => [...prev, teamId]);
  };
  
  const moveTeamToExcluded = (teamId) => {
    if(!activeTournament) setParticipatingIds(prev => prev.filter(id => id !== teamId));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm(prevForm => ({ ...prevForm, [name]: val }));
  };

  const resetDraftToLeagueRules = useCallback(() => {
    const nextDraft = createLeagueRuleDraft(leagueData);
    localStorage.removeItem("torneo_reglas_draft");
    setForm(nextDraft.form);
    setReglas(nextDraft.reglas);
  }, [leagueData]);

  const handleSubmit = async (fixtureData = null) => {
    if (activeTournament) return; 

    const draftData = { ...form, reglasDraft: reglas };
    localStorage.setItem("torneo_reglas_draft", JSON.stringify(draftData));

    const max = parseInt(form.maxTeams || 0);
    if (max > 0 && participatingIds.length > max) {
        showToast(`Error: Hay más equipos (${participatingIds.length}) que el cupo permitido (${max}).`, "error");
        return;
    }

    if (!effectiveDivision || !form.startDate) {
      showToast("Faltan datos: División o Fecha", "warning");
      return;
    }

    setLoading(true);
    try {
      if (participatingIds.length < 2) throw new Error("Mínimo 2 equipos requeridos.");

      let jornadasArray = [];
      if (!fixtureData) {
          const jornadasPorVuelta = participatingIds.length % 2 === 0 ? participatingIds.length - 1 : participatingIds.length;
          const totalJornadasCalc = form.vueltas === "2" ? jornadasPorVuelta * 2 : jornadasPorVuelta;
          jornadasArray = Array.from({ length: totalJornadasCalc }, (_, i) => ({
            name: `Jornada ${i + 1}`
          }));
      }

      await iniciarTorneoService({
        divisionId: effectiveDivision.id,
        divisionName: effectiveDivision.name,
        season: form.season,
        startDate: form.startDate,
        config: {
          format: form.format,
          vueltas: form.vueltas,
          tieBreakType: form.tieBreakType,
          participatingIds,
          minPlayers: parseInt(form.minPlayers) || 7, 
          maxPlayers: parseInt(form.maxPlayers) || 25, 
          maxTeams: parseInt(form.maxTeams) || 16,
          winPoints: form.winPoints,
          drawPoints: form.drawPoints,
          lossPoints: form.lossPoints,
          zonaLiguilla: form.zonaLiguilla,
          clasificados: form.clasificados,
          hasRepechaje: form.hasRepechaje || (parseInt(form.repechajeTeams, 10) || 0) > 0,
          repechajeTeams: parseInt(form.repechajeTeams, 10) || 0,
          playoffReseed: form.playoffReseed !== false,
          playoffTieBreaker: form.playoffTieBreaker || "bestSeed",
          repechajeLegs: form.repechajeLegs || "single",
          playoffLegsRound32: form.playoffLegsRound32 || "single",
          playoffLegsRound16: form.playoffLegsRound16 || "single",
          playoffLegsQuarterfinals: form.playoffLegsQuarterfinals || "single",
          playoffLegsSemifinals: form.playoffLegsSemifinals || "single",
          playoffLegsFinal: form.playoffLegsFinal || "single",
          countGoalsPlayoffs: !!form.countGoalsPlayoffs,
          countGoalsRepechaje: !!form.countGoalsRepechaje,
          ascensos: form.ascensos,
          descensos: form.descensos,
          ...reglas 
        },
        jornadas: jornadasArray 
      }, fixtureData);

      showToast("¡Torneo iniciado correctamente!", "success");
      await fetchData(); 

    } catch (error) {
      console.error(error);
      showToast(error.message || "Error al iniciar torneo", "error");
    } finally {
      setLoading(false);
    }
  };

  return {
    state: {
      loading,
      isLoadingData,
      activeTournament,
      leagueData, 
      allTeams,
      participatingIds,
      standings,
      partidos,
      divisionId: effectiveDivision?.id || activeDivisionId,
      divisionName: effectiveDivision?.name
    },
    actions: {
      handleSubmit, 
      handleChange,
      onInclude: moveTeamToParticipating,
      onExclude: moveTeamToExcluded,
      setReglas,
      resetDraftToLeagueRules,
      refreshData: fetchData,
      syncTournamentDates,
      updateJornadaDatesLocal
    },
    formData: {
      form,
      reglas,
      minPlayers: form.minPlayers
    },
    toast: {
      ...toastConfig,
      close: closeToast
    }
  };
};
