import { useState, useEffect } from "react";
import { useDivisionStore } from "../../store/DivisionStore";
import { useEquiposStore } from "../../store/EquiposStore";
import { supabase } from "../../supabase/supabase.config";
import { generateTeamLogo } from "../../utils/logoGenerator";
import { removeBackground } from "../../utils/imageProcessor";
import { TEAM_STATUS } from "../../utils/constants";
import { getTorneoActivo } from "../../services/torneos";
// IMPORTANTE: Importamos la utilidad de subida
import { uploadImageToSupabase } from "../../utils/uploadHandler";

export const useEquiposLogic = () => {
  const { selectedDivision } = useDivisionStore();
  const {
    equipos,
    loading,
    fetchEquipos,
    addEquipoLocal,
    updateEquipoLocal,
    deleteEquipoLocal,
    resetStore
  } = useEquiposStore();

  const [uploading, setUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [teamToEdit, setTeamToEdit] = useState(null);
  const [teamToView, setTeamToView] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [participatingIds, setParticipatingIds] = useState([]);

  const initialForm = {
    name: "",
    color: "#000000",
    delegate_name: "",
    contact_phone: "",
    status: TEAM_STATUS?.ACTIVE || "Activo",
    logo_url: null,
    original_logo_url: null // Agregamos el campo para la original
  };

  const [form, setForm] = useState(initialForm);
  
  // ESTADOS DE IMAGEN
  const [file, setFile] = useState(null); // El crop
  const [originalFile, setOriginalFile] = useState(null); // El original
  const [preview, setPreview] = useState(null);

  // Carga de equipos
  useEffect(() => {
    if (selectedDivision?.id) {
      fetchEquipos(selectedDivision.id);
    } else {
      resetStore();
    }
  }, [selectedDivision, fetchEquipos, resetStore]);

  // Verificación de torneos
  useEffect(() => {
    const fetchTournamentStatus = async () => {
      setParticipatingIds([]); 
      if (selectedDivision?.id) {
        try {
          const torneo = await getTorneoActivo(selectedDivision.id);
          if (torneo && torneo.config && Array.isArray(torneo.config.participatingIds)) {
            setParticipatingIds(torneo.config.participatingIds);
          }
        } catch (error) {
          console.error("Error verificando estado de torneo:", error);
        }
      }
    };
    fetchTournamentStatus();
  }, [selectedDivision]);

  // Limpieza de memoria
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        try { URL.revokeObjectURL(preview); } catch (e) { /* ignore */ }
      }
    };
  }, [preview]);

  const getDominantColor = (imageFile) => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(imageFile);
      img.crossOrigin = "Anonymous";
      img.src = objectUrl;
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = 1;
          canvas.height = 1;
          ctx.drawImage(img, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          URL.revokeObjectURL(objectUrl);
          resolve(hex);
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          resolve("#000000");
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve("#000000");
      };
    });
  };

  /**
   * MANEJO DE ARCHIVOS ACTUALIZADO
   * Ahora recibe el evento estándar O un objeto personalizado desde PhotoUploader
   */
  const handleFileChange = async (eOrData) => {
    let selectedFile = null;
    let selectedOriginal = null;

    // Caso 1: Viene desde PhotoUploader personalizado { target: { files: [...] }, original: File }
    if (eOrData?.original) {
        selectedFile = eOrData.target.files[0];
        selectedOriginal = eOrData.original;
    } 
    // Caso 2: Viene de un input file normal (event)
    else if (eOrData?.target?.files) {
        selectedFile = eOrData.target.files[0];
        selectedOriginal = eOrData.target.files[0]; // Si es directo, el original es el mismo
    }

    if (selectedFile) {
      if (preview && preview.startsWith("blob:")) {
        try { URL.revokeObjectURL(preview); } catch (e) { /* ignore */ }
      }
      
      setFile(selectedFile);
      setOriginalFile(selectedOriginal); // Guardamos el original
      
      const newPreview = URL.createObjectURL(selectedFile);
      setPreview(newPreview);

      // Extraer color si es nuevo
      if (!teamToEdit) {
        try {
          const dominantColor = await getDominantColor(selectedFile);
          setForm((prev) => ({ ...prev, color: dominantColor }));
        } catch (error) {
          console.error("No se pudo extraer color dominante:", error);
        }
      }
    }
  };

  const handleClearImage = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (preview && preview.startsWith("blob:")) {
      try { URL.revokeObjectURL(preview); } catch (err) { /* ignore */ }
    }
    setFile(null);
    setOriginalFile(null);
    setPreview(null);
    setForm((prev) => ({ ...prev, logo_url: null, original_logo_url: null }));
  };

  const handleGenerateLogo = async () => {
    if (!form.name) {
      alert("Escribe el nombre del equipo primero");
      return;
    }
    try {
      const { file: genFile, preview: genPreview } = await generateTeamLogo(form.name, form.color);
      if (preview && preview.startsWith("blob:")) {
        try { URL.revokeObjectURL(preview); } catch (e) {}
      }
      setFile(genFile);
      setOriginalFile(genFile); // El generado es su propio original
      setPreview(genPreview);
    } catch (error) {
      console.error("Error generando logo:", error);
      alert("Error generando logo");
    }
  };

  const handleRemoveBg = async () => {
    if (!file) {
      alert("Sube una imagen primero");
      return;
    }
    try {
      // Usamos el original si existe para mejor calidad, si no el file actual
      const sourceFile = originalFile || file;
      const { file: cleanFile, preview: cleanPreview } = await removeBackground(sourceFile);
      
      if (preview && preview.startsWith("blob:")) {
        try { URL.revokeObjectURL(preview); } catch (e) {}
      }
      
      setFile(cleanFile);
      // No cambiamos el originalFile, mantenemos el original con fondo
      setPreview(cleanPreview);
    } catch (error) {
      console.error("Error en removeBackground:", error);
      alert("Error procesando imagen");
    }
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedDivision) {
      alert("Selecciona una división");
      return;
    }
    setUploading(true);

    try {
      let logoUrl = form.logo_url;
      let originalLogoUrl = form.original_logo_url || teamToEdit?.original_logo_url;

      // 1. Subida de imágenes usando la utilidad centralizada
      if (file) {
        const uploadResult = await uploadImageToSupabase(
            file, 
            originalFile, 
            'logos', // Bucket
            'teams'  // Carpeta
        );
        logoUrl = uploadResult.url;
        originalLogoUrl = uploadResult.originalUrl;
      }

      // Si se limpió la imagen
      if (!file && !preview && !form.logo_url) {
          logoUrl = null;
          originalLogoUrl = null;
      }

      const teamData = {
        name: form.name,
        color: form.color,
        delegate_name: form.delegate_name,
        contact_phone: form.contact_phone,
        status: form.status,
        logo_url: logoUrl,
        original_logo_url: originalLogoUrl, // Guardamos la URL original
        division_id: selectedDivision.id
      };

      if (teamToEdit) {
        const { data, error } = await supabase.from("teams").update(teamData).eq("id", teamToEdit.id).select();
        if (error) throw error;
        updateEquipoLocal(data[0]);
      } else {
        const { data, error } = await supabase.from("teams").insert(teamData).select();
        if (error) throw error;
        addEquipoLocal(data[0]);
      }

      // Reset
      setIsFormOpen(false);
      setTeamToEdit(null);
      handleClearImage();
      setForm(initialForm);

    } catch (error) {
      console.error("Error guardando equipo:", error);
      alert("Error: " + (error?.message || "No se pudo guardar el equipo"));
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const team = equipos?.find((t) => t.id === deleteId);
      
      // Intentar borrar imágenes (opcional, supabase no siempre permite borrar si hay politicas estrictas)
      if (team?.logo_url) {
        const fileName = team.logo_url.split("/").pop();
        if (fileName) {
            await supabase.storage.from("logos").remove([`teams/${fileName}`]);
            await supabase.storage.from("logos").remove([`teams/originals/${fileName}`]);
        }
      }

      const { error } = await supabase.from("teams").delete().eq("id", deleteId);
      if (error) throw error;

      deleteEquipoLocal(deleteId);
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    } catch (error) {
      console.error("Error al eliminar equipo:", error);
      alert("Error al eliminar: " + (error?.message || "No se pudo eliminar"));
    }
  };

  const handleFormChange = (e) => {
    if (!e) return;
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setTeamToEdit(null);
    setForm(initialForm);
    handleClearImage();
    setIsFormOpen(true);
  };

  const openEditModal = (team) => {
    setTeamToEdit(team);
    setForm({
      name: team.name || "",
      color: team.color || initialForm.color,
      delegate_name: team.delegate_name || "",
      contact_phone: team.contact_phone || "",
      status: team.status || initialForm.status,
      logo_url: team.logo_url || null,
      original_logo_url: team.original_logo_url || null
    });
    setFile(null);
    setOriginalFile(null); // No tenemos el File object, solo la URL
    setPreview(team.logo_url || null);
    setIsFormOpen(true);
  };

  const openDetailModal = (team) => {
    setTeamToView(team);
    setIsDetailOpen(true);
  };

  const openDeleteConfirmation = (id) => {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  return {
    data: {
      equipos,
      loading,
      selectedDivision,
      uploading,
      participatingIds
    },
    form: {
      data: form,
      file,
      originalFile, // Exportamos esto
      preview,
      handleChange: handleFormChange,
      handleFileChange,
      handleClearImage,
      handleGenerateLogo,
      handleRemoveBg
    },
    modals: {
      isFormOpen,
      setIsFormOpen,
      isDetailOpen,
      setIsDetailOpen,
      isDeleteModalOpen,
      setIsDeleteModalOpen,
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