import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDivisionStore } from "../../store/DivisionStore";
import { useEquiposStore } from "../../store/EquiposStore";
import { useAuthStore } from "../../store/AuthStore";
import { supabase } from "../../supabase/supabase.config";
import { generateTeamLogo } from "../../utils/logoGenerator";
import { removeBackground } from "../../utils/imageProcessor";
import { TEAM_STATUS, ROLES } from "../../utils/constants";
import { getTorneoActivo } from "../../services/torneos";
import { getDivisionWorkspace } from "../../services/divisionWorkspace";
import { uploadImageToSupabase } from "../../utils/uploadHandler";
import { validateTeamForm } from "../../utils/entityValidation";
import {
  getDelegateAssignments,
  getTeamDelegateBindings,
  getTeamDelegateRequestSummaries,
  submitDelegateChangeRequest,
} from "../../services/delegates";

const getStoragePathFromUrl = (url) => {
  if (!url) return null;
  if (url.includes("/logos/")) {
    return decodeURIComponent(url.split("/logos/")[1].split(/[?#]/)[0]);
  }
  return decodeURIComponent(url.split("/").pop().split(/[?#]/)[0]);
};

const getUniquePaths = (...urls) => {
  const paths = urls.map(getStoragePathFromUrl).filter(Boolean);
  return [...new Set(paths)];
};

const buildDelegateRequestKey = (prefix = "request") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyDelegateRequestSummary = () => ({
  totalCount: 0,
  pendingCount: 0,
  latestPendingAt: null,
  latestReviewedStatus: null,
  latestReviewedAt: null,
  latestReviewNotes: null,
});

const uploadTeamLogo = async ({ file, originalFile, leagueId, teamId }) => {
  if (!leagueId) throw new Error("No se pudo identificar la liga del equipo");

  return uploadImageToSupabase(
    file,
    originalFile,
    "logos",
    `teams/${leagueId}/${teamId}`,
    {
      fileName: "crop.webp",
      originalFileName: "original.webp",
      upsert: true,
      cacheBuster: true,
      requireOriginal: true,
    }
  );
};

const uploadDelegateTeamLogo = async ({
  file,
  originalFile,
  leagueId,
  teamId,
  requestKey,
}) => {
  if (!leagueId) throw new Error("No se pudo identificar la liga del equipo");

  return uploadImageToSupabase(
    file,
    originalFile,
    "logos",
    `teams/${leagueId}/${teamId}/delegate-requests/${requestKey}`,
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
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedDivision, setDivision } = useDivisionStore();
  const { profile } = useAuthStore();
  const {
    equipos,
    loading,
    fetchEquipos,
    addEquipoLocal,
    updateEquipoLocal,
    deleteEquipoLocal,
    resetStore,
  } = useEquiposStore();

  const isDelegate = profile?.role === ROLES.DELEGATE;
  const routeDivisionIdNumber = Number(routeDivisionId);
  const hasRouteDivision =
    Number.isInteger(routeDivisionIdNumber) && routeDivisionIdNumber > 0;
  const activeDivisionId = hasRouteDivision
    ? routeDivisionIdNumber
    : selectedDivision?.id;

  const [divisionContext, setDivisionContext] = useState(null);
  const [delegateTeams, setDelegateTeams] = useState([]);
  const [delegateLoading, setDelegateLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [teamToView, setTeamToView] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [participatingIds, setParticipatingIds] = useState([]);
  const [teamDelegateBindings, setTeamDelegateBindings] = useState({});
  const [teamRequestSummaries, setTeamRequestSummaries] = useState({});
  const [requestSummariesLoading, setRequestSummariesLoading] = useState(false);
  const [delegateBindingRefreshKey, setDelegateBindingRefreshKey] = useState(0);
  const [requestSummaryRefreshKey, setRequestSummaryRefreshKey] = useState(0);

  const initialForm = {
    name: "",
    color: "#000000",
    delegate_name: "",
    contact_phone: "",
    status: TEAM_STATUS?.ACTIVE || "Activo",
    logo_url: null,
    original_logo_url: null,
  };

  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const isSavingRef = useRef(false);

  const delegateFilteredTeams = Array.isArray(delegateTeams)
    ? hasRouteDivision
      ? delegateTeams.filter(
          (team) => Number(team.division_id) === routeDivisionIdNumber
        )
      : delegateTeams
    : [];

  const delegateVisibleDivision = hasRouteDivision
    ? delegateFilteredTeams[0]?.division || null
    : delegateFilteredTeams.length === 1
      ? delegateFilteredTeams[0]?.division || null
      : null;

  const effectiveDivision = isDelegate
    ? delegateVisibleDivision
    : divisionContext ||
      (activeDivisionId && selectedDivision?.id !== activeDivisionId
        ? null
        : selectedDivision);

  const rawVisibleTeams = isDelegate ? delegateFilteredTeams : equipos;
  const visibleTeamIdsKey = JSON.stringify(
    Array.isArray(rawVisibleTeams)
      ? [...new Set(rawVisibleTeams.map((team) => team?.id).filter(Boolean))]
      : []
  );
  const visibleTeams = Array.isArray(rawVisibleTeams)
    ? rawVisibleTeams.map((team) => ({
        ...team,
        delegateAssignment: isDelegate
          ? team.delegateAssignment || null
          : teamDelegateBindings[team.id] || null,
        delegateRequestSummary:
          teamRequestSummaries[team.id] || createEmptyDelegateRequestSummary(),
      }))
    : [];
  const visibleLoading = isDelegate ? delegateLoading : loading;

  useEffect(() => {
    let ignore = false;

    const syncDivisionFromRoute = async () => {
      if (isDelegate) {
        setDivisionContext(null);
        return;
      }

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
  }, [activeDivisionId, isDelegate, selectedDivision?.id, setDivision]);

  useEffect(() => {
    if (!isDelegate || !profile?.id) {
      setDelegateTeams([]);
      return;
    }

    let ignore = false;

    const loadDelegateTeams = async () => {
      setDelegateLoading(true);
      try {
        const assignedTeams = await getDelegateAssignments(profile.id);
        if (!ignore) {
          setDelegateTeams(assignedTeams);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error cargando equipos del delegado:", error);
          setDelegateTeams([]);
        }
      } finally {
        if (!ignore) {
          setDelegateLoading(false);
        }
      }
    };

    loadDelegateTeams();

    return () => {
      ignore = true;
    };
  }, [isDelegate, profile?.id]);

  useEffect(() => {
    if (isDelegate) {
      return;
    }

    if (activeDivisionId) {
      fetchEquipos(activeDivisionId);
    } else {
      resetStore();
    }
  }, [activeDivisionId, fetchEquipos, isDelegate, resetStore]);

  useEffect(() => {
    const tournamentDivisionId = isDelegate ? effectiveDivision?.id : activeDivisionId;

    const fetchTournamentStatus = async () => {
      setParticipatingIds([]);

      if (!tournamentDivisionId) return;

      try {
        const torneo = await getTorneoActivo(tournamentDivisionId);
        if (torneo?.config && Array.isArray(torneo.config.participatingIds)) {
          setParticipatingIds(torneo.config.participatingIds);
        }
      } catch (error) {
        console.error("Error verificando estado de torneo:", error);
      }
    };

    fetchTournamentStatus();
  }, [activeDivisionId, effectiveDivision?.id, isDelegate]);

  useEffect(() => {
    let ignore = false;
    const teamIds = visibleTeamIdsKey ? JSON.parse(visibleTeamIdsKey) : [];

    if (!teamIds.length) {
      setRequestSummariesLoading(false);
      setTeamRequestSummaries({});
      return () => {
        ignore = true;
      };
    }

    const loadTeamRequestSummaries = async () => {
      setRequestSummariesLoading(true);

      try {
        const summaries = await getTeamDelegateRequestSummaries(teamIds);
        if (!ignore) {
          setTeamRequestSummaries(summaries);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error cargando resumen de solicitudes del delegado:", error);
          setTeamRequestSummaries({});
        }
      } finally {
        if (!ignore) {
          setRequestSummariesLoading(false);
        }
      }
    };

    loadTeamRequestSummaries();

    return () => {
      ignore = true;
    };
  }, [profile?.role, requestSummaryRefreshKey, visibleTeamIdsKey]);

  useEffect(() => {
    if (isDelegate) {
      setTeamDelegateBindings({});
      return;
    }

    let ignore = false;
    const teamIds = visibleTeamIdsKey ? JSON.parse(visibleTeamIdsKey) : [];

    if (!teamIds.length) {
      setTeamDelegateBindings({});
      return () => {
        ignore = true;
      };
    }

    const loadTeamDelegateBindings = async () => {
      try {
        const bindings = await getTeamDelegateBindings(teamIds);
        if (!ignore) {
          setTeamDelegateBindings(bindings);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error cargando delegados vinculados:", error);
          setTeamDelegateBindings({});
        }
      }
    };

    loadTeamDelegateBindings();

    return () => {
      ignore = true;
    };
  }, [delegateBindingRefreshKey, isDelegate, visibleTeamIdsKey]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(preview);
        } catch {
          /* ignore */
        }
      }
    };
  }, [preview]);

  const getDominantColor = (imageFile) =>
    new Promise((resolve) => {
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
          const hex =
            "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          URL.revokeObjectURL(objectUrl);
          resolve(hex);
        } catch {
          URL.revokeObjectURL(objectUrl);
          resolve("#000000");
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve("#000000");
      };
    });

  const handleFileChange = async (eOrData) => {
    let selectedFile = null;
    let selectedOriginal = null;

    if (eOrData?.original) {
      selectedFile = eOrData.target.files[0];
      selectedOriginal = eOrData.original;
    } else if (eOrData?.target?.files) {
      selectedFile = eOrData.target.files[0];
      selectedOriginal = eOrData.target.files[0];
    }

    if (!selectedFile) return;

    if (preview && preview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(preview);
      } catch {
        /* ignore */
      }
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
  };

  const handleClearImage = (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (preview && preview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(preview);
      } catch {
        /* ignore */
      }
    }

    setFile(null);
    setOriginalFile(null);
    setPreview(null);
    setForm((prev) => ({ ...prev, logo_url: null, original_logo_url: null }));
  };

  const handleGenerateLogo = async () => {
    if (!form.name) {
      throw new Error("Escribe el nombre del equipo primero.");
    }

    const { file: genFile, preview: genPreview } = await generateTeamLogo(
      form.name,
      form.color
    );

    if (preview && preview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(preview);
      } catch {
        /* ignore */
      }
    }

    setFile(genFile);
    setOriginalFile(genFile);
    setPreview(genPreview);
  };

  const handleRemoveBg = async () => {
    if (!file) {
      throw new Error("Sube una imagen primero.");
    }

    const sourceFile = originalFile || file;
    const { file: cleanFile, preview: cleanPreview } = await removeBackground(
      sourceFile
    );

    if (preview && preview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(preview);
      } catch {
        /* ignore */
      }
    }

    setFile(cleanFile);
    setPreview(cleanPreview);
  };

  const refreshDelegateTeam = async (teamId, fallbackTeam) => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return;

    const mergedTeam = {
      ...fallbackTeam,
      ...data,
      division: fallbackTeam?.division || null,
      league: fallbackTeam?.league || null,
      delegateAssignment: fallbackTeam?.delegateAssignment || null,
    };

    setDelegateTeams((current) =>
      current.map((team) => (team.id === teamId ? mergedTeam : team))
    );
  };

  const handleDelegateTeamSave = async (validatedForm = form) => {
    if (!teamToEdit?.id) {
      throw new Error("Como delegado solo puedes editar equipos asignados.");
    }

    const leagueId = teamToEdit?.league?.id || effectiveDivision?.league_id;
    if (!leagueId) {
      throw new Error("No se pudo identificar la liga del equipo.");
    }

    let logoUrl = validatedForm.logo_url;
    let originalLogoUrl = validatedForm.original_logo_url || teamToEdit.original_logo_url || null;

    if (!file && !preview && !validatedForm.logo_url) {
      logoUrl = null;
      originalLogoUrl = null;
    }

    if (file) {
      const uploadResult = await uploadDelegateTeamLogo({
        file,
        originalFile,
        leagueId,
        teamId: teamToEdit.id,
        requestKey: buildDelegateRequestKey("team"),
      });

      logoUrl = uploadResult.url;
      originalLogoUrl = uploadResult.originalUrl;
    }

    const payload = {
      name: validatedForm.name,
      color: validatedForm.color,
      delegate_name: validatedForm.delegate_name || null,
      contact_phone: validatedForm.contact_phone || null,
      logo_url: logoUrl,
      original_logo_url: originalLogoUrl,
    };

    const result = await submitDelegateChangeRequest({
      teamId: teamToEdit.id,
      entityType: "team",
      actionType: "update",
      payload,
    });

    if (result.status === "applied") {
      await refreshDelegateTeam(teamToEdit.id, teamToEdit);
    }

    setRequestSummaryRefreshKey((current) => current + 1);

    setIsFormOpen(false);
    setTeamToEdit(null);
    handleClearImage();
    setForm(initialForm);

    return {
      successMessage:
        result.status === "pending"
          ? "Cambios enviados a aprobacion del manager"
          : "Equipo actualizado",
    };
  };

  const handleManagerTeamSave = async (validatedForm = form) => {
    if (!effectiveDivision) {
      throw new Error("Selecciona una division.");
    }

    let logoUrl = validatedForm.logo_url;
    let originalLogoUrl = validatedForm.original_logo_url || teamToEdit?.original_logo_url;
    const leagueId = effectiveDivision?.league_id;

    if (!file && !preview && !validatedForm.logo_url) {
      logoUrl = null;
      originalLogoUrl = null;

      if (teamToEdit?.logo_url) {
        const filesToRemove = getUniquePaths(
          teamToEdit.logo_url,
          teamToEdit.original_logo_url
        );

        if (filesToRemove.length > 0) {
          await supabase.storage.from("logos").remove(filesToRemove);
        }
      }
    }

    const teamData = {
      name: validatedForm.name,
      color: validatedForm.color,
      delegate_name: validatedForm.delegate_name || null,
      contact_phone: validatedForm.contact_phone || null,
      status: validatedForm.status,
      logo_url: logoUrl,
      original_logo_url: originalLogoUrl,
      division_id: effectiveDivision.id,
    };

    if (teamToEdit) {
      if (file) {
        const oldFilesToRemove = getUniquePaths(
          teamToEdit.logo_url,
          teamToEdit.original_logo_url
        );

        if (oldFilesToRemove.length > 0) {
          await supabase.storage.from("logos").remove(oldFilesToRemove);
        }

        const uploadResult = await uploadTeamLogo({
          file,
          originalFile,
          leagueId,
          teamId: teamToEdit.id,
        });

        teamData.logo_url = uploadResult.url;
        teamData.original_logo_url = uploadResult.originalUrl;
      }

      const { data, error } = await supabase
        .from("teams")
        .update(teamData)
        .eq("id", teamToEdit.id)
        .select();

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

    setIsFormOpen(false);
    setTeamToEdit(null);
    handleClearImage();
    setForm(initialForm);

    return {
      successMessage: teamToEdit ? "Equipo actualizado" : "Equipo creado",
    };
  };

  const handleSave = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    if (isSavingRef.current) return { successMessage: null };

    const validation = validateTeamForm(form);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }
    setForm(validation.data);

    isSavingRef.current = true;
    setUploading(true);

    try {
      if (isDelegate) {
        return await handleDelegateTeamSave(validation.data);
      }

      return await handleManagerTeamSave(validation.data);
    } catch (error) {
      console.error("Error guardando equipo:", error);
      throw error;
    } finally {
      isSavingRef.current = false;
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const team = equipos?.find((currentTeam) => currentTeam.id === deleteId);

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
      throw error;
    }
  };

  const handleFormChange = (event) => {
    if (!event) return;
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    if (isDelegate) return;

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
      original_logo_url: team.original_logo_url || null,
    });
    setFile(null);
    setOriginalFile(null);
    setPreview(team.logo_url || null);
    setIsFormOpen(true);
  };

  const openDetailModal = (team, initialView = null) => {
    setTeamToView(team);
    setIsDetailOpen(true);
    navigate(location.pathname, { replace: true, state: { ...location.state, initialView } });
  };

  const openDeleteConfirmation = (id) => {
    if (isDelegate) return;

    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const updateManagerTeamSnapshot = (teamId, patch = {}) => {
    if (!teamId) return;

    const currentTeam =
      equipos.find((team) => team.id === teamId) ||
      teamToEdit ||
      teamToView ||
      null;

    if (currentTeam) {
      updateEquipoLocal({ ...currentTeam, ...patch });
    }

    setTeamToEdit((current) =>
      current?.id === teamId ? { ...current, ...patch } : current
    );
    setTeamToView((current) =>
      current?.id === teamId ? { ...current, ...patch } : current
    );
  };

  const refreshDelegateRequestSummaries = () => {
    setRequestSummaryRefreshKey((current) => current + 1);
  };

  const refreshDelegateBindings = () => {
    setDelegateBindingRefreshKey((current) => current + 1);
  };

  const handleDelegateLinkStateChanged = ({
    teamId,
    delegateName,
    contactPhone,
    delegateAssignment = null,
  }) => {
    if (!teamId) return;

    updateManagerTeamSnapshot(teamId, {
      delegate_name: delegateName,
      contact_phone: contactPhone,
      delegateAssignment,
    });

    setTeamDelegateBindings((current) => ({
      ...current,
      [teamId]: delegateAssignment,
    }));

    refreshDelegateBindings();
  };

  const delegateRequestOverview = visibleTeams.reduce(
    (summary, team) => {
      const requestSummary =
        team?.delegateRequestSummary || createEmptyDelegateRequestSummary();

      if (requestSummary.pendingCount > 0) {
        summary.pendingTeamsCount += 1;
        summary.pendingCount += requestSummary.pendingCount;
        if (team.name) {
          summary.pendingTeamNames.push(team.name);
        }
      }

      if (requestSummary.latestReviewedStatus === "applied") {
        summary.approvedTeamsCount += 1;
      }

      if (requestSummary.latestReviewedStatus === "rejected") {
        summary.rejectedTeamsCount += 1;
      }

      return summary;
    },
    {
      pendingCount: 0,
      pendingTeamsCount: 0,
      pendingTeamNames: [],
      approvedTeamsCount: 0,
      rejectedTeamsCount: 0,
    }
  );

  const applyTeamTransferLocally = (teamId, targetDivisionId) => {
    if (
      teamId &&
      activeDivisionId &&
      Number(targetDivisionId) !== Number(activeDivisionId)
    ) {
      deleteEquipoLocal(teamId);
    }
  };

  return {
    data: {
      equipos: visibleTeams,
      loading: visibleLoading,
      selectedDivision: effectiveDivision,
      uploading,
      participatingIds,
      accessRole: profile?.role || null,
      canCreateTeams: !isDelegate,
      canDeleteTeams: !isDelegate,
      canTransferTeams: !isDelegate,
      canInviteDelegates: !isDelegate,
      requestSummariesLoading,
      delegateRequestOverview,
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
      handleRemoveBg,
    },
    modals: {
      isFormOpen,
      setIsFormOpen,
      isDetailOpen,
      setIsDetailOpen,
      isDeleteModalOpen,
      setIsDeleteModalOpen,
      teamToEdit,
      teamToView,
    },
    actions: {
      handleSave,
      confirmDelete,
      openCreateModal,
      openEditModal,
      openDetailModal,
      openDeleteConfirmation,
      handleDelegateLinkStateChanged,
      refreshDelegateRequestSummaries,
      applyTeamTransferLocally,
    },
  };
};
