import React, { useEffect } from "react";
import { preloadBackgroundRemoval } from "../utils/imageProcessor";
import { EquiposTemplate } from "../components/template/EquiposTemplate";
import { useEquiposLogic } from "../hooks/pages/useEquiposLogic";

export function Equipos() {
  // 1. Optimización: Precargamos el modelo de IA al entrar a la página
  useEffect(() => {
    preloadBackgroundRemoval();
  }, []);

  const logic = useEquiposLogic();
  const { data, form, modals, actions } = logic;

  return (
    <EquiposTemplate 
      {...logic}
      // --- DATOS ---
      equipos={data.equipos}
      division={data.selectedDivision}
      loading={data.loading}
      isUploading={data.uploading}
      participatingIds={data.participatingIds} // <--- ¡AQUÍ ESTÁ LA CLAVE! Sin esto no se ve la insignia
      
      // --- FORMULARIO E IMÁGENES ---
      form={form.data}
      preview={form.preview}
      file={form.file}
      onFormChange={form.handleChange}
      onFileChange={form.handleFileChange}
      onClearImage={form.handleClearImage}
      onGenerateLogo={form.handleGenerateLogo}
      onRemoveBg={form.handleRemoveBg}
      onSave={actions.handleSave}

      // --- MODALES Y ESTADOS ---
      isFormOpen={modals.isFormOpen}
      setIsFormOpen={modals.setIsFormOpen}
      teamToEdit={modals.teamToEdit}
      
      isDetailOpen={modals.isDetailOpen}
      setIsDetailOpen={modals.setIsDetailOpen}
      teamToView={modals.teamToView}
      
      isDeleteModalOpen={modals.isDeleteModalOpen}
      setIsDeleteModalOpen={modals.setIsDeleteModalOpen}
      
      // --- ACCIONES CRUD ---
      onDelete={actions.openDeleteConfirmation}
      onConfirmDelete={actions.confirmDelete}
      onCreate={actions.openCreateModal}
      onEdit={actions.openEditModal}
      onView={actions.openDetailModal}
    />
  );
}