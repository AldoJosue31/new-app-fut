import React, { useState, useEffect } from "react";
import { EquiposTemplate } from "../components/template/EquiposTemplate";
import { useDivisionStore } from "../store/DivisionStore";
import { useEquiposStore } from "../store/EquiposStore"; // Importamos el nuevo store
import { supabase } from "../supabase/supabase.config";
import { generateTeamLogo } from "../utils/logoGenerator";
import { removeBackground } from "../utils/imageProcessor";

export function Equipos() {
  const { selectedDivision } = useDivisionStore();
  
  // Usamos el store global en lugar de estado local para datos
  const { equipos, loading, fetchEquipos, addEquipoLocal, updateEquipoLocal, deleteEquipoLocal } = useEquiposStore();
  
  const [uploading, setUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const initialForm = {
    name: "",
    color: "#000000",
    delegate_name: "",
    contact_phone: "",
    status: "Activo",
    logo_url: null
  };
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [teamToView, setTeamToView] = useState(null);

  // 1. Estado para guardar el ID del equipo a eliminar
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Carga inteligente: solo pide datos si cambia la división
  useEffect(() => {
    if (selectedDivision) {
        fetchEquipos(selectedDivision.id);
    }
  }, [selectedDivision, fetchEquipos]);

  // --- LÓGICA DE IMÁGENES Y FORMULARIO ---
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getDominantColor = (imageFile) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1; canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            resolve(hex);
        };
        img.onerror = () => resolve("#000000");
    });
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      try {
        const dominantColor = await getDominantColor(selectedFile);
        setForm(prev => ({ ...prev, color: dominantColor }));
      } catch (error) {
        console.error("No se pudo extraer color", error);
      }
    }
  };

  const handleClearImage = (e) => {
    e.preventDefault(); e.stopPropagation();
    setFile(null);
    setPreview(null);
    setForm(prev => ({ ...prev, logo_url: null }));
  };

  const handleGenerateLogo = async () => {
    if (!form.name) return alert("Escribe el nombre del equipo primero");
    try {
      const { file: genFile, preview: genPreview } = await generateTeamLogo(form.name, form.color);
      setFile(genFile);
      setPreview(genPreview);
    } catch (error) {
      console.error("Error generando logo:", error);
    }
  };

  const handleRemoveBg = async () => {
    if (!file) return alert("Sube una imagen primero");
    try {
      const { file: cleanFile, preview: cleanPreview } = await removeBackground(file);
      setFile(cleanFile);
      setPreview(cleanPreview);
    } catch (error) {
      alert("Error procesando imagen");
    }
  };

  // --- CRUD ACTIONS (Optimizadas con Store) ---

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedDivision) return alert("Selecciona una división");
    setUploading(true);

    try {
      let logoUrl = form.logo_url;
      
      if (teamToEdit && file && teamToEdit.logo_url) {
        const oldName = teamToEdit.logo_url.split('/').pop();
        await supabase.storage.from('logos').remove([oldName]);
      }

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${fileExt}`;
        const { error: upError } = await supabase.storage.from('logos').upload(fileName, file);
        if (upError) throw upError;
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
        logoUrl = urlData.publicUrl;
      }

      const teamData = {
        name: form.name,
        color: form.color,
        delegate_name: form.delegate_name,
        contact_phone: form.contact_phone,
        status: form.status,
        logo_url: logoUrl,
        division_id: selectedDivision.id
      };

      if (teamToEdit) {
        // UPDATE
        const { data, error } = await supabase.from('teams').update(teamData).eq('id', teamToEdit.id).select();
        if (error) throw error;
        // Actualizamos store localmente (sin re-fetch)
        updateEquipoLocal(data[0]);
        alert("Equipo actualizado");
      } else {
        // CREATE
        const { data, error } = await supabase.from('teams').insert(teamData).select();
        if (error) throw error;
        // Agregamos al store localmente (sin re-fetch)
        addEquipoLocal(data[0]);
        alert("Equipo registrado");
      }

      setIsFormOpen(false);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

const openDeleteConfirmation = (id) => {
      setDeleteId(id);
      setIsDeleteModalOpen(true);
  };

  // 3. Esta función ejecuta el borrado real (se pasa al modal)
  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      // Tu lógica existente de borrado de Supabase...
      const { data: team } = await supabase.from('teams').select('logo_url').eq('id', deleteId).single();
      // ... (resto de lógica de storage y delete) ...
      await supabase.from('teams').delete().eq('id', deleteId);
      
      deleteEquipoLocal(deleteId); // Actualizar store
      
      setIsDeleteModalOpen(false); // Cerrar modal
      setDeleteId(null);
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  // --- MODALES ---
  const openCreateModal = () => {
    setTeamToEdit(null);
    setForm(initialForm);
    setFile(null);
    setPreview(null);
    setIsFormOpen(true);
  };

  const openEditModal = (team) => {
    setTeamToEdit(team);
    setForm(team);
    setFile(null);
    setPreview(team.logo_url);
    setIsFormOpen(true);
  };

  const openDetailModal = (team) => {
    setTeamToView(team);
    setIsDetailOpen(true);
  };

  return (
    <EquiposTemplate 
      equipos={equipos}
      division={selectedDivision}
      loading={loading} // Viene del store
      isUploading={uploading}
      form={form}
      preview={preview}
      file={file}
      isFormOpen={isFormOpen}
      setIsFormOpen={setIsFormOpen}
      teamToEdit={teamToEdit}
      isDetailOpen={isDetailOpen}
      setIsDetailOpen={setIsDetailOpen}
      teamToView={teamToView}
      onFormChange={handleFormChange}
      onFileChange={handleFileChange}
      onClearImage={handleClearImage}
      onGenerateLogo={handleGenerateLogo}
      onRemoveBg={handleRemoveBg}
      onSave={handleSave}
      onDelete={openDeleteConfirmation}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onConfirmDelete={confirmDelete}
      onCreate={openCreateModal}
      onEdit={openEditModal}
      onView={openDetailModal}
    />
  );
}