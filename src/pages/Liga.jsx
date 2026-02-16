import React from "react";
import { LigaTemplate } from "../components/template/LigaTemplate";
import { useLigaLogic } from "../hooks/pages/useLigaLogic";

export function Liga({ state, setState }) { // <--- Recibimos props
  const { state: logicState, actions } = useLigaLogic();

  return (
    <LigaTemplate
      // Pasamos control del Sidebar
      state={state}
      setState={setState}

      // Datos
      loading={logicState.loading}
      standings={logicState.standings}
      division={logicState.allDivisions[0]}
      season={logicState.season}
      leagueData={logicState.leagueData}
      allDivisions={logicState.allDivisions}
      referees={logicState.referees}
      
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