import React from "react";
import { TorneosTemplate } from "../components/template/TorneosTemplate";
import { Toast } from "../index"; // O "../components/atomos/Toast"
import { useTorneosLogic } from "../hooks/pages/useTorneosLogic"; // Importamos el hook

export function Torneos() {
  // 1. Llamamos al hook y obtenemos todo lo necesario
  const { state, actions, formData, toast } = useTorneosLogic();

  return (
    <>
      {/* 2. El Toast se renderiza aquí pero su lógica viene del hook */}
      <Toast 
          show={toast.show} 
          message={toast.message} 
          type={toast.type} 
          onClose={toast.close}
      />

      {/* 3. Pasamos las props al template de forma ordenada */}
      <TorneosTemplate
        // Estados de carga y datos
        loading={state.loading}
        isLoadingData={state.isLoadingData}
        divisionName={state.divisionName}
        activeTournament={state.activeTournament}
        standings={state.standings}
        
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
      />
    </>
  );
}