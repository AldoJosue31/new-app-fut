import React, { useState, useEffect } from "react";
import { EquiposTemplate } from "../components/template/EquiposTemplate";
import { useDivisionStore } from "../store/DivisionStore";
import { supabase } from "../supabase/supabase.config";

export function Equipos() {
  const { selectedDivision } = useDivisionStore();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Estado para saber si estamos editando
  const [teamToEdit, setTeamToEdit] = useState(null);

  useEffect(() => {
    if (selectedDivision) {
      fetchEquipos();
    }
  }, [selectedDivision]); 

  const fetchEquipos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('division_id', selectedDivision.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setEquipos(data);
    } catch (error) {
      console.error("Error al obtener equipos:", error);
    } finally {
      setLoading(false);
    }
  };

  const guardarEquipo = async (formData, file) => {
    if (!selectedDivision) return alert("Selecciona una división primero");
    setUploading(true);
    
    try {
      let logoUrl = formData.logo_url; // Mantener URL actual si no se sube nueva
      if (teamToEdit && file && teamToEdit.logo_url) {
        // Si estamos editando, subimos una foto nueva Y el equipo ya tenía una foto vieja...
        // ...borramos la vieja para no acumular basura.
        const oldFileName = teamToEdit.logo_url.split('/').pop();
        await supabase.storage.from('logos').remove([oldFileName]);
      }

      // 1. Si hay archivo nuevo, lo subimos
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);
          
        logoUrl = urlData.publicUrl;
      }

      if (teamToEdit) {
        // --- MODO EDICIÓN ---
        const { error } = await supabase
          .from('teams')
          .update({
            name: formData.name,
            color: formData.color,
            delegate_name: formData.delegate_name,
            contact_phone: formData.contact_phone,
            status: formData.status,
            logo_url: logoUrl,
          })
          .eq('id', teamToEdit.id);
          
        if (error) throw error;
        alert("Equipo actualizado");

      } else {
        // --- MODO CREACIÓN ---
        const { error } = await supabase.from('teams').insert({
          name: formData.name,
          color: formData.color,
          delegate_name: formData.delegate_name,
          contact_phone: formData.contact_phone,
          status: formData.status,
          logo_url: logoUrl,
          division_id: selectedDivision.id
        });
        if (error) throw error;
        alert("Equipo registrado");
      }
      
      await fetchEquipos();
      setIsOpen(false);
      setTeamToEdit(null); // Limpiar estado de edición

    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

const eliminarEquipo = async (id) => {
    if(!confirm("¿Estás seguro de eliminar este equipo?")) return;
    
    try {
        // PASO 1: Obtener la info del equipo para saber qué imagen borrar
        const { data: team, error: fetchError } = await supabase
            .from('teams')
            .select('logo_url')
            .eq('id', id)
            .single(); // .single() devuelve un objeto directo, no un array

        if (fetchError) throw fetchError;

        // PASO 2: Si tiene logo, borrarlo del Storage
        if (team.logo_url) {
            // La URL es larga, necesitamos solo el nombre del archivo final
            // Ejemplo: .../logos/170345_582.png -> split('/') -> pop() obtiene "170345_582.png"
            const fileName = team.logo_url.split('/').pop();

            const { error: storageError } = await supabase.storage
                .from('logos')
                .remove([fileName]);

            if (storageError) {
                console.warn("Error borrando imagen (pero seguimos borrando el equipo):", storageError);
            }
        }

        // PASO 3: Borrar el registro de la base de datos
        const { error: deleteError } = await supabase.from('teams').delete().eq('id', id);
        
        if(deleteError) throw deleteError;
        
        await fetchEquipos();
        
    } catch (error) {
        alert("Error al eliminar: " + error.message);
    }
  };

  // Función para abrir el modal en modo edición
  const handleEdit = (team) => {
    setTeamToEdit(team);
    setIsOpen(true);
  };

  // Función para abrir el modal en modo creación (reset)
  const handleCreate = () => {
    setTeamToEdit(null);
    setIsOpen(true);
  };

  return (
    <EquiposTemplate 
      equipos={equipos} 
      division={selectedDivision} 
      loading={loading}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      onSave={guardarEquipo}
      isUploading={uploading}
      onDelete={eliminarEquipo}
      onEdit={handleEdit}
      onCreate={handleCreate}
      teamToEdit={teamToEdit}
    />
  );
}