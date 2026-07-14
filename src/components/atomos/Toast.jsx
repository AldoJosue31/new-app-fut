import React, { useEffect, useEffectEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { v } from '../../styles/variables';
import { RiErrorWarningLine, RiCheckboxCircleLine, RiCloseLine } from "react-icons/ri";

export function Toast({ show, message, type = 'error', onClose, duration = 3000, inline = false }) {
    // 1. Agregamos un estado para saber si el Toast ha sido activado alguna vez
    const [hasBeenShown, setHasBeenShown] = useState(show);
    const onAutoClose = useEffectEvent(onClose);

    useEffect(() => {
        if (show && duration) {
            const timer = setTimeout(() => {
                onAutoClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration]);

    const content = (
        // 2. Pasamos la nueva prop $hasBeenShown al componente estilizado
        <ToastContainer
            $show={show}
            $type={type}
            $hasBeenShown={hasBeenShown}
            $inline={inline}
            onAnimationStart={() => {
                if (show && !hasBeenShown) setHasBeenShown(true);
            }}
        >
            <div className="icon-box">
                {type === 'error' ? <RiErrorWarningLine /> : <RiCheckboxCircleLine />}
            </div>
            <div className="content">
                <span className="title">{type === 'error' ? 'Error' : 'Éxito'}</span>
                <span className="message">{message}</span>
            </div>
            <button type="button" className="close-btn" onClick={onClose} aria-label="Cerrar notificación"><RiCloseLine /></button>
        </ToastContainer>
    );

    if (inline) return content;

    if (typeof window === 'undefined' || !document.body) return null;

    return createPortal(content, document.body);
}

// --- Styles & Animations ---

const slideIn = keyframes`
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
`;

const fadeOut = keyframes`
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
`;

const ToastContainer = styled.div`
    ${({ $inline }) => $inline ? css`
        position: absolute;
        z-index: 10;
    ` : css`
        position: fixed;
        top: 30px;
        right: 30px;
        z-index: 200000;
    `}
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    padding: 16px;
    border-radius: 12px;
    background: ${({ theme }) => theme.bgtotal};
    border: 1px solid ${({ theme }) => theme.bg4};
    box-shadow: inset 2px 0 0 ${({ $type }) => $type === 'error' ? v.colorError : v.colorExito}, 0 10px 30px rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
    
    /* 3. Lógica de animación corregida */
    animation: ${({ $show, $hasBeenShown }) => {
        // Si está activo, entra
        if ($show) return css`${slideIn} 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards`;
        
        // Si NO está activo, PERO ya fue mostrado antes, sale (fadeOut)
        if (!$show && $hasBeenShown) return css`${fadeOut} 0.4s forwards`;
        
        // Estado inicial (carga de página): Sin animación
        return 'none';
    }};

    /* Importante para que no estorbe cuando no se muestra pero la animación de salida termina */
    pointer-events: ${({ $show }) => $show ? 'all' : 'none'};
    
    /* Ajustamos la opacidad base: si no se ha mostrado nunca, debe ser 0 */
    opacity: ${({ $show, $hasBeenShown }) => ($show || $hasBeenShown) ? '1' : '0'};

    .icon-box {
        font-size: 24px;
        color: ${({ $type }) => $type === 'error' ? v.colorError : v.colorExito};
        display: flex;
        align-items: center;
    }

    .content {
        display: flex;
        flex-direction: column;
        flex: 1;
        
        .title {
            font-weight: 700;
            font-size: 14px;
            color: ${({ theme }) => theme.text};
        }
        .message {
            font-size: 13px;
            color: ${({ theme }) => theme.text};
            opacity: 0.8;
        }
    }

    .close-btn {
        background: transparent;
        border: none;
        color: ${({ theme }) => theme.text};
        opacity: 0.5;
        cursor: pointer;
        font-size: 18px;
        transition: 0.2s;
        &:hover { opacity: 1; transform: scale(1.1); }
    }
`;
