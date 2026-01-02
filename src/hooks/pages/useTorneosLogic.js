import { useState, useEffect, useCallback } from "react";
// Importamos los nuevos servicios centralizados
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

  // Configuración
  const [reglas, setReglas] = useState({
    minutosPorTiempo: "45",
    cambios: "Ilimitados",
    observaciones: ""
  });

  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  const [form, setForm] = useState(() => {
    const savedRules = localStorage.getItem("torneo_reglas_draft");
    return savedRules ? JSON.parse(savedRules) : {
      season: "",
      startDate: new Date().toISOString().split('T')[0],
      vueltas: "1",       
      minPlayers: 7,
      format: TOURNAMENT_FORMAT.LEAGUE,
      tieBreakType: TIE_BREAK_TYPE.GOALS
    };
  });

  // Helpers
  const showToast = (message, type = 'error') => setToastConfig({ show: true, message, type });
  const closeToast = () => setToastConfig({ ...toastConfig, show: false });

  // --- CORE LOGIC: DATA FETCHING OPTIMIZADO ---
  const fetchData = useCallback(async () => {
    if (!selectedDivision) return;
    
    setIsLoadingData(true); 
    try {
      // 1. PROMISE.ALL: Disparamos ambas peticiones en paralelo
      // Esto reduce el tiempo de espera significativamente
      const [torneo, teams] = await Promise.all([
        getTorneoActivo(selectedDivision.id),
        getEquiposDivision(selectedDivision.id)
      ]);

      // 2. Procesar Equipos
      const processedTeams = teams.map(t => ({
        ...t,
        playerCount: t.players?.length || 0
      }));
      setAllTeams(processedTeams);

      // 3. Procesar Torneo (si existe)
      setActiveTournament(torneo);

      if (torneo) {
        // Cargar configuración existente
        setForm(prev => ({
          ...prev,
          season: torneo.season,
          startDate: torneo.start_date,
          vueltas: torneo.config?.vueltas || "1",
          format: torneo.config?.format || TOURNAMENT_FORMAT.LEAGUE
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

        // Cargar Posiciones (Solo si hay torneo)
        try {
            const dataStats = await getTablaPosicionesService(selectedDivision.id, torneo.season);
            setStandings(dataStats || []);
        } catch (err) {
            console.error("Error posiciones:", err);
            setStandings([]);
        }

      } else {
        // Si NO hay torneo, pre-seleccionamos equipos aptos
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

  // --- Handlers ---
  const moveTeamToParticipating = (teamId) => {
    if(!activeTournament) setParticipatingIds(prev => [...prev, teamId]);
  };
  
  const moveTeamToExcluded = (teamId) => {
    if(!activeTournament) setParticipatingIds(prev => prev.filter(id => id !== teamId));
  };

  const handleChange = (e) => {
    setForm({ 
      ...form, 
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value 
    });
  };

  const handleSubmit = async () => {
    if (activeTournament) return; 

    if (!selectedDivision || !form.season || !form.startDate) {
      showToast("Faltan datos: División, Temporada o Fecha", "warning");
      return;
    }

    setLoading(true);
    try {
      if (participatingIds.length < 2) throw new Error("Mínimo 2 equipos requeridos.");

      const jornadasPorVuelta = participatingIds.length % 2 === 0 ? participatingIds.length - 1 : participatingIds.length;
      const totalJornadasCalc = form.vueltas === "2" ? jornadasPorVuelta * 2 : jornadasPorVuelta;

      const jornadasArray = Array.from({ length: totalJornadasCalc }, (_, i) => ({
        name: `Jornada ${i + 1}`
      }));

      await iniciarTorneoService({
        divisionName: selectedDivision.name,
        season: form.season,
        startDate: form.startDate,
        config: {
          format: form.format,
          vueltas: form.vueltas,
          tieBreakType: form.tieBreakType,
          participatingIds,
          ...reglas 
        },
        jornadas: jornadasArray
      });

      showToast("¡Torneo iniciado!", "success");
      fetchData(); // Recargamos todo

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
      setReglas
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