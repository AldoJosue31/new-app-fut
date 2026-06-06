import React, { useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { createPortal } from "react-dom";
import { AiOutlineClose } from "react-icons/ai";

let openModalCount = 0;
let scrollPosition = 0;
let previousBodyStyles = null;
let previousHtmlStyles = null;

const lockPageScroll = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  openModalCount += 1;
  if (openModalCount > 1) return;

  scrollPosition = window.scrollY || document.documentElement.scrollTop || 0;
  previousBodyStyles = {
    overflow: document.body.style.overflow,
    overflowY: document.body.style.overflowY,
    position: document.body.style.position,
    top: document.body.style.top,
    width: document.body.style.width,
  };
  previousHtmlStyles = {
    overflow: document.documentElement.style.overflow,
    overflowY: document.documentElement.style.overflowY,
  };

  document.body.style.overflow = "hidden";
  document.body.style.overflowY = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollPosition}px`;
  document.body.style.width = "100%";
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.overflowY = "hidden";
};

const unlockPageScroll = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount > 0) return;

  if (previousBodyStyles) {
    document.body.style.overflow = previousBodyStyles.overflow;
    document.body.style.overflowY = previousBodyStyles.overflowY;
    document.body.style.position = previousBodyStyles.position;
    document.body.style.top = previousBodyStyles.top;
    document.body.style.width = previousBodyStyles.width;
  }

  if (previousHtmlStyles) {
    document.documentElement.style.overflow = previousHtmlStyles.overflow;
    document.documentElement.style.overflowY = previousHtmlStyles.overflowY;
  }

  window.scrollTo(0, scrollPosition);
  previousBodyStyles = null;
  previousHtmlStyles = null;
  scrollPosition = 0;
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  headerActions = null,
  showCloseButton = true,
  closeOnOverlayClick = true,
  width = "500px",
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    lockPageScroll();
    return unlockPageScroll;
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <Overlay onClick={closeOnOverlayClick ? onClose : undefined}>
      <ModalContainer $width={width} $allowOverflow={!!headerActions} onClick={(e) => e.stopPropagation()}>
        <Header>
          <h3>{title || ""}</h3>

          <div className="header-actions">
            {headerActions}
            {showCloseButton && onClose && (
              <button className="close-btn" onClick={onClose}>
                <AiOutlineClose />
              </button>
            )}
          </div>
        </Header>
        <Body>{children}</Body>
      </ModalContainer>
    </Overlay>,
    document.getElementById("root")
  );
};

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideIn = keyframes`from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; }`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  animation: ${fadeIn} 0.2s ease-out;
  padding: 20px;
  overflow: hidden;
  overscroll-behavior: contain;
  touch-action: none;
`;

const ModalContainer = styled.div`
  background-color: ${({ theme }) => theme.bgcards};
  width: 100%;
  max-width: ${({ $width }) => $width};
  max-height: calc(100dvh - 40px);
  border-radius: 16px;
  box-shadow: none;
  animation: ${slideIn} 0.3s ease-out;
  display: flex;
  flex-direction: column;
  overflow: ${({ $allowOverflow }) => ($allowOverflow ? "visible" : "hidden")};
  color: ${({ theme }) => theme.text};
  transition: max-width 0.3s ease;
  touch-action: auto;
`;

const Header = styled.div`
  padding: 20px 25px;
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    min-width: 0;
  }

  .header-actions {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex: 0 0 auto;
  }

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

    &:hover {
      background: ${({ theme }) => theme.bg4};
    }
  }
`;

const Body = styled.div`
  padding: 25px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.bg4};
    border-radius: 4px;
  }
`;
