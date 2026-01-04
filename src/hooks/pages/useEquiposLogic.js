import { useState, useEffect } from "react";
import { useDivisionStore } from "../../store/DivisionStore";
import { useEquiposStore } from "../../store/EquiposStore";
import { supabase } from "../../supabase/supabase.config";
import { generateTeamLogo } from "../../utils/logoGenerator";
import { removeBackground, compressImage } from "../../utils/imageProcessor";
import { TEAM_STATUS } from "../../utils/constants";

export const useEquiposLogic = () => {
  const { selectedDivision } = useDivisionStore();
  const { equipos, loading, fetchEquipos, addEquipoLocal, updateEquipoLocal, deleteEquipoLocal } = useEquiposStore();
  
  const [uploading, setUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Modales y Selecciones
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [teamToView, setTeamToView] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const initialForm = {
    name: "",
    color: "#000000",
    delegate_name: "",
    contact_phone: "",
    status: TEAM_STATUS.ACTIVE,
    logo_url: null
  };
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // --- EFFECT ---
  useEffect(() => {
    if (selectedDivision) {
        fetchEquipos(selectedDivision.id);
    }
  }, [selectedDivision, fetchEquipos]);

  // --- LOGIC: IMÁGENES ---
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

  // --- CRUD ACTIONS ---
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
        alert("Equipo actualizado");
      } else {
        const { data, error } = await supabase.from('teams').insert(teamData).select();
        if (error) throw error;
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

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('teams').delete().eq('id', deleteId);
      deleteEquipoLocal(deleteId); 
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  // Handlers de UI
  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const openCreateModal = () => { setTeamToEdit(null); setForm(initialForm); setFile(null); setPreview(null); setIsFormOpen(true); };
  const openEditModal = (team) => { setTeamToEdit(team); setForm(team); setFile(null); setPreview(team.logo_url); setIsFormOpen(true); };
  const openDetailModal = (team) => { setTeamToView(team); setIsDetailOpen(true); };
  const openDeleteConfirmation = (id) => { setDeleteId(id); setIsDeleteModalOpen(true); };

  return {
    data: {
        equipos,
        loading,
        selectedDivision,
        uploading
    },
    form: {
        data: form,
        file,
        preview,
        handleChange: handleFormChange,
        handleFileChange,
        handleClearImage,
        handleGenerateLogo,
        handleRemoveBg
    },
    modals: {
        isFormOpen, setIsFormOpen,
        isDetailOpen, setIsDetailOpen,
        isDeleteModalOpen, setIsDeleteModalOpen,
        teamToEdit,
        teamToView
    },
    actions: {
        handleSave,
        confirmDelete,
        openCreateModal,
        openEditModal,
        openDetailModal,
        openDeleteConfirmation
    }
  };
};