import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { useDivisionStore } from "../../store/DivisionStore";
import { supabase } from "../../supabase/supabase.config";
import { Modal } from "../organismos/Modal"; // Importamos Modal
import { InputText2 } from "../organismos/formularios/InputText2"; 
import { Btnsave } from "../moleculas/Btnsave";

// Iconos
import { IoIosArrowDown } from "react-icons/io";
import { RiDeleteBinLine, RiEditLine } from "react-icons/ri";

export function DivisionSelector({ isOpen }) {
  const { 
    divisiones, 
    selectedDivision, 
    setDivision, 
    fetchDivisiones 
  } = useDivisionStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    fetchDivisiones();
  }, []);

  const handleChange = (e) => {
    const id = Number(e.target.value);
    const divisionEncontrada = divisiones.find((div) => div.id === id);
    if (divisionEncontrada) setDivision(divisionEncontrada);
  };

  // --- CRUD LÓGICA ---

  // 1. Crear División
  const handleAdd = async (e) => {
    e.preventDefault();
    if(!newDivisionName.trim()) return;
    setLoadingAction(true);
    
    try {
      // Necesitamos el ID de la liga del usuario. 
      const { data: { user } } = await supabase.auth.getUser();
      const { data: league } = await supabase.from('leagues').select('id').eq('owner_id', user.id).single();
      
      if(!league) throw new Error("No tienes una liga creada.");

      const { error } = await supabase.from('divisions').insert({
        name: newDivisionName,
        league_id: league.id,
        tier: 1
      });

      if(error) throw error;
      
      setNewDivisionName("");
      await fetchDivisiones(); // Refrescar lista

    } catch (error) {
      alert(error.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // 2. Eliminar División
  const handleDelete = async (id) => {
    if(!confirm("¿Borrar división? Se borrarán sus equipos y torneos.")) return;
    
    try {
        const { error } = await supabase.from('divisions').delete().eq('id', id);
        if(error) throw error;
        await fetchDivisiones();
    } catch (error) {
        alert("Error al borrar: " + error.message);
    }
  };

  // Render condicional: si no hay divisiones, mostramos texto placeholder
  return (
    <>
      <Container $isOpen={isOpen}>
        <div className="header-row">
            <div className="label">División Actual:</div>
            {/* Botón de configuración */}
            <div className="config-btn" onClick={() => setModalOpen(true)}>
                <v.iconoSettings />
            </div>
        </div>

        <SelectWrapper>
            {divisiones.length > 0 ? (
                <select value={selectedDivision?.id || ""} onChange={handleChange}>
                    {divisiones.map((div) => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                    ))}
                </select>
            ) : (
                <div className="no-data" onClick={() => setModalOpen(true)}>
                    + Crear División
                </div>
            )}
            
            {divisiones.length > 0 && (
                <div className="icon"><IoIosArrowDown /></div>
            )}
        </SelectWrapper>
      </Container>

      {/* --- MODAL CRUD DIVISIONES --- */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Gestionar Divisiones">
        <CrudContainer>
            {/* Formulario Crear */}
            <form onSubmit={handleAdd} className="add-form">
                <InputText2>
                    <input 
                        className="form__field" 
                        placeholder="Nueva División (ej. 1ra Fuerza)"
                        value={newDivisionName}
                        onChange={(e)=>setNewDivisionName(e.target.value)}
                    />
                </InputText2>
                <Btnsave 
                    titulo={loadingAction ? "..." : "Agregar"}
                    bgcolor={v.verde}
                    icono={<v.iconoagregar />}
                    disabled={loadingAction}
                    width="auto"
                />
            </form>

            <Divider />

            {/* Lista de Divisiones */}
            <div className="list">
                {divisiones.map((div) => (
                    <div className="item" key={div.id}>
                        <span>{div.name}</span>
                        <div className="actions">
                            <button className="btn-icon delete" onClick={() => handleDelete(div.id)}>
                                <RiDeleteBinLine />
                            </button>
                        </div>
                    </div>
                ))}
                {divisiones.length === 0 && <p className="empty">No hay divisiones registradas.</p>}
            </div>
        </CrudContainer>
      </Modal>
    </>
  );
}

// --- STYLES ---

const Container = styled.div`
  width: 100%;
  padding: ${({ $isOpen }) => $isOpen ? "0 12px" : "0"};
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  
  opacity: ${({ $isOpen }) => $isOpen ? "1" : "0"};
  height: ${({ $isOpen }) => $isOpen ? "auto" : "0"};
  pointer-events: ${({ $isOpen }) => $isOpen ? "all" : "none"};
  overflow: hidden;

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    
    .label {
        font-size: 0.75rem;
        color: ${({ theme }) => theme.text};
        opacity: 0.6;
        font-weight: 600;
    }
    .config-btn {
        cursor: pointer;
        font-size: 1.1rem;
        color: ${({ theme }) => theme.text};
        opacity: 0.7;
        &:hover { opacity: 1; color: ${({ theme }) => theme.primary}; }
    }
  }
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
  background: ${({ theme }) => theme.bg3}; 
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.bg4};
  
  &:hover { border-color: ${({ theme }) => theme.primary || v.colorPrincipal}; }

  select {
    width: 100%;
    padding: 10px 35px 10px 12px;
    appearance: none;
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.text};
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    outline: none;
    option { background: ${({ theme }) => theme.bgcards}; color: ${({ theme }) => theme.text}; }
  }

  .no-data {
    padding: 10px;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.primary};
    cursor: pointer;
    font-weight: 600;
    text-align: center;
  }

  .icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: ${({ theme }) => theme.primary || v.colorPrincipal};
    font-size: 1.1rem;
  }
`;

const CrudContainer = styled.div`
    .add-form {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        /* InputText2 tiene margin-bottom interno, lo ajustamos si es necesario */
    }
    .list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 300px;
        overflow-y: auto;
    }
    .item {
        background: ${({ theme }) => theme.bgtotal};
        padding: 10px;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        span { font-weight: 500; }
        
        .actions {
            display: flex; gap: 5px;
            .btn-icon {
                background: transparent; border: none; cursor: pointer;
                font-size: 1.1rem; padding: 4px; border-radius: 4px;
                color: ${({ theme }) => theme.text};
                &:hover { background: rgba(0,0,0,0.1); }
                &.delete:hover { color: ${v.rojo}; }
            }
        }
    }
    .empty { text-align: center; opacity: 0.5; font-size: 0.9rem; }
`;

const Divider = styled.div`
    height: 1px;
    background: ${({ theme }) => theme.bg4};
    margin: 15px 0;
`;