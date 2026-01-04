import React, { useState } from "react";
import styled from "styled-components";
import { v, Modal, BtnNormal } from "../../../../../index";

export function ManualMatchModal({ isOpen, onClose, teams, onAdd }) {
  const [match, setMatch] = useState({ local: "", visita: "" });

  const handleAdd = () => {
     onAdd(match.local, match.visita);
     setMatch({ local: "", visita: "" });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <ModalTitle>Agregar Cruce Manual</ModalTitle>
        <ModalBody>
            <label>Local</label>
            <select value={match.local} onChange={e=>setMatch({...match, local:e.target.value})}>
                <option value="">Seleccionar...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <label>Visitante</label>
            <select value={match.visita} onChange={e=>setMatch({...match, visita:e.target.value})}>
                <option value="">Seleccionar...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div style={{marginTop:20, display:'flex', justifyContent:'flex-end', gap:10}}>
                <BtnNormal titulo="Cancelar" funcion={onClose} />
                <BtnNormal titulo="Agregar" bgcolor={v.colorPrincipal} funcion={handleAdd} />
            </div>
        </ModalBody>
    </Modal>
  );
}

const ModalTitle = styled.h3` margin-bottom: 20px; text-align: center; color: ${({theme})=>theme.text}; `;
const ModalBody = styled.div` display: flex; flex-direction: column; gap: 10px; label{font-weight:600; font-size:0.9rem;} select{padding:10px; border-radius:5px; background:${({theme})=>theme.bg3}; color:${({theme})=>theme.text}; border:1px solid ${({theme})=>theme.bg4}; outline:none;} `;