import React, { useEffect, useState } from "react";
import { AdminManagersTemplate } from "../components/template/AdminManagersTemplate";
import { supabase } from "../supabase/supabase.config";

export function AdminManagers() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  
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
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchManagers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };
  const closeToast = () => setToast({ ...toast, show: false });

  const fetchManagers = async () => {
    setLoading(true);
    // Consulta profunda: Profile -> Leagues -> Divisions -> Teams (Count)
    const { data, error } = await supabase
      .from('profiles')
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
      .eq('role', 'manager')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching managers:", error);
      showToast("Error al cargar lista de managers", "error");
    } else {
      setManagers(data);
    }
    setLoading(false);
  };

  // --- Crear Manager ---
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Auth
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: "TemporalPassword123!", 
        options: { data: { full_name: form.nombre } }
      });
      if (authError) throw authError;

      // 2. RPC Setup
      const { error: rpcError } = await supabase.rpc('activar_nuevo_manager', {
        p_email: form.email,
        p_nombre: form.nombre,
        p_nombre_liga: form.nombreLiga
      });
      if (rpcError) throw rpcError;

      showToast("Manager creado correctamente", "success");
      setCreateModalOpen(false);
      setForm({ email: "", nombre: "", nombreLiga: "" });
      fetchManagers(); 

    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- Manejo de Detalles ---
  const openDetailModal = (manager) => {
    setSelectedManager(manager);
    setDetailModalOpen(true);
  };

  // --- Manejo de Borrado ---
  const openDeleteModal = (email) => {
    const manager = managers.find(m => m.email === email);
    let divisionsNames = [];
    // Extraemos nombres de divisiones para la advertencia
    if (manager?.leagues?.[0]?.divisions) {
       divisionsNames = manager.leagues[0].divisions.map(d => d.name);
    }
    setDeleteModalState({ 
      isOpen: true, 
      emailToDelete: email,
      divisionsAffected: divisionsNames
    });
  };

  const handleConfirmDelete = async () => {
    const email = deleteModalState.emailToDelete;
    if (!email) return;

    try {
      const { error } = await supabase.rpc('borrar_usuario_por_email', { p_email: email });
      if (error) throw error;
      
      showToast("Usuario eliminado correctamente", "success");
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
      loading={loading}
      form={form}
      // Props de Modales
      createModalOpen={createModalOpen}
      setCreateModalOpen={setCreateModalOpen}
      detailModalOpen={detailModalOpen}
      setDetailModalOpen={setDetailModalOpen}
      selectedManager={selectedManager}
      openDetailModal={openDetailModal}
      deleteModalState={deleteModalState}
      setDeleteModalState={setDeleteModalState}
      // Handlers
      handleConfirmDelete={handleConfirmDelete}
      openDeleteModal={openDeleteModal}
      handleChange={handleChange}
      handleCreate={handleCreate}
      // UI Utils
      toast={toast}
      closeToast={closeToast}
    />
  );
}