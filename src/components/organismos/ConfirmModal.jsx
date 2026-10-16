import React from "react";
import styled, { css, keyframes } from "styled-components";
import { Modal } from "./Modal";
import { Btnsave } from "../moleculas/Btnsave";
import { BtnNormal } from "../moleculas/BtnNormal";
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
  confirmIcon,
  confirmDisabled = false,
  loading = false,
  loadingMessage = "Procesando...",
  width = "400px",
  thinButtons = false, // <-- Nueva prop para hacer botones más delgados
  variant = "default",
  cancelText = "Cancelar",
  onCancel,
  children             // <-- Nueva prop para inyectar contenido extra (como los números grandes)
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={width}
      closeOnOverlayClick={false}
      showCloseButton={!loading}
    >
      <Container $thinButtons={thinButtons} $review={variant === "review"} aria-busy={loading}>
        {loading ? (
          <div className="loading-state" role="status" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <p className="message">{loadingMessage}</p>
          </div>
        ) : (
          <>
            {variant !== "review" && <div className="icon-warning"><RiErrorWarningLine /></div>}
            <p className="message">{message}</p>

            {subMessage && <span className="sub-message">{subMessage}</span>}
          </>
        )}
        
        {/* Renderizamos contenido extra personalizado si existe */}
        {children}
        
        {!loading && (
          <div className="actions">
            {variant === "review" ? (
              <>
                <button type="button" className="review-secondary" onClick={onCancel || onClose}>{cancelText}</button>
                <button type="button" className="review-primary" onClick={onConfirm} disabled={confirmDisabled}>
                  {confirmIcon}{confirmText}
                </button>
              </>
            ) : (
              <>
                <BtnNormal titulo={cancelText} funcion={onCancel || onClose} />
                <Btnsave titulo={confirmText} bgcolor={confirmColor} icono={confirmIcon || <v.iconocerrar />}
                  funcion={onConfirm} disabled={confirmDisabled} />
              </>
            )}
          </div>
        )}
      </Container>
    </Modal>
  );
};

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Container = styled.div`
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 15px; padding: 10px;
  .icon-warning { font-size: 3.5rem; color: #f1c40f; margin-bottom: 5px; }
  .message { font-size: 1.1rem; color: ${({theme})=>theme.text}; font-weight: 600; margin: 0; }
  .sub-message { font-size: 0.9rem; color: ${({theme})=>theme.text}; opacity: 0.7; }
  .actions { display: flex; gap: 15px; width: 100%; justify-content: center; margin-top: 15px; }

  .loading-state {
    min-height: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .loading-spinner {
    width: 46px;
    height: 46px;
    border: 4px solid ${({ theme }) => theme.bg4};
    border-top-color: ${v.colorPrincipal};
    border-radius: 50%;
    animation: ${spin} 0.75s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-spinner {
      animation: none;
      border-right-color: ${v.colorPrincipal};
    }
  }

  /* Aplicamos estilos más delgados a los botones si la prop es true */
  ${({ $thinButtons, $review }) => $thinButtons && !$review && css`
    .actions button {
        padding: 8px 16px !important;
        height: auto !important;
        min-height: 38px !important;
        font-size: 0.9rem !important;
    }
  `}

  ${({ $review }) => $review && css`
    align-items: stretch;
    text-align: left;
    gap: 20px;
    padding: 0;
    .message { color: ${({ theme }) => theme.tournamentDashboard.muted}; font-size: 0.87rem; font-weight: 400; line-height: 1.6; }
    .actions { justify-content: flex-end; gap: 10px; margin-top: 0; padding-top: 18px; border-top: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; }
    .actions button {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      min-height: 44px; padding: 10px 16px; border: 1px solid transparent; border-radius: 12px;
      font: inherit; font-size: 0.85rem; font-weight: 600; white-space: nowrap; cursor: pointer;
      transition: background-color 160ms ease-out;
    }
    .review-secondary { background: transparent; color: ${({ theme }) => theme.text}; border-color: ${({ theme }) => theme.tournamentDashboard.border}; }
    .review-secondary:hover { background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; }
    .review-primary { background: ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong}; color: ${({ theme }) => theme.tournamentDashboard.surface}; }
    .review-primary:hover:not(:disabled) { filter: brightness(0.93); }
    .actions button:active:not(:disabled) { transform: translateY(1px); }
    .review-primary:disabled { background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; color: ${({ theme }) => theme.tournamentDashboard.muted}; cursor: not-allowed; }
    .actions button:focus-visible { outline: 2px solid ${({ theme }) => theme.tournamentDashboard.jornada.accentStrong}; outline-offset: 3px; }
    @media (max-width: 480px) { .actions { flex-direction: column-reverse; } .actions button { width: 100%; } }
    @media (prefers-reduced-motion: reduce) { .actions button { transition: none; } .actions button:active { transform: none; } }
  `}
`;
