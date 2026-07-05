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
      leagueData={logicState.leagueData}
      referees={logicState.referees}
      delegateRequests={logicState.delegateRequests}
      delegateRequestsLoading={logicState.delegateRequestsLoading}
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
      onReviewDelegateRequest={actions.handleReviewDelegateRequest}
      onRefreshDelegateRequests={actions.refreshDelegateRequests}
    />
  );
}
