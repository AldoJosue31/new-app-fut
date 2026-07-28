"use client";

import React from "react";
import { EquiposTemplate } from "../components/template/EquiposTemplate";
import { useEquiposLogic } from "../hooks/pages/useEquiposLogic";

export function Equipos({
  state,
  setState,
  routeDivisionId,
  teamId,
  initialView,
  navigate,
}) {
  const logic = useEquiposLogic({ routeDivisionId });
  const { data, form, modals, actions } = logic;

  return (
    <EquiposTemplate
      state={state}
      setState={setState}
      routeDivisionId={routeDivisionId}
      teamId={teamId}
      initialView={initialView}
      navigate={navigate}
      {...logic}
      equipos={data.equipos}
      division={data.selectedDivision}
      loading={data.loading}
      isUploading={data.uploading}
      participatingIds={data.participatingIds}
      participationLoading={data.participationLoading}
      delegateBindingsLoading={data.delegateBindingsLoading}
      delegateBindingsError={data.delegateBindingsError}
      accessRole={data.accessRole}
      canCreateTeams={data.canCreateTeams}
      canDeleteTeams={data.canDeleteTeams}
      canTransferTeams={data.canTransferTeams}
      requestSummariesLoading={data.requestSummariesLoading}
      delegateRequestOverview={data.delegateRequestOverview}
      form={form.data}
      preview={form.preview}
      file={form.file}
      originalFile={form.originalFile}
      onFormChange={form.handleChange}
      onFileChange={form.handleFileChange}
      onClearImage={form.handleClearImage}
      onGenerateLogo={form.handleGenerateLogo}
      onRemoveBg={form.handleRemoveBg}
      onSave={actions.handleSave}
      isFormOpen={modals.isFormOpen}
      setIsFormOpen={modals.setIsFormOpen}
      teamToEdit={modals.teamToEdit}
      isDeleteModalOpen={modals.isDeleteModalOpen}
      setIsDeleteModalOpen={modals.setIsDeleteModalOpen}
      onDelete={actions.openDeleteConfirmation}
      onConfirmDelete={actions.confirmDelete}
      onCreate={actions.openCreateModal}
      onEdit={actions.openEditModal}
      onDelegateLinkStateChanged={actions.handleDelegateLinkStateChanged}
      onDelegateRequestSubmitted={actions.refreshDelegateRequestSummaries}
      onTeamTransferred={actions.applyTeamTransferLocally}
    />
  );
}
