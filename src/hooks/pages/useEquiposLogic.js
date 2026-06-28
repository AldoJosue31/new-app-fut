import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useDivisionStore } from "../../store/DivisionStore";
import { useEquiposStore } from "../../store/EquiposStore";
import { supabase } from "../../supabase/supabase.config";
import { generateTeamLogo } from "../../utils/logoGenerator";
import { removeBackground } from "../../utils/imageProcessor";
import { TEAM_STATUS } from "../../utils/constants";
import { getTorneoActivo } from "../../services/torneos";
import { getDivisionWorkspace } from "../../services/divisionWorkspace";
import { uploadImageToSupabase } from "../../utils/uploadHandler";

// Utilidad infalible para extraer la ruta exacta del archivo desde la URL pública
const getStoragePathFromUrl = (url) => {
  if (!url) return null;
  // Buscamos a partir de '/logos/' para obtener la ruta interna (ej: 'teams/mi-logo.png' o 'logo.png')
  if (url.includes('/logos/')) {
    return decodeURIComponent(url.split('/logos/')[1].split(/[?#]/)[0]);
  }
  // Fallback por si la URL tiene un formato inesperado
  return decodeURIComponent(url.split('/').pop().split(/[?#]/)[0]);
};

const getUniquePaths = (...urls) => {
  const paths = urls.map(getStoragePathFromUrl).filter(Boolean);
  return [...new Set(paths)];
};

const getCurrentOwnerId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user?.id) throw new Error("No se pudo identificar al usuario actual");
  return user.id;
};

const uploadTeamLogo = async ({ file, originalFile, ownerId, leagueId, teamId }) => {
  if (!leagueId) throw new Error("No se pudo identificar la liga del equipo");

  return uploadImageToSupabase(
    file,
    originalFile,
    "logos",
    `teams/${ownerId}/${leagueId}/${teamId}`,
    {
      fileName: "crop.webp",
      originalFileName: "original.webp",
      upsert: true,
      cacheBuster: true,
      requireOriginal: true,
    }
  );
};

export const useEquiposLogic = () => {
  const { divisionId: routeDivisionId } = useParams();
  const { selectedDivision, setDivision } = useDivisionStore();
  const routeDivisionIdNumber = Number(routeDivisionId);
  const activeDivisionId =
    Number.isInteger(routeDivisionIdNumber) && routeDivisionIdNumber > 0
      ? routeDivisionIdNumber
      : selectedDivision?.id;
  const [divisionContext, setDivisionContext] = useState(null);
  const effectiveDivision =
    divisionContext ||
    (activeDivisionId && selectedDivision?.id !== activeDivisionId ? null : selectedDivision);
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
    original_logo_url: null 
  };

  const [form, setForm] = useState(initialForm);
  
  // ESTADOS DE IMAGEN
  const [file, setFile] = useState(null); 
  const [originalFile, setOriginalFile] = useState(null); 
  const [preview, setPreview] = useState(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    let ignore = false;

    const syncDivisionFromRoute = async () => {
      if (!activeDivisionId || selectedDivision?.id === activeDivisionId) {
        setDivisionContext(null);
        return;
      }

      try {
        const workspace = await getDivisionWorkspace(activeDivisionId);
        if (ignore) return;

        const resolvedDivision = workspace?.division || null;
        setDivisionContext(resolvedDivision);
        if (resolvedDivision) {
          setDivision(resolvedDivision);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error cargando division desde ruta:", error);
          setDivisionContext(null);
        }
      }
    };

    syncDivisionFromRoute();

    return () => {
      ignore = true;
    };
  }, [activeDivisionId, selectedDivision?.id, setDivision]);

  // Carga de equipos
  useEffect(() => {
    if (activeDivisionId) {
      fetchEquipos(activeDivisionId);
    } else {
      resetStore();
    }
  }, [activeDivisionId, fetchEquipos, resetStore]);

  // Verificación de torneos
  useEffect(() => {
    const fetchTournamentStatus = async () => {
      setParticipatingIds([]); 
      if (activeDivisionId) {
        try {
          const torneo = await getTorneoActivo(activeDivisionId);
          if (torneo && torneo.config && Array.isArray(torneo.config.participatingIds)) {
            setParticipatingIds(torneo.config.participatingIds);
          }
        } catch (error) {
          console.error("Error verificando estado de torneo:", error);
        }
      }
  };
    fetchTournamentStatus();
  }, [activeDivisionId]);

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

  const handleFileChange = async (eOrData) => {
    let selectedFile = null;
    let selectedOriginal = null;

    if (eOrData?.original) {
        selectedFile = eOrData.target.files[0];
        selectedOriginal = eOrData.original;
    } 
    else if (eOrData?.target?.files) {
        selectedFile = eOrData.target.files[0];
        selectedOriginal = eOrData.target.files[0]; 
    }

    if (selectedFile) {
      if (preview && preview.startsWith("blob:")) {
        try { URL.revokeObjectURL(preview); } catch (e) { /* ignore */ }
      }
      
      setFile(selectedFile);
      setOriginalFile(selectedOriginal); 
      
      const newPreview = URL.createObjectURL(selectedFile);
      setPreview(newPreview);

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
      setOriginalFile(genFile); 
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
      const sourceFile = originalFile || file;
      const { file: cleanFile, preview: cleanPreview } = await removeBackground(sourceFile);
      
      if (preview && preview.startsWith("blob:")) {
        try { URL.revokeObjectURL(preview); } catch (e) {}
      }
      
      setFile(cleanFile);
      setPreview(cleanPreview);
    } catch (error) {
      console.error("Error en removeBackground:", error);
      alert("Error procesando imagen");
    }
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!effectiveDivision) {
      alert("Selecciona una división");
      return;
    }
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setUploading(true);

    try {
      let logoUrl = form.logo_url;
      let originalLogoUrl = form.original_logo_url || teamToEdit?.original_logo_url;
      const ownerId = file ? await getCurrentOwnerId() : null;
      const leagueId = effectiveDivision?.league_id;

      // 2. LÓGICA DE BORRADO: Si el usuario le dio a la X y no subió nada nuevo
      if (!file && !preview && !form.logo_url) {
          logoUrl = null;
          originalLogoUrl = null;

          // Borrado físico exacto gracias a la nueva función
          if (teamToEdit && teamToEdit.logo_url) {
             const filesToRemove = getUniquePaths(teamToEdit.logo_url, teamToEdit.original_logo_url);
             
             if (filesToRemove.length > 0) {
                 await supabase.storage.from("logos").remove(filesToRemove);
             }
          }
      }

      const teamData = {
        name: form.name,
        color: form.color,
        delegate_name: form.delegate_name,
        contact_phone: form.contact_phone,
        status: form.status,
        logo_url: logoUrl,
        original_logo_url: originalLogoUrl, 
        division_id: effectiveDivision.id
      };

      if (teamToEdit) {
        if (file) {
          const oldFilesToRemove = getUniquePaths(teamToEdit.logo_url, teamToEdit.original_logo_url);

          if (oldFilesToRemove.length > 0) {
            await supabase.storage.from("logos").remove(oldFilesToRemove);
          }

          const uploadResult = await uploadTeamLogo({
            file,
            originalFile,
            ownerId,
            leagueId,
            teamId: teamToEdit.id,
          });

          teamData.logo_url = uploadResult.url;
          teamData.original_logo_url = uploadResult.originalUrl;
        }

        const { data, error } = await supabase.from("teams").update(teamData).eq("id", teamToEdit.id).select();
        if (error) throw error;
        updateEquipoLocal(data[0]);
      } else {
        const { data, error } = await supabase.from("teams").insert(teamData).select();
        if (error) throw error;
        let savedTeam = data[0];

        if (file) {
          try {
            const uploadResult = await uploadTeamLogo({
              file,
              originalFile,
              ownerId,
              leagueId,
              teamId: savedTeam.id,
            });

            const { data: updatedData, error: updateError } = await supabase
              .from("teams")
              .update({
                logo_url: uploadResult.url,
                original_logo_url: uploadResult.originalUrl,
              })
              .eq("id", savedTeam.id)
              .select();

            if (updateError) throw updateError;
            savedTeam = updatedData[0];
          } catch (uploadError) {
            await supabase.from("teams").delete().eq("id", savedTeam.id);
            throw uploadError;
          }
        }

        addEquipoLocal(savedTeam);
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
      isSavingRef.current = false;
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const team = equipos?.find((t) => t.id === deleteId);
      
      // Intentar borrar imágenes (Corregido también aquí para evitar basura al eliminar equipo)
      if (team?.logo_url) {
        const filesToRemove = getUniquePaths(team.logo_url, team.original_logo_url);
        
        if (filesToRemove.length > 0) {
            await supabase.storage.from("logos").remove(filesToRemove);
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
    setOriginalFile(null); 
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
      selectedDivision: effectiveDivision,
      uploading,
      participatingIds
    },
    form: {
      data: form,
      file,
      originalFile, 
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
