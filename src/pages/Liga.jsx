import React from "react";
import { LigaTemplate } from "../components/template/LigaTemplate";
import { useLigaLogic } from "../hooks/pages/useLigaLogic";

export function Liga({ state, setState }) {
  const { state: logicState, actions } = useLigaLogic();

  return (
    <LigaTemplate
      state={state}
      setState={setState}

      loading={logicState.loading}
      standings={logicState.standings}
      division={logicState.allDivisions[0]}
      season={logicState.season}
      leagueData={logicState.leagueData}
      allDivisions={logicState.allDivisions}
      referees={logicState.referees}
      
      onUpdateLeague={actions.handleUpdateLeague}
      
      // -- NUEVAS PROPS DE CATEGORÍA --
      onAddCategory={actions.handleAddCategory}
      onEditCategory={actions.handleEditCategory}
      onDeleteCategory={actions.handleDeleteCategory}

      // -- DIVISIONES --
      onAddDivision={actions.handleAddDivision}
      onEditDivision={actions.handleEditDivision}
      onDeleteDivision={actions.handleDeleteDivision}
      
      // -- ÁRBITROS --
      onAddReferee={actions.handleAddReferee}
      onEditReferee={actions.handleEditReferee}
      onDeleteReferee={actions.handleDeleteReferee}
    />
  );
}