import React from "react";
import styled, { keyframes } from "styled-components";
import { createPortal } from "react-dom";
import { AiOutlineClose } from "react-icons/ai";

// Agregamos la prop closeOnOverlayClick (default: true)
export const Modal = ({ isOpen, onClose, title, children, closeOnOverlayClick = true }) => {
  if (!isOpen) return null;

  return createPortal(
    <Overlay onClick={closeOnOverlayClick ? onClose : undefined}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <Header>
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>
            <AiOutlineClose />
          </button>
        </Header>
        <Body>
          {children}
        </Body>
      </ModalContainer>
    </Overlay>,
    document.getElementById("root")
  );
};

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
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background-color: ${({ theme }) => theme.bgcards};
  width: 100%;
  max-width: 500px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  animation: ${slideIn} 0.3s ease-out;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: ${({ theme }) => theme.text};
`;

const Header = styled.div`
  padding: 20px 25px;
  border-bottom: 1px solid ${({ theme }) => theme.colorSubtitle};
  display: flex;
  justify-content: space-between;
  align-items: center;
  h3 { margin: 0; font-size: 1.2rem; }
  .close-btn {
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.text};
    cursor: pointer;
    font-size: 1.2rem;
  }
`;

const Body = styled.div`
  padding: 25px;
  max-height: 80vh;
  overflow-y: auto;
`;