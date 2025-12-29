import React, { useState, useEffect } from "react";
import { TorneosTemplate } from "../components/template/TorneosTemplate";
import { generarFixture, iniciarTorneoService } from "../services/torneos";
import { supabase } from "../supabase/supabase.config";
import { useDivisionStore } from "../store/DivisionStore";

export function Torneos() {
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { selectedDivision } = useDivisionStore();
  
  const [activeTournament, setActiveTournament] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [participatingIds, setParticipatingIds] = useState([]);

  // --- CAMBIO: INICIALIZACIÓN DEL ESTADO DESDE LOCALSTORAGE ---
  const [form, setForm] = useState(() => {
    // Intentamos leer lo guardado
    const savedRules = localStorage.getItem("torneo_reglas_draft");
    
    if (savedRules) {
      return JSON.parse(savedRules);
    }
    
    // Si no hay nada guardado, usamos los valores por defecto
    return {
      season: "",
      startDate: new Date().toISOString().split('T')[0],
      vueltas: "1",       
      ascensos: "",
      descensos: "",
      zonaLiguilla: false,
      clasificados: "8",
      minPlayers: 7,
      maxPlayers: 20,
      maxTeams: 12,
      tieBreakType: "normal",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      playoffTieBreak: "position",
    };
  });

  useEffect(() => {
    if (selectedDivision) {
      fetchData();
    } else {
        // Si no hay división seleccionada, dejamos de cargar para no bloquear la UI eternamente
        setIsLoadingData(false);
    }
  }, [selectedDivision]);

  const fetchData = async () => {
    // Reiniciamos a true si cambia la división para mostrar skeletons de nuevo
    setIsLoadingData(true); 

    try {
      // 1. Buscar torneo activo
      const { data: torneo } = await supabase
        .from('tournaments')
        .select('*')
        .eq('division_id', selectedDivision.id)
        .eq('status', 'En Curso')
        .maybeSingle();
      
      setActiveTournament(torneo);

      // 2. Buscar equipos Y contar sus jugadores
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

        // Selección inicial
        const defaultParticipating = processedTeams
            .filter(t => t.status === 'Activo' && t.playerCount >= form.minPlayers)
            .map(t => t.id);
            
        setParticipatingIds(defaultParticipating);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      // === CAMBIO 2: APAGAR EL LOADING AL TERMINAR ===
      // Esto asegura que los skeletons desaparezcan ya sea con éxito o error
      setIsLoadingData(false);
    }
  };

  // --- GESTIÓN DE LISTAS ---
  const moveTeamToParticipating = (teamId) => {
    if (participatingIds.length >= form.maxTeams) {
        return alert(`No puedes agregar más equipos. El límite configurado es de ${form.maxTeams}.`);
    }
    setParticipatingIds(prev => [...prev, teamId]);
  };

  const moveTeamToExcluded = (teamId) => {
    setParticipatingIds(prev => prev.filter(id => id !== teamId));
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const equiposParticipantes = allTeams.filter(t => participatingIds.includes(t.id));

    if (!selectedDivision) return alert("Selecciona una división");
    if (activeTournament) return alert("Ya hay un torneo en curso");
    if (equiposParticipantes.length < 2) return alert("Necesitas al menos 2 equipos participantes.");
    
    if (equiposParticipantes.length > form.maxTeams) {
        return alert(`Has seleccionado ${equiposParticipantes.length} equipos, pero el máximo configurado es ${form.maxTeams}.`);
    }

    if (form.zonaLiguilla) {
        const numClasificados = parseInt(form.clasificados);
        const numEquipos = equiposParticipantes.length;
        if (numClasificados > numEquipos) {
            return alert(`Error: Clasifican ${numClasificados} a liguilla pero solo hay ${numEquipos} equipos.`);
        }
    }

    setLoading(true);
    try {
      const dobleVuelta = form.vueltas === "2";
      const fixture = generarFixture(equiposParticipantes, dobleVuelta);

      await iniciarTorneoService({
        divisionId: selectedDivision.id,
        divisionName: selectedDivision.name,
        season: form.season,
        startDate: form.startDate,
        totalJornadas: fixture.length,
      });

      alert("¡Torneo iniciado correctamente!");
      localStorage.removeItem("torneo_reglas_draft");
      fetchData(); 
      
    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TorneosTemplate
      form={form}
      onChange={handleChange}
      onSubmit={handleSubmit}
      loading={loading} // Loading del botón guardar
      
      // === CAMBIO 3: PASAR EL ESTADO DE CARGA ===
      isLoadingData={isLoadingData} 

      divisionName={selectedDivision?.name}
      activeTournament={activeTournament}
      
      allTeams={allTeams}
      participatingIds={participatingIds}
      onInclude={moveTeamToParticipating}
      onExclude={moveTeamToExcluded}
      minPlayers={form.minPlayers} 
    />
  );
}