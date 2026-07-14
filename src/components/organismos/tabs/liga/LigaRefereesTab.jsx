import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../../../styles/variables";
import { GiWhistle } from "react-icons/gi";
import { RiAddLine, RiShieldUserLine, RiPhoneLine, RiPencilLine, RiDeleteBinLine } from "react-icons/ri";
import { Card } from "../../../moleculas/Card";
import { CardHeader } from "../../../moleculas/CardHeader";
import { BtnGreen } from "../../../moleculas/BtnGreen";
import { Modal } from "../../Modal";
import { InputText2 } from "../../formularios/InputText2";
import { Btnsave } from "../../../moleculas/Btnsave";
import { ConfirmModal } from "../../ConfirmModal";
import { Skeleton } from "../../../atomos/Skeleton";

export function LigaRefereesTab({ referees, onAdd, onEdit, onDelete, loading }) {
  const [modal, setModal] = useState({ open: false, type: 'add', data: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [form, setForm] = useState({ full_name: "", phone: "" });

  const handleOpen = (type, data = null) => {
    setModal({ open: true, type, data });
    setForm(data ? { full_name: data.full_name, phone: data.phone } : { full_name: "", phone: "" });
  };

  const handleSubmit = () => {
    if (!form.full_name.trim()) return alert("Nombre requerido");
    if (modal.type === 'add') onAdd(form);
    else onEdit(modal.data.id, form);
    setModal({ ...modal, open: false });
  };

  const confirmDelete = () => {
    onDelete(deleteModal.id);
    setDeleteModal({ ...deleteModal, open: false });
  };

  // --- MODO SKELETON MIENTRAS CARGA ---
  if (loading) {
    return (
      <Card maxWidth="800px">
        <HeaderContainer>
            <CardHeader Icono={GiWhistle} titulo="Cuerpo Arbitral" subtitulo="Registro oficial" />
            <div className="action-area">
                <Skeleton width="160px" height="40px" radius="12px" />
            </div>
        </HeaderContainer>
        
        <ListGrid>
            {[1, 2, 3].map((i) => (
                <ListItem key={i}>
                    <div className="icon-avatar" style={{ background: 'transparent' }}>
                        <Skeleton width="40px" height="40px" radius="50%" />
                    </div>
                    
                    <div className="info" style={{ width: '100%', gap: '6px' }}>
                        <Skeleton width="45%" height="18px" />
                        <Skeleton width="25%" height="12px" />
                    </div>
                    
                    <div className="actions">
                        <Skeleton width="32px" height="32px" radius="8px" />
                        <Skeleton width="32px" height="32px" radius="8px" />
                    </div>
                </ListItem>
            ))}
        </ListGrid>
      </Card>
    );
  }

  return (
    <Card maxWidth="800px">
        <HeaderContainer>
            <CardHeader Icono={GiWhistle} titulo="Cuerpo Arbitral" subtitulo="Registro oficial" />
            <div className="action-area">
                <BtnGreen 
                    titulo="Nuevo Árbitro" 
                    icono={<RiAddLine/>} 
                    funcion={() => handleOpen('add')} 
                />
            </div>
        </HeaderContainer>
        
        <ListGrid>
            {referees && referees.map((ref) => (
                <ListItem key={ref.id}>
                    <div className="icon-avatar"><RiShieldUserLine /></div>
                    
                    <div className="info">
                        <span className="name">{ref.full_name}</span>
                        <span className="meta">
                            <RiPhoneLine className="mini-icon"/> 
                            {ref.phone || "Sin teléfono"}
                        </span>
                    </div>
                    
                    <div className="actions">
                        <button type="button" className="btn-edit" onClick={() => handleOpen('edit', ref)} aria-label={`Editar árbitro ${ref.full_name}`}><RiPencilLine/></button>
                        <button type="button" className="btn-del" onClick={() => setDeleteModal({open:true, id:ref.id, name:ref.full_name})} aria-label={`Eliminar árbitro ${ref.full_name}`}><RiDeleteBinLine/></button>
                    </div>
                </ListItem>
            ))}
            {(!referees || referees.length === 0) && <EmptyMsg>No hay árbitros registrados.</EmptyMsg>}
        </ListGrid>

        <Modal isOpen={modal.open} onClose={() => setModal({...modal, open:false})} title={modal.type === 'add' ? "Registrar Árbitro" : "Editar Árbitro"}>
           <ModalContent>
               <label htmlFor="referee-full-name">Nombre Completo</label>
               <InputText2>
                  <input 
                    id="referee-full-name"
                    className="form__field" 
                    value={form.full_name} 
                    onChange={(e)=>setForm({...form, full_name:e.target.value})} 
                    placeholder="Ej. Juan Pérez" 
                  />
               </InputText2>
               
               <label htmlFor="referee-phone">Teléfono</label>
               <InputText2>
                  <input 
                    id="referee-phone"
                    className="form__field" 
                    type="tel" 
                    value={form.phone} 
                    onChange={(e)=>setForm({...form, phone:e.target.value})} 
                    placeholder="Ej. 555-1234"
                  />
               </InputText2>

               <div className="footer-modal">
                   <Btnsave titulo="Guardar" bgcolor={v.colorPrincipal} funcion={handleSubmit} />
               </div>
           </ModalContent>
        </Modal>

        <ConfirmModal 
            isOpen={deleteModal.open} onClose={() => setDeleteModal({...deleteModal, open:false})}
            onConfirm={confirmDelete} 
            title="Eliminar Árbitro" 
            message={`¿Eliminar a "${deleteModal.name}"?`}
        />
    </Card>
  );
}

// --- ESTILOS ---
const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 25px;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .action-area {
      display: flex;
      justify-content: flex-start;
      @media (min-width: 768px) {
          justify-content: flex-end;
      }
  }
`;

const ListGrid = styled.div` 
  display: flex; 
  flex-direction: column; 
  gap: 10px; 
`;

const ListItem = styled.div`
    display: flex; 
    align-items: center; 
    padding: 15px; 
    border-radius: 12px;
    background: ${({theme}) => theme.bgtotal}; 
    border: 1px solid ${({theme}) => theme.bg4};
    
    .icon-avatar { 
        width: 40px; 
        height: 40px; 
        background: ${({theme}) => theme.bgcards}; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        margin-right: 15px; 
        font-size: 20px; 
        color: ${({theme}) => theme.text};
    }
    
    .info { 
        flex: 1; 
        display: flex; 
        flex-direction: column; 
        
        .name { 
            font-weight: 600; 
        } 
        
        .meta { 
            font-size: 12px; 
            opacity: 0.6; 
            display: flex; 
            align-items: center; 
            gap: 5px; 
            margin-top: 2px;
        } 
    }
    
    .actions { 
        display: flex; 
        gap: 8px; 
        
        button { 
            border: none; 
            width: 32px; 
            height: 32px; 
            border-radius: 8px; 
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
        } 
        
        .btn-edit { 
            color: ${({theme})=>theme.primary}; 
            background: ${({theme})=>theme.bgcards}; 
        } 
        
        .btn-del { 
            color: ${v.rojo}; 
            background: ${({theme})=>theme.bgcards}; 
        } 
    }
`;

const EmptyMsg = styled.div` 
  text-align: center; 
  padding: 30px; 
  opacity: 0.5; 
  font-style: italic; 
  background: ${({theme})=>theme.bgtotal}; 
  border-radius: 12px; 
`;

const ModalContent = styled.div` 
  display: flex; 
  flex-direction: column; 
  gap: 15px; 
  padding-top: 10px; 
  
  .footer-modal { 
      display: flex; 
      justify-content: flex-end; 
      margin-top: 15px; 
  } 
  
  label { 
      font-size: 13px; 
      font-weight: 600; 
      margin-bottom: 5px; 
  }
`;
