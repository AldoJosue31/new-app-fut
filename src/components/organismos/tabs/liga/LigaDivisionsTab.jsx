import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../../../styles/variables";
import { RiBuilding2Line, RiAddLine, RiPencilLine, RiDeleteBinLine } from "react-icons/ri";
import { Card, CardHeader, BtnNormal, Modal, InputText2, Btnsave, ConfirmModal } from "../../../../index";

export function LigaDivisionsTab({ divisions, onAdd, onEdit, onDelete }) {
  const [modal, setModal] = useState({ open: false, type: 'add', data: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [formValue, setFormValue] = useState("");

  const handleOpen = (type, data = null) => {
    setModal({ open: true, type, data });
    setFormValue(data ? data.name : "");
  };

  const handleSubmit = () => {
    if (!formValue.trim()) return alert("Nombre requerido");
    if (modal.type === 'add') onAdd(formValue);
    else onEdit(modal.data.id, formValue);
    setModal({ ...modal, open: false });
  };

  const confirmDelete = () => {
    onDelete(deleteModal.id);
    setDeleteModal({ ...deleteModal, open: false });
  };

  return (
    <Card maxWidth="800px">
        <div className="header-row">
            <CardHeader Icono={RiBuilding2Line} titulo="Mis Divisiones" subtitulo="Categorías activas" />
            <BtnNormal titulo="Nueva División" icono={<RiAddLine/>} funcion={() => handleOpen('add')} />
        </div>
        
        <ListGrid>
            {divisions.map((div) => (
                <ListItem key={div.id}>
                    <div className="info">
                        <span className="name">{div.name}</span>
                        <span className="meta">ID: {div.id} • Tier {div.tier || 1}</span>
                    </div>
                    <div className="actions">
                        <button className="btn-edit" onClick={() => handleOpen('edit', div)}><RiPencilLine/></button>
                        <button className="btn-del" onClick={() => setDeleteModal({open:true, id:div.id, name:div.name})}><RiDeleteBinLine/></button>
                    </div>
                </ListItem>
            ))}
            {divisions.length === 0 && <EmptyMsg>No hay divisiones creadas.</EmptyMsg>}
        </ListGrid>

        {/* Modal Formulario */}
        <Modal isOpen={modal.open} onClose={() => setModal({...modal, open:false})} title={modal.type === 'add' ? "Crear División" : "Editar"}>
           <ModalContent>
               <label>Nombre de la División</label>
               <InputText2>
                  <input className="form__field" value={formValue} onChange={(e)=>setFormValue(e.target.value)} autoFocus />
               </InputText2>
               <div className="footer-modal">
                   <Btnsave titulo="Guardar" bgcolor={v.colorPrincipal} funcion={handleSubmit} />
               </div>
           </ModalContent>
        </Modal>

        {/* Modal Confirmación */}
        <ConfirmModal 
            isOpen={deleteModal.open} onClose={() => setDeleteModal({...deleteModal, open:false})}
            onConfirm={confirmDelete} title="Eliminar División" message={`¿Eliminar "${deleteModal.name}"?`}
        />
    </Card>
  );
}

// Styles
const ListGrid = styled.div` display: flex; flex-direction: column; gap: 10px; .header-row { display: flex; justify-content: space-between; margin-bottom: 20px; } `;
const ListItem = styled.div`
    display: flex; align-items: center; justify-content: space-between; padding: 15px; border-radius: 12px;
    background: ${({theme}) => theme.bgtotal}; border: 1px solid ${({theme}) => theme.bg4};
    .info { display: flex; flex-direction: column; .name { font-weight: 600; } .meta { font-size: 12px; opacity: 0.6; } }
    .actions { display: flex; gap: 8px; button { border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; } .btn-edit { color: ${({theme})=>theme.primary}; background: ${({theme})=>theme.bgcards}; } .btn-del { color: ${v.rojo}; background: ${({theme})=>theme.bgcards}; } }
`;
const EmptyMsg = styled.div` text-align: center; padding: 30px; opacity: 0.5; font-style: italic; background: ${({theme})=>theme.bgtotal}; border-radius: 12px; `;
const ModalContent = styled.div` display: flex; flex-direction: column; gap: 15px; padding-top: 10px; .footer-modal { display: flex; justify-content: flex-end; margin-top: 15px; } label { font-size: 13px; font-weight: 600; margin-bottom: 5px; }`;