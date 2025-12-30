import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../../../styles/variables";
import { GiWhistle } from "react-icons/gi";
import { RiAddLine, RiShieldUserLine, RiPhoneLine, RiPencilLine, RiDeleteBinLine } from "react-icons/ri";
import { Card, CardHeader, BtnNormal, Modal, InputText2, Btnsave, ConfirmModal } from "../../../../index";

export function LigaRefereesTab({ referees, onAdd, onEdit, onDelete }) {
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

  return (
    <Card maxWidth="800px">
        <div className="header-row">
            <CardHeader Icono={GiWhistle} titulo="Cuerpo Arbitral" subtitulo="Registro oficial" />
            <BtnNormal titulo="Nuevo Árbitro" icono={<RiAddLine/>} funcion={() => handleOpen('add')} />
        </div>

        <ListGrid>
            {referees.map((ref) => (
                <ListItem key={ref.id}>
                    <div className="icon-avatar"><RiShieldUserLine /></div>
                    <div className="info">
                        <span className="name">{ref.full_name}</span>
                        <span className="meta"><RiPhoneLine className="mini-icon"/> {ref.phone || "Sin teléfono"}</span>
                    </div>
                    <div className="actions">
                        <button className="btn-edit" onClick={() => handleOpen('edit', ref)}><RiPencilLine/></button>
                        <button className="btn-del" onClick={() => setDeleteModal({open:true, id:ref.id, name:ref.full_name})}><RiDeleteBinLine/></button>
                    </div>
                </ListItem>
            ))}
            {referees.length === 0 && <EmptyMsg>No hay árbitros registrados.</EmptyMsg>}
        </ListGrid>

        <Modal isOpen={modal.open} onClose={() => setModal({...modal, open:false})} title={modal.type === 'add' ? "Registrar" : "Editar"}>
           <ModalContent>
               <label>Nombre Completo</label>
               <InputText2><input className="form__field" value={form.full_name} onChange={(e)=>setForm({...form, full_name:e.target.value})} /></InputText2>
               <label>Teléfono</label>
               <InputText2><input className="form__field" type="tel" value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} /></InputText2>
               <div className="footer-modal"><Btnsave titulo="Guardar" bgcolor={v.colorPrincipal} funcion={handleSubmit} /></div>
           </ModalContent>
        </Modal>

        <ConfirmModal 
             isOpen={deleteModal.open} onClose={() => setDeleteModal({...deleteModal, open:false})}
             onConfirm={() => { onDelete(deleteModal.id); setDeleteModal({...deleteModal, open:false}); }}
             title="Eliminar Árbitro" message={`¿Eliminar a "${deleteModal.name}"?`}
        />
    </Card>
  );
}

// Reutilizamos estilos similares (puedes unificarlos en un archivo styles.js si prefieres)
const ListGrid = styled.div` display: flex; flex-direction: column; gap: 10px; .header-row { display: flex; justify-content: space-between; margin-bottom: 20px; } `;
const ListItem = styled.div`
    display: flex; align-items: center; padding: 15px; border-radius: 12px; background: ${({theme}) => theme.bgtotal}; border: 1px solid ${({theme}) => theme.bg4};
    .icon-avatar { width: 40px; height: 40px; background: ${({theme}) => theme.bgcards}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px; }
    .info { flex: 1; display: flex; flex-direction: column; .name { font-weight: 600; } .meta { font-size: 12px; opacity: 0.6; display: flex; align-items: center; gap: 5px; } }
    .actions { display: flex; gap: 8px; button { border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; } .btn-edit { color: ${({theme})=>theme.primary}; background: ${({theme})=>theme.bgcards}; } .btn-del { color: ${v.rojo}; background: ${({theme})=>theme.bgcards}; } }
`;
const EmptyMsg = styled.div` text-align: center; padding: 30px; opacity: 0.5; background: ${({theme})=>theme.bgtotal}; border-radius: 12px; `;
const ModalContent = styled.div` display: flex; flex-direction: column; gap: 15px; padding-top: 10px; .footer-modal { display: flex; justify-content: flex-end; margin-top: 15px; } label { font-size: 13px; font-weight: 600; }`;