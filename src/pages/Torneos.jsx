import React from "react";
import { TorneosTemplate } from "../components/template/TorneosTemplate";
import { Toast } from "../components/atomos/Toast"; 
import { useTorneosLogic } from "../hooks/pages/useTorneosLogic"; 

export function Torneos({ state: sidebarState, setState: setSidebarState }) {
  const { state, actions, formData, toast } = useTorneosLogic();

  return (
    <>
      <Toast 
          show={toast.show} 
          message={toast.message} 
          type={toast.type} 
          onClose={toast.close}
      />

      <TorneosTemplate
        state={sidebarState}
        setState={setSidebarState}

        loading={state.loading}
        isLoadingData={state.isLoadingData}
        divisionName={state.divisionName}
        activeTournament={state.activeTournament}
        standings={state.standings}
        partidos={state.partidos}
        
        // <-- NUEVO: Pasamos la data de la liga a la plantilla
        leagueData={state.leagueData} 
        
        allTeams={state.allTeams}
        participatingIds={state.participatingIds}
        
        form={formData.form}
        reglas={formData.reglas}
        minPlayers={formData.minPlayers}
        
        onChange={actions.handleChange}
        onSubmit={actions.handleSubmit}
        setReglas={actions.setReglas}
        onInclude={actions.onInclude}
        onExclude={actions.onExclude}
        refreshStandings={actions.refreshData}
        onTournamentReset={actions.refreshData}
      />
    </>
  );
}