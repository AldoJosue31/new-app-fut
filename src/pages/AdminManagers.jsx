import React, { useEffect, useState, useRef } from "react";
import { AdminManagersTemplate } from "../components/template/AdminManagersTemplate";
import { supabase } from "../supabase/supabase.config";

export function AdminManagers() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

  // --- Estados de Modales ---
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);

  // --- Estado de Borrado ---
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    emailToDelete: null,
    divisionsAffected: []
  });

  const [form, setForm] = useState({ email: "", nombre: "", nombreLiga: "" });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // 🔴 REF para mantener el canal vivo (CLAVE)
  const presenceRef = useRef(null);

  // ------------------------------------------------------------------
  // 🔵 PRESENCIA REALTIME (ADMIN LISTENER)
  // ------------------------------------------------------------------
  useEffect(() => {
    fetchManagers();

    // ⛔ Evita crear múltiples canales
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
        console.log("[ADMIN] presence sync →", state);
        setOnlineUsers(mapPresenceStateToOnline(state));
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("[ADMIN] join →", newPresences);
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
        console.log("[ADMIN] leave → recompute");
        setOnlineUsers(mapPresenceStateToOnline(state));
      })
      .subscribe(async (status) => {
        console.log("[ADMIN] subscribe status:", status);

        // Debug sesión (muy importante)
        const { data } = await supabase.auth.getSession();
        console.log("[ADMIN] session:", data);
      });

    // 🧹 Limpieza segura
    return () => {
      console.log("[ADMIN] cleaning presence channel");
      try {
        channel.unsubscribe();
      } catch (e) {
        try { supabase.removeChannel(channel); } catch {}
      } finally {
        presenceRef.current = null;
      }
    };
  }, []);

  // ------------------------------------------------------------------
  // RESTO DE TU LÓGICA (SIN CAMBIOS)
  // ------------------------------------------------------------------

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
