import React, { useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Btnsave, InputText2, Title, Footer } from '../../index';
import { v } from "../../styles/variables";
import { Device } from "../../styles/breakpoints";
import { useAuthStore } from "../../store/AuthStore";
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabase.config';

export function LoginTemplate() {
    const navigate = useNavigate();
    // Traemos loginGoogle y el estado de carga del Store
    const { loginWithEmail, loginGoogle, authLoadingAction } = useAuthStore();
    const emailRef = useRef(null);
    const passRef = useRef(null);

    useEffect(() => {
        if (emailRef.current) emailRef.current.focus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const email = emailRef.current?.value?.trim();
        const password = passRef.current?.value;
        if (!email || !password) return alert('Ingresa correo y contraseña');
        
        try {
            await loginWithEmail(email, password);
            // La redirección la maneja el AuthContext/App.jsx al detectar el usuario
            // pero podemos forzar la navegación si el contexto tarda un poco
            navigate('/dashboard', { replace: true });
        } catch (err) {
            alert(err.message || 'Error al iniciar sesión');
        }
    };

    return (
        <Container>
            <BackgroundLayer />
            <Card>
                <ContentLogo>
                    <img src="/logo_app.png" alt="Logo" />
                    <div className="logoText">
                        <span className="line1">Bracket</span>
                        <span className="line2">App</span>
                    </div>
                </ContentLogo>

                <Title $paddingbottom="20px">Ingresar</Title>

                <Form onSubmit={handleSubmit}>
                    <InputWrapper>
                        <InputText2>
                            <input
                                ref={emailRef}
                                className="form__field"
                                placeholder="Correo electrónico"
                                type="text"
                                aria-label="Correo electrónico"
                            />
                        </InputText2>
                    </InputWrapper>

                    <InputWrapper>
                        <InputText2>
                            <input ref={passRef} className="form__field" placeholder="Contraseña" type="password" />
                        </InputText2>
                    </InputWrapper>

                    <div className="actions">
                        <Btnsave
                            tipo="primary"
                            titulo={authLoadingAction ? "Cargando..." : "Ingresar"}
                            bgcolor="#1CB0F6"
                            color="255, 255, 255"
                            width="100%"
                            disabled={authLoadingAction}
                        />
                    </div>
                </Form>

                <Divider aria-hidden="true">
                    <span>o</span>
                </Divider>

                <GoogleWrap>
                    {/* Botón conectado a la función loginGoogle del store */}
                    <Btnsave
                        funcion={loginGoogle}
                        titulo="Continuar con Google"
                        icono={<v.iconogoogle />}
                        disabled={authLoadingAction}
                    />
                </GoogleWrap>

                <Footer style={{ marginTop: 16 }} />
            </Card>
        </Container>
    );
}

export default LoginTemplate;

/* ---------------------- Styled components ---------------------- */

/* Animaciones */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const floatY = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
  100% { transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(.98); }
  to { opacity: 1; transform: scale(1); }
`;

/* Respecto a usuarios con preferencia de menos movimiento */
const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

const Container = styled.div`
  min-height: 100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 24px;
  position: relative;
  color: ${({ theme }) => theme.text};
  overflow: hidden;
`;

/* Capa de fondo con degradado y viñeta */
const BackgroundLayer = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(800px 400px at 10% 10%, rgba(28,176,246,0.06), transparent 5%),
              linear-gradient(135deg, rgba(28,176,246,0.06), rgba(88,86,214,0.02));
  z-index: 0;
  pointer-events: none;
`;

/* Card principal centrado */
const Card = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  margin: 20px;
  padding: 28px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  backdrop-filter: blur(8px);
  background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.64));
  box-shadow: 0 10px 30px rgba(10, 10, 25, 0.12);
  transform-origin: center;
  animation: ${fadeUp} 420ms ease-out, ${scaleIn} 380ms ease-out;
  ${reducedMotion}

  @media ${Device.tablet} {
    padding: 36px;
  }
`;

/* Logo y texto */
const ContentLogo = styled.section`
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  margin-bottom: 6px;
  gap: 12px;

  img {
    width: 96px;
    height: 96px;
    object-fit: contain;
    filter: drop-shadow(0 4px 16px rgba(16,20,40,0.06));
    transform-origin: center;
    animation: ${floatY} 3.6s ease-in-out infinite;
    ${reducedMotion}
  }

  .logoText {
    display:flex;
    flex-direction: column;
    align-items:center;
    gap: 2px;
  }

  .logoText .line1 {
    font-size: 20px;
    font-weight: 800;
    color: ${({ theme }) => theme.text};
    line-height: 1;
    letter-spacing: -0.4px;
  }

  .logoText .line2 {
    font-size: 14px;
    font-weight: 600;
    color: ${({ theme }) => theme.text};
    opacity: 0.85;
    transform: translateY(-1px);
  }
`;

/* Form wrapper */
const Form = styled.form`
  display:flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 6px;
`;

/* Input wrapper para estilo de focus/underline */
const InputWrapper = styled.div`
  .form__field {
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(20,20,30,0.06);
    background: rgba(255,255,255,0.6);
    box-shadow: 0 1px 0 rgba(16,20,40,0.02) inset;
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    font-size: 14px;
    outline: none;
    color: ${({ theme }) => theme.text};
    -webkit-appearance: none;
    appearance: none;
  }

  /* Placeholder más tenue */
  .form__field::placeholder {
    color: rgba(30,30,40,0.45);
  }

  /* Focus */
  .form__field:focus {
    transform: translateY(-2px);
    border-color: rgba(28,176,246,0.9);
    box-shadow: 0 6px 18px rgba(28,176,246,0.12);
  }

  ${reducedMotion}
`;

/* Divider "o" */
const Divider = styled.div`
  display:flex;
  align-items:center;
  gap: 12px;
  margin: 8px 0;
  color: rgba(20,20,30,0.55);
  font-size: 13px;
  width: 100%;

  &::before, &::after {
    content: "";
    height: 1px;
    flex: 1;
    background: linear-gradient(90deg, rgba(20,20,30,0.08), rgba(20,20,30,0.02));
    border-radius: 2px;
    transform-origin: center;
  }

  span {
    padding: 6px 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.6);
    box-shadow: 0 1px 0 rgba(16,20,40,0.02);
    font-weight: 600;
    color: rgba(20,20,30,0.6);
    font-size: 12px;
  }
`;

/* Google wrap: añade micro-interacción al hijo Btnsave */
const GoogleWrap = styled.div`
  display:flex;
  justify-content: center;
  margin-top: 6px;

  button, /* si Btnsave renderiza button */
  .btn {
    width: 100%;
    max-width: 100%;
    transition: transform .14s ease, box-shadow .14s ease;
    border-radius: 10px;
  }

  button:hover,
  .btn:hover {
    transform: translateY(-3px) scale(1.01);
    box-shadow: 0 8px 20px rgba(24,24,40,0.08);
  }

  ${reducedMotion}
`;
