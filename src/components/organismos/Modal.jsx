import React, { useLayoutEffect, useSyncExternalStore } from "react";
import styled, { keyframes } from "styled-components";
import { createPortal } from "react-dom";
import { AiOutlineClose } from "react-icons/ai";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";

import { getModalRoot } from "../../lib/dom/getModalRoot.js";

let openModalCount = 0;
let previousBodyStyles = null;
let previousHtmlStyles = null;

const lockPageScroll = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  openModalCount += 1;
  if (openModalCount > 1) return;

  previousBodyStyles = {
    overflow: document.body.style.overflow,
    overflowY: document.body.style.overflowY,
  };
  previousHtmlStyles = {
    overflow: document.documentElement.style.overflow,
    overflowY: document.documentElement.style.overflowY,
  };

  document.body.style.overflow = "hidden";
  document.body.style.overflowY = "hidden";
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
  }

  if (previousHtmlStyles) {
    document.documentElement.style.overflow = previousHtmlStyles.overflow;
    document.documentElement.style.overflowY = previousHtmlStyles.overflowY;
  }

  previousBodyStyles = null;
  previousHtmlStyles = null;
};

export const Modal = ({
  isOpen,
  onClose,
  closeDisabled = false,
  title,
  children,
  headerActions = null,
  headerActionsWrapOnMobile = false,
  sidePanel = null,
  showCloseButton = true,
  closeOnOverlayClick = true,
  compactHeader = false,
  overlayPadding = "20px",
  maxHeight = "calc(100dvh - 40px)",
  minHeight = "auto",
  smallScreenMaxHeight = null,
  smallScreenMinHeight = null,
  bodyPadding = "25px",
  bodyOverflowY = "auto",
  width = "500px",
}) => {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    lockPageScroll();
    return unlockPageScroll;
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <ModalContainer
        $width={width}
        $maxHeight={maxHeight}
        $minHeight={minHeight}
        $smallScreenMaxHeight={smallScreenMaxHeight}
        $smallScreenMinHeight={smallScreenMinHeight}
        $allowOverflow={!!headerActions}
        $docked={!!sidePanel}
        $sideOpen={Boolean(sidePanel?.open)}
        onClick={(e) => e.stopPropagation()}
      >
        <Header $compact={compactHeader} $wrapActions={headerActionsWrapOnMobile && !!headerActions}>
          <h3>{title || ""}</h3>

          <div className="header-actions">
            {headerActions}
            {showCloseButton && onClose && (
              <button type="button" className="close-btn" onClick={onClose} disabled={closeDisabled} aria-label="Cerrar ventana">
                <AiOutlineClose />
              </button>
            )}
          </div>
        </Header>
        <Body $padding={bodyPadding} $overflowY={bodyOverflowY}>{children}</Body>
    </ModalContainer>
  );

  return createPortal(
    <Overlay $padding={overlayPadding} onClick={closeOnOverlayClick && !closeDisabled ? onClose : undefined}>
      {sidePanel ? <DockLayout
        $width={width}
        $open={sidePanel.open}
        $mainMinWidth={sidePanel.mainMinWidth}
        style={{ '--dock-preferred-panel-width': sidePanel.preferredWidth ? `${sidePanel.preferredWidth}px` : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        {sidePanel.available && <DockToggle
            type="button"
            $open={sidePanel.open}
            aria-label={sidePanel.open ? "Ocultar cédula" : "Mostrar cédula"}
            aria-expanded={sidePanel.open}
            aria-controls={sidePanel.id}
            onClick={sidePanel.onToggle}
          >
            {sidePanel.open ? <RiArrowLeftSLine /> : <RiArrowRightSLine />}
          </DockToggle>}
        <DockPanel id={sidePanel.id} $open={sidePanel.open} $fitContent={sidePanel.fitContent} aria-label={sidePanel.label}>
          {sidePanel.content}
        </DockPanel>
        {modalContent}
      </DockLayout> : modalContent}
    </Overlay>,
    getModalRoot(),
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
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  animation: ${fadeIn} 0.2s ease-out;
  padding: ${({ $padding }) => $padding};
  overflow: hidden;
  overscroll-behavior: contain;
  touch-action: none;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ModalContainer = styled.div`
  background-color: ${({ theme }) => theme.bgcards};
  width: ${({ $docked }) => $docked ? '0' : '100%'};
  flex: ${({ $docked }) => $docked ? '1 1 0' : '0 1 auto'};
  min-width: 0;
  max-width: ${({ $docked, $width }) => $docked ? 'none' : $width};
  max-height: ${({ $maxHeight }) => $maxHeight};
  min-height: ${({ $minHeight }) => $minHeight};
  border-radius: ${({ $sideOpen }) => $sideOpen ? '0 16px 16px 0' : '16px'};
  box-shadow: none;
  animation: ${slideIn} 0.18s ease-out;
  display: flex;
  flex-direction: column;
  ${({ $docked }) => $docked && 'container: modal / inline-size;'}
  overflow: ${({ $allowOverflow }) => ($allowOverflow ? "visible" : "hidden")};
  color: ${({ theme }) => theme.text};
  touch-action: auto;

  @media (max-width: 1023px) {
    max-height: ${({ $smallScreenMaxHeight, $maxHeight }) => $smallScreenMaxHeight || $maxHeight};
    min-height: ${({ $smallScreenMinHeight, $minHeight }) => $smallScreenMinHeight || $minHeight};
  }

  @media (max-width: 900px) {
    width: 100%;
    ${({ $sideOpen, $smallScreenMaxHeight, $smallScreenMinHeight, $maxHeight, $minHeight }) => $sideOpen && `
      max-height: calc(${$smallScreenMaxHeight || $maxHeight} - var(--dock-panel-mobile-height));
      min-height: calc(${$smallScreenMinHeight || $minHeight} - var(--dock-panel-mobile-height));
      border-radius: 0 0 16px 16px;
    `}
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Header = styled.div`
  padding: ${({ $compact }) => ($compact ? "10px 18px" : "20px 25px")};
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ $compact }) => ($compact ? "12px" : "16px")};
  min-height: ${({ $compact }) => ($compact ? "52px" : "auto")};

  h3 {
    margin: 0;
    font-size: ${({ $compact }) => ($compact ? "1.05rem" : "1.2rem")};
    font-weight: 700;
    min-width: 0;
    line-height: 1.2;
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

    &:disabled { cursor: wait; opacity: .55; }
  }

  @media (max-width: 560px) {
    ${({ $wrapActions }) => $wrapActions && `
      flex-wrap: wrap;
      padding: 12px 16px;
      gap: 10px;
      .header-actions { flex: 1 1 100%; min-width: 0; width: 100%; }
      .close-btn { flex: 0 0 44px; min-height: 44px; }
    `}
  }

  @container modal (max-width: 640px) {
    ${({ $wrapActions }) => $wrapActions && `
      flex-wrap: wrap;
      padding: 12px 16px;
      gap: 10px;
      .header-actions { flex: 1 1 100%; min-width: 0; width: 100%; }
      .close-btn { flex: 0 0 44px; min-height: 44px; }
    `}
  }
`;

const DockLayout = styled.div`
  --dock-default-panel-width: clamp(280px, 28vw, 380px);
  --dock-preferred-panel-width: var(--dock-default-panel-width);
  --dock-panel-width: min(var(--dock-preferred-panel-width), max(0px, calc(100% - ${({ $mainMinWidth }) => $mainMinWidth || '500px'})));
  --dock-panel-mobile-height: min(32dvh, 260px);
  position: relative;
  display: flex;
  align-items: stretch;
  width: ${({ $width, $open }) => $open
    ? `min(calc(${$width} + var(--dock-preferred-panel-width)), calc(100vw - 16px))`
    : $width};
  max-width: calc(100vw - 16px);
  min-width: 0;
  max-height: 96dvh;

  @media (max-width: 900px) {
    flex-direction: column;
    width: ${({ $width }) => $width};
  }
`;

const DockPanel = styled.aside`
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  flex: 0 0 var(--dock-panel-width);
  width: var(--dock-panel-width);
  min-width: 0;
  min-height: 0;
  align-self: ${({ $fitContent }) => $fitContent ? 'center' : 'stretch'};
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 16px 0 0 16px;
  background: ${({ theme }) => theme.bgcards};
  color: ${({ theme }) => theme.text};

  @media (max-width: 900px) {
    align-self: stretch;
    flex: 0 0 var(--dock-panel-mobile-height);
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 16px 16px 0 0;
  }
`;

const DockToggle = styled.button`
  position: absolute;
  z-index: 2;
  top: 50%;
  left: ${({ $open }) => $open ? 'var(--dock-panel-width)' : '0'};
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  width: 36px;
  min-height: 56px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 9px;
  background: ${({ theme }) => theme.bgcards};
  color: ${({ theme }) => theme.text};
  font-size: 1.3rem;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  &:hover { background: ${({ theme }) => theme.bg3}; }
  &:focus-visible { outline: 3px solid ${({ theme }) => theme.primary}; outline-offset: 2px; }

  @media (max-width: 900px) {
    top: ${({ $open }) => $open ? 'var(--dock-panel-mobile-height)' : '50%'};
    left: 0;
    width: 44px;
    min-height: 44px;
    transform: translate(-15%, -50%);
  }
`;

const Body = styled.div`
  padding: ${({ $padding }) => $padding};
  flex: 1;
  min-height: 0;
  overflow-y: ${({ $overflowY }) => $overflowY};
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  
  /* NUEVO: Forzamos a que el cuerpo respete el tamaño del Modal */
  display: flex;
  flex-direction: column;

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
