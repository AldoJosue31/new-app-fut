import React, { useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { createPortal } from "react-dom";
import { AiOutlineClose } from "react-icons/ai";

export const Modal = ({ isOpen, onClose, title, children, closeOnOverlayClick = true, width = "500px" }) => {
  
  // --- CORRECCIÓN: BLOQUEO TOTAL DE SCROLL ---
  useEffect(() => {
    if (isOpen) {
      // 1. Bloquear scroll en body y html (para móviles y escritorio)
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // 2. Restaurar scroll al cerrar
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    // 3. Cleanup: Asegurar que se restaura si el componente se desmonta
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <Overlay onClick={closeOnOverlayClick ? onClose : undefined}>
      <ModalContainer $width={width} onClick={(e) => e.stopPropagation()}>
        <Header>
          {/* Si no hay título, mostramos un div vacío para mantener el layout del botón de cerrar */}
          <h3>{title || ""}</h3>
          
          {onClose && (
            <button className="close-btn" onClick={onClose}>
              <AiOutlineClose />
            </button>
          )}
        </Header>
        <Body>
          {children}
        </Body>
      </ModalContainer>
    </Overlay>,
    document.getElementById("root")
  );
};

// --- ESTILOS ---

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideIn = keyframes`from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; }`;

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000; 
  animation: ${fadeIn} 0.2s ease-out;
  padding: 20px;
  
  /* IMPORTANTE: Previene que eventos de touch pasen al fondo en móviles */
  touch-action: none; 
`;

const ModalContainer = styled.div`
  background-color: ${({ theme }) => theme.bgcards};
  width: 100%;
  max-width: ${({ $width }) => $width};
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  animation: ${slideIn} 0.3s ease-out;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: ${({ theme }) => theme.text};
  transition: max-width 0.3s ease;
  
  /* Restauramos touch-action para permitir scroll dentro del modal */
  touch-action: auto; 
`;

const Header = styled.div`
  padding: 20px 25px;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  display: flex;
  justify-content: space-between;
  align-items: center;
  h3 { margin: 0; font-size: 1.2rem; font-weight: 700; }
  .close-btn {
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.text};
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
    border-radius: 50%;
    transition: background 0.2s;
    &:hover { background: rgba(255,255,255,0.1); }
  }
`;

const Body = styled.div`
  padding: 25px;
  max-height: 85vh; /* Límite de altura para permitir scroll interno si es muy alto */
  overflow-y: auto;
  
  /* Estilizado de scrollbar interno */
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: ${({theme})=>theme.bg4}; border-radius: 4px; }
  
  /* Soporte móvil */
  -webkit-overflow-scrolling: touch;
`;