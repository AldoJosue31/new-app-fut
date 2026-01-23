import React, { useEffect } from "react"; // CORRECCIÓN: Se agrega { useEffect }
import { preloadBackgroundRemoval } from "../utils/imageProcessor";
import { EquiposTemplate } from "../components/template/EquiposTemplate";
import { useEquiposLogic } from "../hooks/pages/useEquiposLogic";

export function Equipos() {
  // Limpieza: Solo llamamos a la lógica una vez
  const logic = useEquiposLogic();
  const { data, form, modals, actions } = logic;

  return (
    <EquiposTemplate 
      {...logic}
      // Datos
      equipos={data.equipos}
      division={data.selectedDivision}
      loading={data.loading}
      isUploading={data.uploading}
      
      // Formulario e Imágenes
      form={form.data}
      preview={form.preview}
      file={form.file}
      onFormChange={form.handleChange}
      onFileChange={form.handleFileChange}
      onClearImage={form.handleClearImage}
      onGenerateLogo={form.handleGenerateLogo}
      onRemoveBg={form.handleRemoveBg}
      onSave={actions.handleSave}

      // Modales y Estados
      isFormOpen={modals.isFormOpen}
      setIsFormOpen={modals.setIsFormOpen}
      teamToEdit={modals.teamToEdit}
      
      isDetailOpen={modals.isDetailOpen}
      setIsDetailOpen={modals.setIsDetailOpen}
      teamToView={modals.teamToView}
      
      isDeleteModalOpen={modals.isDeleteModalOpen}
      setIsDeleteModalOpen={modals.setIsDeleteModalOpen}
      
      // Acciones CRUD
      onDelete={actions.openDeleteConfirmation}
      onConfirmDelete={actions.confirmDelete}
      onCreate={actions.openCreateModal}
      onEdit={actions.openEditModal}
      onView={actions.openDetailModal}
    />
  );
}