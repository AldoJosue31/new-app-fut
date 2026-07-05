import React, { useEffect } from "react";
import { preloadBackgroundRemoval } from "../utils/imageProcessor";
import { EquiposTemplate } from "../components/template/EquiposTemplate";
import { useEquiposLogic } from "../hooks/pages/useEquiposLogic";

export function Equipos({ state, setState }) {
  useEffect(() => {
    preloadBackgroundRemoval();
  }, []);

  const logic = useEquiposLogic();
  const { data, form, modals, actions } = logic;

  return (
    <EquiposTemplate
      state={state}
      setState={setState}
      {...logic}
      equipos={data.equipos}
      division={data.selectedDivision}
      loading={data.loading}
      isUploading={data.uploading}
      participatingIds={data.participatingIds}
      accessRole={data.accessRole}
      canCreateTeams={data.canCreateTeams}
      canDeleteTeams={data.canDeleteTeams}
      canTransferTeams={data.canTransferTeams}
      canInviteDelegates={data.canInviteDelegates}
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
      isDetailOpen={modals.isDetailOpen}
      setIsDetailOpen={modals.setIsDetailOpen}
      teamToView={modals.teamToView}
      isDeleteModalOpen={modals.isDeleteModalOpen}
      setIsDeleteModalOpen={modals.setIsDeleteModalOpen}
      onDelete={actions.openDeleteConfirmation}
      onConfirmDelete={actions.confirmDelete}
      onCreate={actions.openCreateModal}
      onEdit={actions.openEditModal}
      onView={actions.openDetailModal}
      onDelegateLinkStateChanged={actions.handleDelegateLinkStateChanged}
      onDelegateRequestSubmitted={actions.refreshDelegateRequestSummaries}
    />
  );
}
