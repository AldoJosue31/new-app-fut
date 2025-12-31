import React, { useState, useEffect } from "react";
import { EquiposTemplate } from "../components/template/EquiposTemplate";
import { useDivisionStore } from "../store/DivisionStore";
import { useEquiposStore } from "../store/EquiposStore"; 
import { supabase } from "../supabase/supabase.config";
import { generateTeamLogo } from "../utils/logoGenerator";
import { removeBackground, compressImage } from "../utils/imageProcessor";

export function Equipos() {
  const { selectedDivision } = useDivisionStore();
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

  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (selectedDivision) {
        fetchEquipos(selectedDivision.id);
    }
  }, [selectedDivision, fetchEquipos]);

  // --- HELPER PARA EXTRAER RUTA DE SUPABASE ---
  const getPathFromUrl = (fullUrl) => {
    if (!fullUrl || !fullUrl.includes('supabase.co')) return null;
    try {
        // Asumiendo que tus archivos están en el bucket 'logos'
        const bucketName = 'logos'; 
        const parts = fullUrl.split(`/${bucketName}/`);
        if (parts.length < 2) return null;
        // Retorna la parte después del bucket (ej: "nombre_archivo.png") y quita query params
        return parts[1].split('?')[0];
    } catch (e) {
        console.error("Error extrayendo path:", e);
        return null;
    }
  };

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

  const handleFileChange = async (eOrFile) => {
    let selectedFile = eOrFile.target ? eOrFile.target.files[0] : eOrFile;
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
    if (!form.name) return alert("Escribe el nombre del equipo primero"); // Este alert es local y rápido, no afecta el flujo final
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
      console.error("Error procesando imagen", error);
    }
  };

  // --- CRUD ACTIONS ---

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedDivision) throw new Error("Selecciona una división primero");

    setUploading(true);

    try {
      let logoUrl = form.logo_url;
      
      // 1. Si estamos editando Y hay un archivo nuevo Y el equipo ya tenía logo: BORRAR EL ANTERIOR
      if (teamToEdit && file && teamToEdit.logo_url) {
        const oldPath = getPathFromUrl(teamToEdit.logo_url);
        if (oldPath) {
            console.log("Eliminando logo anterior:", oldPath);
            const { error: removeError } = await supabase.storage.from('logos').remove([oldPath]);
            if (removeError) console.warn("No se pudo eliminar el logo anterior:", removeError);
        }
      }

      // 2. Subir el nuevo archivo si existe
      if (file) {
        const compressedFile = await compressImage(file, 600, 0.8);
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${fileExt}`;
        
        const { error: upError } = await supabase.storage.from('logos').upload(fileName, compressedFile);
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
        const { data, error } = await supabase.from('teams').update(teamData).eq('id', teamToEdit.id).select();
        if (error) throw error;
        updateEquipoLocal(data[0]);
      } else {
        const { data, error } = await supabase.from('teams').insert(teamData).select();
        if (error) throw error;
        addEquipoLocal(data[0]);
      }

      setIsFormOpen(false);
    } catch (error) {
      throw error; // El Toast capturará esto
    } finally {
      setUploading(false);
    }
  };

  const openDeleteConfirmation = (id) => {
      setDeleteId(id);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      // 1. Obtener datos del equipo antes de borrar para saber su logo
      const { data: team, error: fetchError } = await supabase
        .from('teams')
        .select('logo_url')
        .eq('id', deleteId)
        .single();
        
      if (fetchError) throw fetchError;

      // 2. Si tiene logo, borrarlo del Storage
      if (team?.logo_url) {
         const path = getPathFromUrl(team.logo_url);
         if (path) {
             console.log("Eliminando imagen asociada:", path);
             await supabase.storage.from('logos').remove([path]);
         }
      }

      // 3. Borrar el registro de la base de datos
      const { error: deleteError } = await supabase.from('teams').delete().eq('id', deleteId);
      if (deleteError) throw deleteError;
      
      deleteEquipoLocal(deleteId); 
      
      setIsDeleteModalOpen(false); 
      setDeleteId(null);
    } catch (error) {
      throw error; // El Toast capturará esto
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
      loading={loading}
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