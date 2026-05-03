import React, { useCallback, useEffect, useState, useRef } from "react";
import { AdminManagersTemplate } from "../components/template/AdminManagersTemplate";
import { supabase } from "../supabase/supabase.config";
import {
  createManagerAdminService,
  deleteManagerAdminService,
  updateManagerCredentialsService,
} from "../services/adminManagers";

const PRESENCE_CHANNEL = "online-managers";
const MANAGERS_REFRESH_MS = 30000;

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

  const fetchManagers = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
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
      if (!silent) showToast("Error al cargar lista de managers", "error");
    } else {
      setManagers(data || []);
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    fetchManagers();
    const refreshInterval = setInterval(() => {
      fetchManagers({ silent: true });
    }, MANAGERS_REFRESH_MS);

    if (presenceRef.current) {
      console.log("[ADMIN] presence channel already active");
      clearInterval(refreshInterval);
      return;
    }

    const channel = supabase.channel(PRESENCE_CHANNEL);
    presenceRef.current = channel;

    const mapPresenceStateToOnline = (state) => {
      const onlineMap = {};
      Object.values(state).forEach((metas) => {
        metas.forEach((meta) => {
          if (meta?.user_id) {
            const current = onlineMap[meta.user_id] || {};
            onlineMap[meta.user_id] = {
              online: true,
              metasCount: (current.metasCount || 0) + 1,
              online_at: current.online_at || meta.online_at || null,
              last_seen_at: meta.last_seen_at || current.last_seen_at || null,
              role: meta.role || current.role || null,
            };
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
            if (meta?.user_id) {
              const current = next[meta.user_id] || {};
              next[meta.user_id] = {
                online: true,
                metasCount: (current.metasCount || 0) + 1,
                online_at: current.online_at || meta.online_at || null,
                last_seen_at: meta.last_seen_at || current.last_seen_at || null,
                role: meta.role || current.role || null,
              };
            }
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
      clearInterval(refreshInterval);
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

  useEffect(() => {
    if (!selectedManager?.id) return;

    const freshManager = managers.find((manager) => manager.id === selectedManager.id);
    if (freshManager) setSelectedManager(freshManager);
  }, [managers, selectedManager?.id]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-managers-profile-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: "role=eq.manager" },
        ({ new: updatedManager }) => {
          setManagers((currentManagers) =>
            currentManagers.map((manager) =>
              manager.id === updatedManager.id
                ? { ...manager, ...updatedManager, leagues: manager.leagues }
                : manager
            )
          );
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {
        supabase.removeChannel(channel);
      }
    };
  }, []);

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
