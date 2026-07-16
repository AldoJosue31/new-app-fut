import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import {
  BiCalendarX,
  BiCheckShield,
  BiCheckCircle,
  BiErrorCircle,
  BiLinkAlt,
  BiLogIn,
  BiPhone,
  BiShieldQuarter,
  BiTimeFive,
  BiUser,
  BiXCircle,
} from "react-icons/bi";
import { Card } from "../moleculas/Card";
import { Btnsave } from "../moleculas/Btnsave";
import { InputText2 } from "../organismos/formularios/InputText2";
import { Title } from "../atomos/Title";
import { ToggleTema } from "../organismos/ToggleTema";
import { Modal } from "../organismos/Modal";
import { Toast } from "../atomos/Toast";
import { supabase } from "../../supabase/supabase.config";
import {
  acceptDelegateInvitation,
  getDelegateInvitation,
} from "../../services/delegates";
import { v } from "../../styles/variables";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function RegisterDelegateTemplate({ token }) {
  const navigate = useNavigate();
  const [invitationData, setInvitationData] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [toast, setToast] = useState({ show: false, message: "", type: "error" });
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    contactPhone: "",
  });

  useEffect(() => {
    let ignore = false;

    const validate = async () => {
      try {
        const invitation = await getDelegateInvitation(token);
        if (ignore) return;

        setInvitationData(invitation);
        setForm((current) => ({
          ...current,
          fullName: invitation.invited_name || current.fullName,
          email: invitation.invited_email || current.email,
          contactPhone: invitation.invited_phone || current.contactPhone,
        }));
      } catch (error) {
        if (!ignore) {
          setErrorMsg(error.message);
        }
      } finally {
        if (!ignore) {
          setIsValidating(false);
        }
      }
    };

    if (token && UUID_PATTERN.test(token)) {
      validate();
    } else {
      setErrorMsg(
        "El enlace esta incompleto o fue copiado incorrectamente. Solicita al manager que te comparta la invitacion nuevamente.",
      );
      setIsValidating(false);
    }

    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    let timer;

    if (showSuccessModal && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((current) => current - 1);
      }, 1000);
    } else if (showSuccessModal && countdown === 0) {
      (async () => {
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
      })();
    }

    return () => clearTimeout(timer);
  }, [countdown, navigate, showSuccessModal]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setIsRegistering(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData?.user?.id) {
        throw new Error("No se pudo crear la cuenta del delegado.");
      }

      if (!authData.session) {
        throw new Error(
          "Confirma tu correo e inicia sesion para activar la invitacion."
        );
      }

      await acceptDelegateInvitation(token, authData.user.id, form.contactPhone);
      setShowSuccessModal(true);
    } catch (error) {
      let message = error.message;

      if (
        message === "User already registered" ||
        message?.includes("User already registered")
      ) {
        message =
          "Ese correo ya existe. Inicia sesion con esa cuenta y luego pide al manager que te asigne manualmente o use otro correo.";
      }

      setToast({ show: true, message, type: "error" });
    } finally {
      setIsRegistering(false);
    }
  };

  if (isValidating) {
    return (
      <FullScreenContainer>
        <p>Validando invitacion...</p>
      </FullScreenContainer>
    );
  }

  if (errorMsg) {
    return (
      <InvitationStatusView
        status="invalid"
        message={errorMsg}
        onLogin={() => navigate("/login")}
      />
    );
  }

  if (invitationData?.status && invitationData.status !== "active") {
    return (
      <InvitationStatusView
        status={invitationData.status}
        invitation={invitationData}
        onLogin={() => navigate("/login")}
      />
    );
  }

  return (
    <FullScreenContainer>
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <ThemeButtonWrapper>
        <ToggleTema />
      </ThemeButtonWrapper>

      <Card maxWidth="520px">
        <Header>
          <Title>Registro de Delegado</Title>
          <p className="sub">Crea tu acceso para administrar tu equipo desde la app.</p>
        </Header>

        <InvitationInfo>
          <div className="line">
            <BiShieldQuarter /> Liga: <b>{invitationData.league_name}</b>
          </div>
          <div className="line">
            <BiUser /> Equipo: <b>{invitationData.team_name}</b>
          </div>
          {invitationData.invited_phone && (
            <div className="line">
              <BiPhone /> Telefono sugerido: <b>{invitationData.invited_phone}</b>
            </div>
          )}
        </InvitationInfo>

        <Form onSubmit={handleRegister}>
          <InputText2>
            <input
              id="delegate-register-name"
              className="form__field"
              name="fullName"
              required
              placeholder=" "
              value={form.fullName}
              onChange={handleChange}
            />
            <label className="form__label" htmlFor="delegate-register-name">Nombre Completo</label>
          </InputText2>

          <InputText2>
            <input
              id="delegate-register-email"
              type="email"
              className="form__field"
              name="email"
              required
              placeholder=" "
              value={form.email}
              onChange={handleChange}
            />
            <label className="form__label" htmlFor="delegate-register-email">Correo Electronico</label>
          </InputText2>

          <InputText2>
            <input
              id="delegate-register-password"
              type="password"
              className="form__field"
              name="password"
              required
              placeholder=" "
              minLength={6}
              value={form.password}
              onChange={handleChange}
            />
            <label className="form__label" htmlFor="delegate-register-password">Contrasena</label>
          </InputText2>

          <InputText2>
            <input
              id="delegate-register-phone"
              type="tel"
              className="form__field"
              name="contactPhone"
              placeholder=" "
              value={form.contactPhone}
              onChange={handleChange}
            />
            <label className="form__label" htmlFor="delegate-register-phone">Telefono (Opcional)</label>
          </InputText2>

          <HintText>
            Tu cuenta quedara ligada a <b>{invitationData.team_name}</b> para cargar
            jugadores, actualizar datos del equipo y consultar su actividad.
          </HintText>

          <Btnsave
            titulo={isRegistering ? "Creando..." : "Crear cuenta de delegado"}
            bgcolor={v.colorPrincipal}
            icono={<BiCheckCircle />}
            width="100%"
            disabled={isRegistering}
          />
        </Form>
      </Card>

      <Modal
        isOpen={showSuccessModal}
        onClose={null}
        closeOnOverlayClick={false}
        title="Cuenta creada"
      >
        <SuccessContent>
          <div className="icon-success">
            <BiCheckCircle />
          </div>
          <h3>Delegado activado</h3>
          <p>Tu acceso ya quedo listo para entrar a la app.</p>

          <div className="countdown-container">
            <span className="text">Redirigiendo al login en</span>
            <span className="number">{countdown}</span>
            <span className="text">segundos...</span>
          </div>
        </SuccessContent>
      </Modal>
    </FullScreenContainer>
  );
}

function InvitationStatusView({ status, invitation, message, onLogin }) {
  const teamName = invitation?.team_name;
  const leagueName = invitation?.league_name;
  const formatDateTime = (value) =>
    value
      ? new Date(value).toLocaleString("es-MX", {
          dateStyle: "long",
          timeStyle: "short",
        })
      : null;

  const stateContent = {
    used: {
      tone: "success",
      Icon: BiCheckShield,
      title: "Este enlace ya fue utilizado",
      description: (
        <>
          La cuenta del delegado ya fue creada con esta invitación. Por seguridad,
          cada enlace funciona una sola vez.
        </>
      ),
      dateLabel: "Registro completado",
      dateValue: formatDateTime(invitation?.used_at),
    },
    expired: {
      tone: "warning",
      Icon: BiCalendarX,
      title: "El tiempo para registrarse terminó",
      description: (
        <>
          El plazo definido por el manager termino y el enlace se desactivo
          automáticamente para proteger el acceso. Solicita una invitación nueva
          para completar el registro.
        </>
      ),
      dateLabel: "La invitación venció",
      dateValue: formatDateTime(invitation?.expires_at),
    },
    revoked: {
      tone: "danger",
      Icon: BiXCircle,
      title: "Esta invitación fue cancelada",
      description: (
        <>
          El manager desactivo este enlace antes de que fuera utilizado. Solicita una
          invitación nueva para continuar con el registro.
        </>
      ),
      dateLabel: "Invitación cancelada",
      dateValue: formatDateTime(invitation?.revoked_at),
    },
    invalid: {
      tone: "danger",
      Icon: BiLinkAlt,
      title: "No encontramos esta invitación",
      description: message,
    },
  }[status] || {
    tone: "danger",
    Icon: BiErrorCircle,
    title: "No se pudo abrir la invitación",
    description: message || "Solicita al manager que te comparta un enlace nuevo.",
  };

  const { Icon } = stateContent;

  return (
    <FullScreenContainer>
      <ThemeButtonWrapper>
        <ToggleTema />
      </ThemeButtonWrapper>

      <StatusCard maxWidth="520px">
        <InvitationState>
          <StateIcon aria-hidden="true" $tone={stateContent.tone}>
            <Icon />
          </StateIcon>

          <StateCopy>
            <h1>{stateContent.title}</h1>
            <p>{stateContent.description}</p>
          </StateCopy>

          {(teamName || stateContent.dateValue) && (
            <StateDetails>
              {teamName && (
                <StateDetailRow>
                  <BiUser aria-hidden="true" />
                  <span>
                    <small>Equipo</small>
                    <strong>{teamName}</strong>
                    {leagueName && <em>{leagueName}</em>}
                  </span>
                </StateDetailRow>
              )}

              {stateContent.dateValue && (
                <StateDetailRow>
                  <BiTimeFive aria-hidden="true" />
                  <span>
                    <small>{stateContent.dateLabel}</small>
                    <strong>{stateContent.dateValue}</strong>
                  </span>
                </StateDetailRow>
              )}
            </StateDetails>
          )}

          <StateButton type="button" onClick={onLogin}>
            <BiLogIn />
            Iniciar sesión
          </StateButton>
        </InvitationState>
      </StatusCard>
    </FullScreenContainer>
  );
}

const FullScreenContainer = styled.div`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  box-sizing: border-box;
  background: ${({ theme }) => theme.bgtotal};
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  overflow-y: auto;
`;

const ThemeButtonWrapper = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1010;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 20px;

  .sub {
    opacity: 0.7;
    font-size: 0.92rem;
  }
`;

const InvitationInfo = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
  margin-bottom: 18px;
  border-radius: 12px;
  background: rgba(28, 176, 246, 0.08);
  border: 1px dashed rgba(28, 176, 246, 0.45);

  .line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const HintText = styled.p`
  margin: 4px 0 8px 0;
  font-size: 0.86rem;
  line-height: 1.45;
  opacity: 0.78;
`;

const getStateColor = (tone) => {
  if (tone === "success") return v.verde;
  if (tone === "warning") return "#d97706";
  return v.rojo;
};

const StatusCard = styled(Card)`
  box-sizing: border-box;
  padding: 34px;

  @media (max-width: 520px) {
    padding: 26px 22px;
  }
`;

const InvitationState = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 4px 0 0;
  color: ${({ theme }) => theme.text};
  animation: invitation-state-in 220ms cubic-bezier(0.25, 1, 0.5, 1) both;

  @keyframes invitation-state-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const StateIcon = styled.div`
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: ${({ $tone }) => `${getStateColor($tone)}1f`};
  color: ${({ $tone }) => getStateColor($tone)};

  svg {
    font-size: 2.3rem;
  }
`;

const StateCopy = styled.div`
  display: grid;
  gap: 10px;
  max-width: 66ch;
  text-align: center;

  h1 {
    margin: 0;
    color: ${({ theme }) => theme.text};
    font-size: 1.5rem;
    line-height: 1.25;
    text-wrap: balance;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.text};
    font-size: 0.95rem;
    line-height: 1.6;
    text-wrap: pretty;
  }
`;

const StateDetails = styled.div`
  display: grid;
  width: 100%;
  box-sizing: border-box;
  border-top: 1px solid ${({ theme }) => theme.bg4};
  border-bottom: 1px solid ${({ theme }) => theme.bg4};
  color: ${({ theme }) => theme.text};
`;

const StateDetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px 4px;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.bg4};
  }

  > svg {
    flex: 0 0 auto;
    color: ${v.colorPrincipal};
    font-size: 1.35rem;
  }

  > span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  small {
    font-size: 0.875rem;
    opacity: 0.72;
  }

  strong {
    font-size: 0.95rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  em {
    color: ${v.colorPrincipal};
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 700;
  }
`;

const StateButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid ${v.colorPrincipal};
  border-radius: 12px;
  background: ${v.colorPrincipal};
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  transition: transform 180ms cubic-bezier(0.25, 1, 0.5, 1),
    background 180ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: #159bd8;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    background: #128bc2;
  }

  &:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 2px;
  }

  svg {
    font-size: 1.1rem;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const SuccessContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
  padding: 20px 10px;

  .icon-success {
    font-size: 5rem;
    color: ${v.verde};
  }

  h3 {
    margin: 0;
    color: ${({ theme }) => theme.text};
    font-size: 1.35rem;
  }

  p {
    margin: 0;
    opacity: 0.82;
    color: ${({ theme }) => theme.text};
  }

  .countdown-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: ${({ theme }) => theme.bgtotal};
    padding: 15px 30px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.bg4};
  }

  .text {
    font-size: 0.9rem;
    opacity: 0.72;
  }

  .number {
    font-size: 2.5rem;
    font-weight: 800;
    color: ${v.colorPrincipal};
    line-height: 1;
    margin: 5px 0;
  }
`;
