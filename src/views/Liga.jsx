"use client";

import React from "react";
import { LigaTemplate } from "../components/template/LigaTemplate";
import { useLigaLogic } from "../hooks/pages/useLigaLogic";

export function Liga({ state, setState, routeTab }) {
  const { state: logicState, actions } = useLigaLogic();

  return (
    <LigaTemplate
      routeTab={routeTab}
      state={state}
      setState={setState}
      loading={logicState.loading}
      leagueData={logicState.leagueData}
      referees={logicState.referees}
      onUpdateLeague={actions.handleUpdateLeague}
      onAddCategory={actions.handleAddCategory}
      onEditCategory={actions.handleEditCategory}
      onDeleteCategory={actions.handleDeleteCategory}
      onAddDivision={actions.handleAddDivision}
      onEditDivision={actions.handleEditDivision}
      onDeleteDivision={actions.handleDeleteDivision}
      onAddReferee={actions.handleAddReferee}
      onEditReferee={actions.handleEditReferee}
      onDeleteReferee={actions.handleDeleteReferee}
    />
  );
}
