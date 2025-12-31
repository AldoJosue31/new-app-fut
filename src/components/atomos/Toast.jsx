import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { v } from '../../styles/variables';
import { RiErrorWarningLine, RiCheckboxCircleLine, RiCloseLine } from "react-icons/ri";

export function Toast({ show, message, type = 'error', onClose, duration = 3000 }) {
    // 1. Agregamos un estado para saber si el Toast ha sido activado alguna vez
    const [hasBeenShown, setHasBeenShown] = useState(false);

    useEffect(() => {
        // Si show se vuelve true, marcamos que ya ha sido mostrado
        if (show) {
            setHasBeenShown(true);
        }

        if (show && duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    return (
        // 2. Pasamos la nueva prop $hasBeenShown al componente estilizado
        <ToastContainer $show={show} $type={type} $hasBeenShown={hasBeenShown}>
            <div className="icon-box">
                {type === 'error' ? <RiErrorWarningLine /> : <RiCheckboxCircleLine />}
            </div>
            <div className="content">
                <span className="title">{type === 'error' ? 'Error' : 'Éxito'}</span>
                <span className="message">{message}</span>
            </div>
            <button className="close-btn" onClick={onClose}><RiCloseLine /></button>
        </ToastContainer>
    );
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
    position: fixed;
    top: 30px;
    right: 30px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    padding: 16px;
    border-radius: 12px;
    background: ${({ theme }) => theme.bgtotal};
    border: 1px solid ${({ theme }) => theme.bg4};
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    border-left: 5px solid ${({ $type }) => $type === 'error' ? v.colorError : v.colorExito};
    backdrop-filter: blur(10px);
    
    /* 3. Lógica de animación corregida */
    animation: ${({ $show, $hasBeenShown }) => {
        // Si está activo, entra
        if ($show) return css`${slideIn} 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`;
        
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