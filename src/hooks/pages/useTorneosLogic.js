import { useState, useEffect, useCallback } from "react";
import { getTorneoActivo, getEquiposDivision, iniciarTorneoService } from "../../services/torneos"; 
import { getTablaPosicionesService } from "../../services/estadisticas";
import { useDivisionStore } from "../../store/DivisionStore";
import { 
  TOURNAMENT_STATUS, 
  TOURNAMENT_FORMAT, 
  TIE_BREAK_TYPE,
  TEAM_STATUS 
} from "../../utils/constants";

export const useTorneosLogic = () => {
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { selectedDivision } = useDivisionStore();
  
  // Estados de datos
  const [activeTournament, setActiveTournament] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [participatingIds, setParticipatingIds] = useState([]); 
  const [standings, setStandings] = useState([]);

  // --- CONFIGURACIÓN DE REGLAS ---
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

  // --- CONFIGURACIÓN DEL FORMULARIO ---
  const [form, setForm] = useState(() => {
    const savedRules = localStorage.getItem("torneo_reglas_draft");
    return savedRules ? JSON.parse(savedRules) : {
      season: "",
      startDate: new Date().toISOString().split('T')[0],
      vueltas: "1",       
      minPlayers: 7,
      format: TOURNAMENT_FORMAT.LEAGUE,
      tieBreakType: TIE_BREAK_TYPE.GOALS,
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      zonaLiguilla: false,
      clasificados: 4, 
      hasRepechaje: false,
      repechajeTeams: 0,
      maxTeams: 16,
      ascensos: 0,
      descensos: 0
    };
  });

  const showToast = (message, type = 'error') => setToastConfig({ show: true, message, type });
  const closeToast = () => setToastConfig({ ...toastConfig, show: false });

  // Limpieza y Validación
  useEffect(() => {
    if (!form.hasRepechaje && form.repechajeTeams !== 0) {
        setForm(prev => ({ ...prev, repechajeTeams: 0 }));
    }
  }, [form.hasRepechaje]);

  useEffect(() => {
    const max = parseInt(form.maxTeams || 0);
    if (max > 0 && participatingIds.length > max) {
        const excessCount = participatingIds.length - max;
        setParticipatingIds(prev => prev.slice(0, max));
        showToast(`Se movieron ${excessCount} equipos a 'No Participantes' por límite de cupo (${max}).`, "warning");
    }
  }, [form.maxTeams, participatingIds.length]);

  // Data Fetching
  const fetchData = useCallback(async () => {
    if (!selectedDivision) return;
    
    setIsLoadingData(true); 
    try {
      const [torneo, teams] = await Promise.all([
        getTorneoActivo(selectedDivision.id),
        getEquiposDivision(selectedDivision.id)
      ]);

      const processedTeams = teams.map(t => ({
        ...t,
        playerCount: t.players?.length || 0
      }));
      setAllTeams(processedTeams);
      setActiveTournament(torneo);

      if (torneo) {
        setForm(prev => ({
            ...prev,
            season: torneo.season,
            startDate: torneo.start_date,
            vueltas: torneo.config?.vueltas || "1",
            format: torneo.config?.format || TOURNAMENT_FORMAT.LEAGUE,
            maxTeams: torneo.config?.maxTeams || prev.maxTeams,
            winPoints: torneo.config?.winPoints ?? 3,
            drawPoints: torneo.config?.drawPoints ?? 1,
            lossPoints: torneo.config?.lossPoints ?? 0,
            zonaLiguilla: torneo.config?.zonaLiguilla || false,
            clasificados: torneo.config?.clasificados || 4,
            hasRepechaje: torneo.config?.hasRepechaje || false,
            repechajeTeams: torneo.config?.repechajeTeams || 0,
            ascensos: torneo.config?.ascensos || 0, 
            descensos: torneo.config?.descensos || 0
        }));
        
        if (torneo.config) {
          setReglas({
            minutosPorTiempo: torneo.config.minutosPorTiempo || "45",
            cambios: torneo.config.cambios || "Ilimitados",
            observaciones: torneo.config.observaciones || ""
          });
          if (Array.isArray(torneo.config.participatingIds)) {
             setParticipatingIds(torneo.config.participatingIds);
          }
        }

        try {
            const dataStats = await getTablaPosicionesService(selectedDivision.name);
            setStandings(dataStats || []);
        } catch (err) {
            console.error("Error posiciones:", err);
            setStandings([]);
        }

      } else {
        setStandings([]);
        const defaultParticipating = processedTeams
            .filter(t => t.status === TEAM_STATUS.ACTIVE && t.playerCount >= form.minPlayers)
            .map(t => t.id);
        setParticipatingIds(defaultParticipating);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Error al cargar datos: " + error.message, "error");
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedDivision, form.minPlayers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // --- ACTUALIZACIÓN: Recepción de fixtureData manual ---
  const handleSubmit = async (fixtureData = null) => {
    if (activeTournament) return; 

    const draftData = { ...form, reglasDraft: reglas };
    localStorage.setItem("torneo_reglas_draft", JSON.stringify(draftData));

    const max = parseInt(form.maxTeams || 0);
    if (max > 0 && participatingIds.length > max) {
        showToast(`Error: Hay más equipos (${participatingIds.length}) que el cupo permitido (${max}).`, "error");
        return;
    }

    if (!selectedDivision || !form.season || !form.startDate) {
      showToast("Faltan datos: División, Temporada o Fecha", "warning");
      return;
    }

    if (!reglas.minutosPorTiempo) {
       showToast("Debes definir la duración de los tiempos.", "warning");
       return;
    }

    setLoading(true);
    try {
      if (participatingIds.length < 2) throw new Error("Mínimo 2 equipos requeridos.");

      // Si viene fixtureData (del modal manual), lo usamos.
      // Si no, generamos placeholders (aunque el modal es quien inicia el proceso ahora).
      let jornadasArray = [];
      if (!fixtureData) {
          const jornadasPorVuelta = participatingIds.length % 2 === 0 ? participatingIds.length - 1 : participatingIds.length;
          const totalJornadasCalc = form.vueltas === "2" ? jornadasPorVuelta * 2 : jornadasPorVuelta;
          jornadasArray = Array.from({ length: totalJornadasCalc }, (_, i) => ({
            name: `Jornada ${i + 1}`
          }));
      }

      await iniciarTorneoService({
        divisionName: selectedDivision.name,
        season: form.season,
        startDate: form.startDate,
        config: {
          format: form.format,
          vueltas: form.vueltas,
          tieBreakType: form.tieBreakType,
          participatingIds,
          maxTeams: form.maxTeams,
          winPoints: form.winPoints,
          drawPoints: form.drawPoints,
          lossPoints: form.lossPoints,
          zonaLiguilla: form.zonaLiguilla,
          clasificados: form.clasificados,
          hasRepechaje: form.hasRepechaje,
          repechajeTeams: form.repechajeTeams,
          ascensos: form.ascensos,
          descensos: form.descensos,
          ...reglas 
        },
        jornadas: jornadasArray 
      }, fixtureData);

      showToast("¡Torneo iniciado correctamente!", "success");
      fetchData(); 

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
      allTeams,
      participatingIds,
      standings,
      divisionName: selectedDivision?.name
    },
    actions: {
      handleSubmit, 
      handleChange,
      onInclude: moveTeamToParticipating,
      onExclude: moveTeamToExcluded,
      setReglas,
      refreshData: fetchData
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