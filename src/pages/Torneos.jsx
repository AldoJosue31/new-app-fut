import React, { useState, useEffect } from "react";
import { TorneosTemplate } from "../components/template/TorneosTemplate";
import { iniciarTorneoService } from "../services/torneos"; 
import { getTablaPosicionesService } from "../services/estadisticas";
import { supabase } from "../supabase/supabase.config";
import { useDivisionStore } from "../store/DivisionStore";
// 1. IMPORTAMOS EL TOAST
import { Toast } from "../index";

export function Torneos() {
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { selectedDivision } = useDivisionStore();
  
  // Estados de datos
  const [activeTournament, setActiveTournament] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [participatingIds, setParticipatingIds] = useState([]); 
  const [standings, setStandings] = useState([]);

  // Estado para las Reglas de Juego
  const [reglas, setReglas] = useState({
    minutosPorTiempo: "45",
    cambios: "Ilimitados",
    observaciones: ""
  });

  // 2. ESTADO PARA CONTROLAR EL TOAST
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'error' });

  // Helper para mostrar notificaciones
  const showToast = (message, type = 'error') => {
      setToastConfig({ show: true, message, type });
  };

  // Estado del Formulario Principal
  const [form, setForm] = useState(() => {
    const savedRules = localStorage.getItem("torneo_reglas_draft");
    return savedRules ? JSON.parse(savedRules) : {
      season: "",
      startDate: new Date().toISOString().split('T')[0],
      vueltas: "1",       
      minPlayers: 7,
      format: "Liga", 
    };
  });

  useEffect(() => {
    if (selectedDivision) {
      fetchData();
    } else {
      setIsLoadingData(false);
    }
  }, [selectedDivision]);

  const fetchData = async () => {
    setIsLoadingData(true); 

    try {
      // 1. Buscar torneo activo
      const { data: torneo } = await supabase
        .from('tournaments')
        .select('*')
        .eq('division_id', selectedDivision.id)
        .in('status', ['Activo', 'En Curso']) 
        .maybeSingle();
      
      setActiveTournament(torneo);

      if (torneo) {
        setForm(prev => ({
          ...prev,
          season: torneo.season,
          startDate: torneo.start_date,
          vueltas: torneo.config?.vueltas || "1",
          format: torneo.config?.format || "Liga"
        }));
        
        if (torneo.config) {
          // RECUPERAR REGLAS
          setReglas({
            minutosPorTiempo: torneo.config.minutosPorTiempo || "45",
            cambios: torneo.config.cambios || "Ilimitados",
            observaciones: torneo.config.observaciones || ""
          });

          // --- FIX: RECUPERAR EQUIPOS PARTICIPANTES GUARDADOS ---
          if (torneo.config.participatingIds && Array.isArray(torneo.config.participatingIds)) {
             setParticipatingIds(torneo.config.participatingIds);
          }
        }

        try {
            const dataStats = await getTablaPosicionesService(selectedDivision.id, torneo.season);
            setStandings(dataStats || []);
        } catch (err) {
            console.error("Error cargando posiciones:", err);
            setStandings([]);
        }
      } else {
        setStandings([]);
      }

      // 2. Buscar equipos
      const { data: teams } = await supabase
        .from('teams')
        .select('*, players(id)')
        .eq('division_id', selectedDivision.id)
        .order('name');
        
      if (teams) {
        const processedTeams = teams.map(t => ({
            ...t,
            playerCount: t.players?.length || 0
        }));
        setAllTeams(processedTeams);
        
        // Solo establecer defaults si NO hay torneo activo y NO hemos recuperado IDs
        if (!torneo) { 
            const defaultParticipating = processedTeams
                .filter(t => t.status === 'Activo' && t.playerCount >= form.minPlayers)
                .map(t => t.id);
            setParticipatingIds(defaultParticipating);
        }
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Error al cargar datos iniciales", "error");
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- Handlers de UI ---

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

  // --- LÓGICA PRINCIPAL: INICIAR TORNEO ---
  const handleSubmit = async () => {
    if (activeTournament) return; 

    // 1. Validaciones
    if (!selectedDivision || !form.season || !form.startDate) {
      showToast("Por favor completa División, Temporada y Fecha de Inicio", "warning");
      return;
    }

    setLoading(true);
    try {
      const numEquipos = participatingIds.length;
      
      if (numEquipos < 2) {
        throw new Error("Necesitas al menos 2 equipos para iniciar un torneo.");
      }

      const jornadasPorVuelta = numEquipos % 2 === 0 ? numEquipos - 1 : numEquipos;
      const totalJornadasCalc = form.vueltas === "2" ? jornadasPorVuelta * 2 : jornadasPorVuelta;

      const jornadasArray = Array.from({ length: totalJornadasCalc }, (_, i) => ({
        name: `Jornada ${i + 1}`
      }));

      // --- FIX: GUARDAR LOS IDS DE PARTICIPANTES EN LA CONFIG ---
      const configData = {
        format: form.format,
        vueltas: form.vueltas,
        tieBreakType: form.tieBreakType,
        participatingIds: participatingIds, // <--- GUARDAMOS LOS IDS AQUÍ
        ...reglas 
      };

      await iniciarTorneoService({
        divisionName: selectedDivision.name,
        season: form.season,
        startDate: form.startDate,
        config: configData,
        jornadas: jornadasArray
      });

      showToast("¡Torneo iniciado correctamente!", "success");

      await fetchData(); 

    } catch (error) {
      console.error(error);
      showToast("Error al iniciar torneo: " + (error.message || error.details), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 3. RENDERIZAMOS EL TOAST */}
      <Toast 
          show={toastConfig.show} 
          message={toastConfig.message} 
          type={toastConfig.type} 
          onClose={() => setToastConfig({ ...toastConfig, show: false })}
      />

      <TorneosTemplate
        loading={loading}
        isLoadingData={isLoadingData}
        divisionName={selectedDivision?.name}
        activeTournament={activeTournament}
        
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        
        reglas={reglas}
        setReglas={setReglas}

        allTeams={allTeams}
        participatingIds={participatingIds}
        onInclude={moveTeamToParticipating}
        onExclude={moveTeamToExcluded}
        minPlayers={form.minPlayers} 
        
        standings={standings}
      />
    </>
  );
}
