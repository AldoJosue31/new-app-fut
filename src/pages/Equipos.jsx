import React, { useEffect, useState } from "react";
import { AdminManagersTemplate } from "../components/template/AdminManagersTemplate";
import { supabase } from "../supabase/supabase.config";

export function AdminManagers() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Formulario de creación
  const [form, setForm] = useState({
    email: "",
    nombre: "",
    nombreLiga: ""
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      // Obtenemos perfiles con rol 'manager' y hacemos JOIN con la tabla de ligas
      // Nota: Usamos 'leagues!inner' para asegurar que traiga datos relacionados si existen
      const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            leagues:league_admins(
                league:leagues(name)
            )
        `)
        .eq('role', 'manager')
        .order('created_at', { ascending: false });
        
      // Nota: league_admins es la tabla intermedia. 
      // Si tu consulta es compleja, puedes ajustar el select según tu estructura exacta.
      // Una forma más simple si usaste el script anterior es consultar directo profiles y leagues si la relación está directa,
      // pero con league_admins, la ruta es profiles -> league_admins -> leagues.

      if (error) throw error;
      
      // Aplanamos la estructura para el template
      const formattedData = data.map(profile => ({
        ...profile,
        leagues: profile.leagues.map(l => l.league) // Extraemos el objeto league de la relación
      }));

      setManagers(formattedData);
    } catch (error) {
      console.error("Error al cargar managers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Crear usuario en Auth
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: "TemporalPassword123!", 
      });
      
      if (authError) throw authError;

      // 2. Ejecutar RPC para asignar rol y liga
      const { error: rpcError } = await supabase.rpc('activar_nuevo_manager', {
        p_email: form.email,
        p_nombre: form.nombre,
        p_nombre_liga: form.nombreLiga
      });

      if (rpcError) throw rpcError;

      alert("Manager creado exitosamente.");
      setModalOpen(false);
      setForm({ email: "", nombre: "", nombreLiga: "" });
      fetchManagers(); // Recargar lista

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email) => {
    if (!window.confirm("⚠️ ¿ESTÁS SEGURO? \n\nEsto borrará la cuenta del usuario. Si es el DUEÑO de la liga, SE BORRARÁ TODA LA LIGA y sus equipos en cascada.\n\n¿Deseas continuar?")) return;
    
    try {
      // Llamada a la función SQL para borrar por email
      const { error } = await supabase.rpc('borrar_usuario_por_email', { p_email: email });
      
      if (error) throw error;
      
      alert("Usuario eliminado correctamente.");
      fetchManagers();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar: " + error.message);
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
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      handleChange={handleChange}
      handleCreate={handleCreate}
      handleDelete={handleDelete}
    />
  );
}