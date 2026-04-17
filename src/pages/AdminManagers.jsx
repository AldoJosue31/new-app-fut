import React, { useCallback, useEffect, useState, useRef } from "react";
import { AdminManagersTemplate } from "../components/template/AdminManagersTemplate";
import { supabase } from "../supabase/supabase.config";
import {
  createManagerAdminService,
  deleteManagerAdminService,
  updateManagerCredentialsService,
} from "../services/adminManagers";

export function AdminManagers({ state, setState }) { 
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

  // --- Estados de Modales ---
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);

  // --- NUEVO: Estado para Modal de Edición Auth ---
  const [editAuthModalOpen, setEditAuthModalOpen] = useState(false);
  const [managerToEditAuth, setManagerToEditAuth] = useState(null);

  // --- Estado de Borrado ---
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    emailToDelete: null,
    divisionsAffected: []
  });

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const presenceRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };
  const closeToast = () => setToast({ ...toast, show: false });

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        leagues:leagues (
          name,
          divisions:divisions (
            name,
            teams:teams (count)
          )
        )
      `)
      .eq("role", "manager")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching managers:", error);
      showToast("Error al cargar lista de managers", "error");
    } else {
      setManagers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchManagers();

    if (presenceRef.current) {
      console.log("[ADMIN] presence channel already active");
      return;
    }

    const channel = supabase.channel("online-managers");
    presenceRef.current = channel;

    const mapPresenceStateToOnline = (state) => {
      const onlineMap = {};
      Object.values(state).forEach((metas) => {
        metas.forEach((meta) => {
          if (meta?.user_id) {
            onlineMap[meta.user_id] = true;
          }
        });
      });
      return onlineMap;
    };

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineUsers(mapPresenceStateToOnline(state));
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const next = { ...prev };
          newPresences.forEach((meta) => {
            if (meta?.user_id) next[meta.user_id] = true;
          });
          return next;
        });
      })
      .on("presence", { event: "leave" }, () => {
        const state = channel.presenceState();
        setOnlineUsers(mapPresenceStateToOnline(state));
      })
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {
        try {
          supabase.removeChannel(channel);
        } catch {
          return null;
        }
      } finally {
        presenceRef.current = null;
      }
    };
  }, [fetchManagers]);

  const handleCreate = async ({ fullName, email, password, leagueName }) => {
    setLoading(true);
    try {
      await createManagerAdminService({
        fullName,
        email,
        password,
        leagueName,
      });

      showToast("Manager creado correctamente");
      setCreateModalOpen(false);
      await fetchManagers();
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCredentials = async (userId, newEmail, newPassword) => {
    try {
      await updateManagerCredentialsService({
        userId,
        email: newEmail,
        password: newPassword,
      });

      showToast("Credenciales actualizadas correctamente", "success");
      await fetchManagers();
      return true;
    } catch (error) {
      console.error("Error actualizando credenciales:", error);
      showToast("Error: " + error.message, "error");
      return false;
    }
  };

  const openDetailModal = (manager) => {
    setSelectedManager(manager);
    setDetailModalOpen(true);
  };

  const openDeleteModal = (email) => {
    const manager = managers.find(m => m.email === email);
    const divisionsNames = manager?.leagues?.[0]?.divisions?.map(d => d.name) || [];
    setDeleteModalState({
      isOpen: true,
      emailToDelete: email,
      divisionsAffected: divisionsNames
    });
  };

  const openEditAuthModal = (manager) => {
    setManagerToEditAuth(manager);
    setEditAuthModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteManagerAdminService(deleteModalState.emailToDelete);
      showToast("Usuario eliminado correctamente");
      await fetchManagers();
    } catch (error) {
      showToast("Error al eliminar: " + error.message, "error");
    } finally {
      setDeleteModalState({ isOpen: false, emailToDelete: null, divisionsAffected: [] });
    }
  };

  return (
    <AdminManagersTemplate
      state={state}
      setState={setState}

      managers={managers}
      onlineUsers={onlineUsers}
      loading={loading}
      
      createModalOpen={createModalOpen}
      setCreateModalOpen={setCreateModalOpen}
      detailModalOpen={detailModalOpen}
      setDetailModalOpen={setDetailModalOpen}
      selectedManager={selectedManager}
      openDetailModal={openDetailModal}
      
      // Pasamos los nuevos estados del modal de edición
      editAuthModalOpen={editAuthModalOpen}
      setEditAuthModalOpen={setEditAuthModalOpen}
      managerToEditAuth={managerToEditAuth}
      openEditAuthModal={openEditAuthModal}
      handleUpdateCredentials={handleUpdateCredentials}

      deleteModalState={deleteModalState}
      setDeleteModalState={setDeleteModalState}
      handleConfirmDelete={handleConfirmDelete}
      openDeleteModal={openDeleteModal}
      handleCreate={handleCreate}
      toast={toast}
      closeToast={closeToast}
    />
  );
}
