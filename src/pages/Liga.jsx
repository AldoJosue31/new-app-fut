import React from "react";
import { LigaTemplate } from "../components/template/LigaTemplate";
import { useLigaLogic } from "../hooks/pages/useLigaLogic";

export function Liga() {
  const { state, actions } = useLigaLogic();

  return (
    <LigaTemplate
      // Datos
      loading={state.loading}
      standings={state.standings}
      division={state.allDivisions[0]}
      season={state.season}
      leagueData={state.leagueData}
      allDivisions={state.allDivisions}
      referees={state.referees}
      
      // Funciones
      onUpdateLeague={actions.handleUpdateLeague}
      onAddDivision={actions.handleAddDivision}
      onEditDivision={actions.handleEditDivision}
      onDeleteDivision={actions.handleDeleteDivision}
      onAddReferee={actions.handleAddReferee}
      onEditReferee={actions.handleEditReferee}
      onDeleteReferee={actions.handleDeleteReferee}
    />
  );
}