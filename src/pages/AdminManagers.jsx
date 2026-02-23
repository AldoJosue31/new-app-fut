import React, { useEffect, useState, useRef } from "react";
import { AdminManagersTemplate } from "../components/template/AdminManagersTemplate";
import { supabase, supabaseAdmin } from "../supabase/supabase.config";

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

  const [form, setForm] = useState({ email: "", nombre: "", nombreLiga: "" });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const presenceRef = useRef(null);

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
      Object.entries(state).forEach(([_, metas]) => {
        metas.forEach(meta => {
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
        setOnlineUsers(prev => {
          const next = { ...prev };
          newPresences.forEach(meta => {
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
      } catch (e) {
        try { supabase.removeChannel(channel); } catch {}
      } finally {
        presenceRef.current = null;
      }
    };
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };
  const closeToast = () => setToast({ ...toast, show: false });

  const fetchManagers = async () => {
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
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: "TemporalPassword123!",
        options: { data: { full_name: form.nombre } }
      });
      if (authError) throw authError;

      const { error: rpcError } = await supabase.rpc("activar_nuevo_manager", {
        p_email: form.email,
        p_nombre: form.nombre,
        p_nombre_liga: form.nombreLiga
      });
      if (rpcError) throw rpcError;

      showToast("Manager creado correctamente");
      setCreateModalOpen(false);
      setForm({ email: "", nombre: "", nombreLiga: "" });
      fetchManagers();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- NUEVA FUNCIÓN: Actualizar Credenciales con supabaseAdmin ---
  const handleUpdateCredentials = async (userId, newEmail, newPassword) => {
    try {
      if (import.meta.env.VITE_APP_SUPABASE_SERVICE_ROLE_KEY === undefined) {
        throw new Error("Falta VITE_APP_SUPABASE_SERVICE_ROLE_KEY en el .env");
      }

      const updates = {};
      if (newEmail) updates.email = newEmail;
      if (newPassword) updates.password = newPassword;

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
      if (error) throw error;

      showToast("Credenciales actualizadas correctamente", "success");
      fetchManagers(); // Para actualizar el email en la UI
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
      const { error } = await supabase.rpc("borrar_usuario_por_email", {
        p_email: deleteModalState.emailToDelete
      });
      if (error) throw error;
      showToast("Usuario eliminado correctamente");
      fetchManagers();
    } catch (error) {
      showToast("Error al eliminar: " + error.message, "error");
    } finally {
      setDeleteModalState({ isOpen: false, emailToDelete: null, divisionsAffected: [] });
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <AdminManagersTemplate
      state={state}
      setState={setState}

      managers={managers}
      onlineUsers={onlineUsers}
      loading={loading}
      form={form}
      
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
      handleChange={handleChange}
      handleCreate={handleCreate}
      toast={toast}
      closeToast={closeToast}
    />
  );
}