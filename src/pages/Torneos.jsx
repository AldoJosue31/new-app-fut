import React from "react";
import { TorneosTemplate } from "../components/template/TorneosTemplate";
import { Toast } from "../components/atomos/Toast"; // Ajusta ruta si es necesario (según tu index)
import { useTorneosLogic } from "../hooks/pages/useTorneosLogic"; 

// Aceptamos las props que vienen del Router/App
export function Torneos({ state: sidebarState, setState: setSidebarState }) {
  // 1. Llamamos al hook y obtenemos la lógica interna de la página
  const { state, actions, formData, toast } = useTorneosLogic();

  return (
    <>
      <Toast 
          show={toast.show} 
          message={toast.message} 
          type={toast.type} 
          onClose={toast.close}
      />

      {/* 3. Pasamos las props al template de forma ordenada */}
      <TorneosTemplate
        // --- NUEVO: Pasamos el control del sidebar al template ---
        state={sidebarState}
        setState={setSidebarState}

        // Estados de carga y datos
        loading={state.loading}
        isLoadingData={state.isLoadingData}
        divisionName={state.divisionName}
        activeTournament={state.activeTournament}
        standings={state.standings}

        partidos={state.partidos}
        
        // Datos de equipos
        allTeams={state.allTeams}
        participatingIds={state.participatingIds}
        
        // Formularios y configuración
        form={formData.form}
        reglas={formData.reglas}
        minPlayers={formData.minPlayers}
        
        // Acciones / Handlers
        onChange={actions.handleChange}
        onSubmit={actions.handleSubmit}
        setReglas={actions.setReglas}
        onInclude={actions.onInclude}
        onExclude={actions.onExclude}
        refreshStandings={actions.refreshData}
        
        // Conectamos la recarga discreta
        onTournamentReset={actions.refreshData}
      />
    </>
  );
}