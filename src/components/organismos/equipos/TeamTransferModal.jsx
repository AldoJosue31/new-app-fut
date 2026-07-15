import React, { useState } from "react";
import styled from "styled-components";
import { Modal } from "../Modal";
import { Btnsave } from "../../moleculas/Btnsave";
import { v } from "../../../styles/variables";

export function TeamTransferModal({ isOpen, onClose, team, divisiones, currentDivision, onConfirm }) {
  const [targetDivisionId, setTargetDivisionId] = useState("");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transferir de División" width="400px">
      <div style={{display:'flex', flexDirection:'column', gap:'15px', padding:'10px'}}>
        <p>Selecciona la nueva división para <b>{team?.name}</b>:</p>
        <SelectStyled value={targetDivisionId} onChange={(e)=>setTargetDivisionId(e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {divisiones.filter(d => d.id !== currentDivision?.id).map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </SelectStyled>
        <Btnsave 
            titulo="Confirmar Transferencia" 
            bgcolor={v.colorPrincipal} 
            funcion={() => onConfirm(targetDivisionId, team)} 
            width="100%" 
        />
      </div>
    </Modal>
  );
}

const SelectStyled = styled.select`
  width: 100%; padding: 12px; border-radius: 15px; border: 2px solid ${({ theme }) => theme.color2}; background: ${({theme}) => theme.bgtotal}; color: ${({theme}) => theme.text}; font-family: inherit; outline: none;
`;