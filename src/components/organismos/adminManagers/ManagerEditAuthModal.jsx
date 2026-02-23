import React, { useState, useEffect } from "react";
import styled, { css } from "styled-components";
import { Modal } from "../Modal";
import { Btnsave } from "../../moleculas/Btnsave";
import { v } from "../../../styles/variables";
import { BiShieldQuarter, BiMailSend, BiLockAlt, BiUserCircle } from "react-icons/bi";

export function ManagerEditAuthModal({ isOpen, onClose, manager, onUpdate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (manager) {
      setEmail(manager.email || "");
      setPassword(""); 
      setFocusedField(null);
    }
  }, [manager, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email && !password) return;

    setLoading(true);
    const success = await onUpdate(manager.id, email, password);
    setLoading(false);
    
    if (success) {
      setPassword("");
      onClose();
    }
  };

  const handleFocus = (field) => setFocusedField(field);
  const handleBlur = () => setFocusedField(null);

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Credenciales de Acceso" 
      closeOnOverlayClick={false}
    >
      <Form onSubmit={handleSubmit}>
        
        <HeaderInfo>
            <AvatarFallback>
                {manager?.full_name?.charAt(0).toUpperCase() || <BiUserCircle size={24}/>}
            </AvatarFallback>
            <div className="details">
                <h4>{manager?.full_name || "Usuario Desconocido"}</h4>
                <span className="role-badge">Manager</span>
            </div>
        </HeaderInfo>

        <WarningBox>
          <BiShieldQuarter size={24} />
          <p>
            Estás modificando las credenciales de <b>Supabase Auth</b>. El usuario deberá usar estos nuevos datos para iniciar sesión.
          </p>
        </WarningBox>
        
        {/* --- INPUT CORREO --- */}
        <FloatingInputContainer 
            $isFocused={focusedField === 'email'} 
            $hasValue={email.length > 0}
        >
            <IconWrapper $isFocused={focusedField === 'email'}>
                <BiMailSend size={20} />
            </IconWrapper>
            <StyledInput
              id="email-field"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => handleFocus('email')}
              onBlur={handleBlur}
              required
            />
            <FloatingLabel htmlFor="email-field">Correo Electrónico</FloatingLabel>
        </FloatingInputContainer>

        {/* --- INPUT CONTRASEÑA --- */}
        <FloatingInputContainer 
            $isFocused={focusedField === 'password'} 
            $hasValue={password.length > 0}
        >
            <IconWrapper $isFocused={focusedField === 'password'}>
                <BiLockAlt size={20} />
            </IconWrapper>
            <StyledInput
              id="password-field"
              type="text" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => handleFocus('password')}
              onBlur={handleBlur}
              autoComplete="new-password"
            />
            <FloatingLabel htmlFor="password-field">Nueva Contraseña (Opcional)</FloatingLabel>
        </FloatingInputContainer>

        <Actions>
          <CancelButton type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </CancelButton>
          <Btnsave 
            titulo={loading ? "Guardando..." : "Actualizar Accesos"} 
            tipo="submit" 
            bgcolor={v.colorPrincipal}
            icono={<BiShieldQuarter/>}
            disabled={loading || (!email && !password)} 
          />
        </Actions>
      </Form>
    </Modal>
  );
}

// --- STYLED COMPONENTS ---

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px; 
  width: 100%;
  min-width: 360px;
  padding: 10px 0;
`;

const HeaderInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding-bottom: 20px;
    border-bottom: 1px solid ${({ theme }) => theme.bg4};
    margin-bottom: 5px;

    .details {
        display: flex;
        flex-direction: column;
        gap: 4px;
        
        h4 {
            margin: 0;
            color: ${({ theme }) => theme.text};
            font-size: 1.1rem;
            font-weight: 600;
        }
        
        .role-badge {
            font-size: 0.75rem;
            color: ${v.colorPrincipal};
            background: ${v.colorPrincipal}15;
            padding: 2px 8px;
            border-radius: 12px;
            align-self: flex-start;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
    }
`;

const AvatarFallback = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 12px; 
    background: linear-gradient(135deg, ${v.colorPrincipal}30, ${v.colorPrincipal}10);
    color: ${v.colorPrincipal};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
`;

const WarningBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background-color: rgba(255, 153, 0, 0.08); 
  border-left: 4px solid #ff9900;
  padding: 16px;
  border-radius: 8px;
  color: ${({ theme }) => theme.text};
  
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    opacity: 0.9;
    b { color: #ff9900; }
  }
  
  svg {
    color: #ff9900;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

// --- ESTILOS PARA INPUTS MODERNOS CORREGIDOS ---

const FloatingInputContainer = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    background-color: ${({ theme }) => theme.bg3};
    border: 2px solid transparent;
    border-radius: 12px;
    transition: all 0.3s ease;
    padding: 0 16px;
    height: 60px; /* 1. Aumentamos la altura del contenedor */

    /* Estado Foco: Ilumina el borde */
    ${({ $isFocused, theme }) => $isFocused && css`
        border-color: ${v.colorPrincipal};
        background-color: ${theme.bg2};
        box-shadow: 0 4px 12px ${v.colorPrincipal}15;
    `}

    /* Estado Foco O Con Valor: Sube la etiqueta */
    ${({ $isFocused, $hasValue, theme }) => ($isFocused || $hasValue) && css`
        & > label {
            /* 2. Subimos la etiqueta mucho más arriba (-22px) */
            transform: translateY(-22px) scale(0.75);
            /* Solo pinta de color principal si está enfocado, si no, se queda gris/texto */
            color: ${$isFocused ? v.colorPrincipal : theme.text};
            opacity: ${$isFocused ? 1 : 0.6};
            font-weight: ${$isFocused ? 700 : 500};
        }
    `}

    &:hover {
        border-color: ${({ $isFocused, theme }) => !$isFocused ? theme.bg4 : v.colorPrincipal};
    }
`;

const IconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ $isFocused, theme }) => $isFocused ? v.colorPrincipal : theme.text};
    opacity: ${({ $isFocused }) => $isFocused ? 1 : 0.5};
    transition: all 0.3s ease;
    margin-right: 12px;
    width: 24px;
`;

const StyledInput = styled.input`
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: ${({ theme }) => theme.text};
    font-size: 15px;
    font-weight: 500;
    /* 3. Empujamos el texto escrito hacia abajo para que no choque (padding-top: 24px) */
    padding: 24px 0 6px 0; 
    width: 100%;
    height: 100%;
    z-index: 2; 

    &:-webkit-autofill,
    &:-webkit-autofill:hover, 
    &:-webkit-autofill:focus {
        -webkit-text-fill-color: ${({ theme }) => theme.text};
        -webkit-box-shadow: 0 0 0px 1000px ${({ theme }) => theme.bg3} inset;
        transition: background-color 5000s ease-in-out 0s;
    }
`;

const FloatingLabel = styled.label`
    position: absolute;
    left: 52px; /* Margen del icono */
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.text};
    opacity: 0.6;
    font-size: 15px;
    pointer-events: none; 
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s, opacity 0.2s;
    transform-origin: left top;
    z-index: 3; /* 4. Aseguramos que la etiqueta quede por encima de todo */
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.bg4};
`;

const CancelButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.text};
  opacity: 0.7;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 1;
    background-color: ${({ theme }) => theme.bg3};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;