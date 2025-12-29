import React, { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import { v } from "../../styles/variables";
import { useDivisionStore } from "../../store/DivisionStore";
import { supabase } from "../../supabase/supabase.config";
import { Modal } from "../organismos/Modal"; 
import { InputText2 } from "../organismos/formularios/InputText2"; 
import { Btnsave } from "../moleculas/Btnsave";

// Iconos
import { IoIosArrowDown } from "react-icons/io";
import { RiDeleteBinLine } from "react-icons/ri";
import { BiTransfer } from "react-icons/bi";

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

  const handleCycle = (e) => {
    e.stopPropagation();
    if (divisiones.length < 2) return;
    const currentIndex = divisiones.findIndex(d => d.id === selectedDivision?.id);
    const newIndex = currentIndex < divisiones.length - 1 ? currentIndex + 1 : 0;
    setDivision(divisiones[newIndex]);
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if(!newDivisionName.trim()) return;
    setLoadingAction(true);
    try {
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
      await fetchDivisiones();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoadingAction(false);
    }
  };

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

  return (
    <>
      <MainContainer>
        <ViewStack>
          
          {/* --- VISTA EXPANDIDA (SIDEBAR ABIERTO) --- */}
          <FullView $isActive={isOpen}>
            <div className="header-row">
                <div className="label">División Actual</div>
                <div className="config-btn" onClick={() => setModalOpen(true)} title="Gestionar">
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
                        + Crear
                    </div>
                )}
                
                {divisiones.length > 0 && (
                    <div className="icon"><IoIosArrowDown /></div>
                )}
            </SelectWrapper>
          </FullView>

          {/* --- VISTA COMPACTA (SIDEBAR CERRADO) --- */}
          <CompactView $isActive={!isOpen}>
             <InitialsContainer 
                onClick={divisiones.length > 0 ? handleCycle : () => setModalOpen(true)} 
                title={divisiones.length > 1 ? "Click para cambiar de división" : selectedDivision?.name}
                $isEmpty={divisiones.length === 0}
                $clickable={divisiones.length > 1}
             >
                <span className="initials">
                    {divisiones.length > 0 ? getInitials(selectedDivision?.name) : "+"}
                </span>
                
                {divisiones.length > 1 && (
                    <div className="swap-icon">
                        <BiTransfer />
                    </div>
                )}
             </InitialsContainer>
          </CompactView>

        </ViewStack>
      </MainContainer>

      {/* --- MODAL --- */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Gestionar Divisiones">
        <CrudContainer>
            <form onSubmit={handleAdd} className="add-form">
                <InputText2>
                    <input 
                        className="form__field" 
                        placeholder="Nueva División..."
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

// --- STYLES CORREGIDOS ---

const MainContainer = styled.div`
  /* AQUI ESTA EL ARREGLO: Mismos margenes que LinkContainer del Sidebar */
  margin: 9px 0;
  margin-left: 8px;
  margin-right: 10px;
  
  /* Altura mínima para mantener ritmo vertical con los otros items (que miden 60px) */
  min-height: 60px; 
  
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ViewStack = styled.div`
  display: grid;
  width: 100%;
  grid-template-areas: "stack";
  align-items: center;
  justify-items: center;
  
  > * {
    grid-area: stack;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
`;

const activeState = css`
    opacity: 1;
    transform: translateX(0) scale(1);
    pointer-events: all;
    visibility: visible;
`;

const inactiveState = (translateX) => css`
    opacity: 0;
    transform: translateX(${translateX}) scale(0.9);
    pointer-events: none;
    visibility: hidden;
`;

const FullView = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  ${({ $isActive }) => $isActive ? activeState : inactiveState("-10px")}

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
    padding: 0 2px;
    .label {
        font-size: 0.7rem;
        color: ${({ theme }) => theme.text};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.6;
        font-weight: 700;
    }
    .config-btn {
        cursor: pointer;
        font-size: 1rem;
        color: ${({ theme }) => theme.text};
        opacity: 0.5;
        transition: 0.3s;
        &:hover { opacity: 1; color: ${({ theme }) => theme.primary}; }
    }
  }
`;

const CompactView = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  ${({ $isActive }) => $isActive ? activeState : inactiveState("10px")}
`;

const InitialsContainer = styled.div`
    position: relative;
    /* Tamaño ajustado para ser armónico con los iconos del sidebar (33px aprox) */
    width: 44px; 
    height: 44px;
    border-radius: 12px;
    
    background: ${({ theme, $isEmpty }) => $isEmpty ? theme.bg4 : `linear-gradient(135deg, ${theme.primary} 0%, ${v.colorselector} 100%)`};
    color: white;
    
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.95rem;
    cursor: ${({ $clickable }) => $clickable ? "pointer" : "default"};
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
    user-select: none;
    border: 2px solid ${({ theme }) => theme.bgtotal};
    overflow: hidden;

    .initials { transition: all 0.3s ease; z-index: 1; }

    .swap-icon {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 0;
        font-size: 1.4rem;
        transition: all 0.3s ease;
        z-index: 2;
        color: ${({theme}) => theme.text};
    }

    /* Hover Effect */
    ${({ $clickable, theme }) => $clickable && css`
        &:hover {
            box-shadow: 0 6px 14px rgba(0,0,0,0.2);
            background: ${theme.bg4}; 
            border-color: ${theme.primary};

            .initials {
                filter: blur(3px);
                opacity: 0.4;
                color: ${theme.text};
            }

            .swap-icon {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        &:active { transform: scale(0.95); }
    `}
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
  background: ${({ theme }) => theme.bgtotal}; 
  border-radius: 10px;
  border: 1px solid transparent; /* Sin borde por defecto para limpieza visual */
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);
  
  &:hover { 
      background: ${({ theme }) => theme.bgcards};
      border-color: ${({ theme }) => theme.primary}; 
  }

  select {
    width: 100%;
    padding: 10px 30px 10px 12px;
    appearance: none;
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.text};
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    outline: none;
    option { background: ${({ theme }) => theme.bgcards}; color: ${({ theme }) => theme.text}; }
  }

  .no-data { padding: 12px; font-size: 0.85rem; color: ${({ theme }) => theme.primary}; cursor: pointer; font-weight: 700; text-align: center; }
  .icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: ${({ theme }) => theme.primary || v.colorPrincipal}; font-size: 1.1rem; }
`;

const CrudContainer = styled.div`
    .add-form { display: flex; gap: 10px; align-items: flex-start; }
    .list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; padding-right: 4px; }
    .item { 
        background: ${({ theme }) => theme.bgtotal}; 
        padding: 10px; border-radius: 8px; 
        display: flex; justify-content: space-between; align-items: center; 
        transition: 0.2s;
        span { font-weight: 600; font-size: 0.9rem; } 
        .actions { display: flex; gap: 5px; button { background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 6px; border-radius: 6px; color: ${({ theme }) => theme.text}; opacity: 0.7; &:hover { background: rgba(0,0,0,0.05); opacity: 1; } } } 
    }
    .empty { text-align: center; opacity: 0.5; font-size: 0.9rem; margin-top: 10px; }
`;

const Divider = styled.div` height: 1px; background: ${({ theme }) => theme.bg4}; margin: 15px 0; `;