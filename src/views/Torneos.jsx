"use client";

import React from "react";
import { TorneosTemplate } from "../components/template/TorneosTemplate";
import { useTorneosLogic } from "../hooks/pages/useTorneosLogic"; 
import { useDivisionNavigationCompletion } from "../hooks/useDivisionNavigationCompletion";

export function Torneos({
  jornadaId,
  navigate,
  pathname,
  routeDivisionId,
  state: sidebarState,
  setState: setSidebarState,
  tab,
  tournamentOrTab,
}) {
  const { state, actions, formData } = useTorneosLogic({
    routeDivisionId,
  });
  const isDivisionContentReady =
    !state.isLoadingData &&
    Boolean(state.divisionName) &&
    String(state.divisionId || "") === String(routeDivisionId || "");

  useDivisionNavigationCompletion({
    divisionId: state.divisionId,
    isReady: isDivisionContentReady,
  });

  return (
    <TorneosTemplate
        state={sidebarState}
        setState={setSidebarState}
        jornadaId={jornadaId}
        navigate={navigate}
        pathname={pathname}
        routeDivisionId={routeDivisionId}
        tab={tab}
        tournamentOrTab={tournamentOrTab}

        loading={state.loading}
        isLoadingData={state.isLoadingData}
        currentDivisionId={state.divisionId}
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
        onResetSetupDraft={actions.resetDraftToLeagueRules}
    />
  );
}
