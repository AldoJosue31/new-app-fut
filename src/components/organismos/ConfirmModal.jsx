import React from "react";
import styled from "styled-components";
import { Modal } from "./Modal";
import { Btnsave, BtnNormal } from "../../index";
import { v } from "../../styles/variables";
import { RiErrorWarningLine } from "react-icons/ri";

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmar Acción", 
  message, 
  subMessage, 
  confirmText = "Eliminar", 
  confirmColor = v.rojo,
  confirmIcon
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="400px" closeOnOverlayClick={false}>
      <Container>
        <div className="icon-warning"><RiErrorWarningLine /></div>
        <p className="message">{message}</p>
        {subMessage && <span className="sub-message">{subMessage}</span>}
        
        <div className="actions">
           <BtnNormal titulo="Cancelar" funcion={onClose} />
           <Btnsave 
             titulo={confirmText} 
             bgcolor={confirmColor} 
             icono={confirmIcon || <v.iconocerrar />} 
             funcion={onConfirm} 
           />
        </div>
      </Container>
    </Modal>
  );
};

const Container = styled.div`
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 15px; padding: 10px;
  .icon-warning { font-size: 3.5rem; color: #f1c40f; margin-bottom: 5px; }
  .message { font-size: 1.1rem; color: ${({theme})=>theme.text}; font-weight: 600; margin: 0; }
  .sub-message { font-size: 0.9rem; color: ${({theme})=>theme.text}; opacity: 0.7; }
  .actions { display: flex; gap: 15px; width: 100%; justify-content: center; margin-top: 15px; }
`;