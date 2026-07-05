import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import {
  BiCheckCircle,
  BiErrorCircle,
  BiPhone,
  BiShieldQuarter,
  BiUser,
} from "react-icons/bi";
import {
  Card,
  Btnsave,
  InputText2,
  Title,
  ToggleTema,
  Modal,
  Toast,
} from "../../index";
import { supabase } from "../../supabase/supabase.config";
import {
  acceptDelegateInvitation,
  getDelegateInvitation,
} from "../../services/delegates";
import { v } from "../../styles/variables";

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

    if (token) {
      validate();
    } else {
      setErrorMsg("Invitacion invalida.");
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
      <FullScreenContainer>
        <Card maxWidth="420px">
          <ErrorState>
            <BiErrorCircle size={52} color={v.rojo} />
            <h3>Enlace invalido</h3>
            <p>{errorMsg}</p>
            <Btnsave titulo="Ir al inicio" funcion={() => navigate("/")} bgcolor={v.rojo} />
          </ErrorState>
        </Card>
      </FullScreenContainer>
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
              className="form__field"
              name="fullName"
              required
              placeholder=" "
              value={form.fullName}
              onChange={handleChange}
            />
            <label className="form__label">Nombre Completo</label>
          </InputText2>

          <InputText2>
            <input
              type="email"
              className="form__field"
              name="email"
              required
              placeholder=" "
              value={form.email}
              onChange={handleChange}
            />
            <label className="form__label">Correo Electronico</label>
          </InputText2>

          <InputText2>
            <input
              type="password"
              className="form__field"
              name="password"
              required
              placeholder=" "
              minLength={6}
              value={form.password}
              onChange={handleChange}
            />
            <label className="form__label">Contrasena</label>
          </InputText2>

          <InputText2>
            <input
              type="tel"
              className="form__field"
              name="contactPhone"
              placeholder=" "
              value={form.contactPhone}
              onChange={handleChange}
            />
            <label className="form__label">Telefono (Opcional)</label>
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

const FullScreenContainer = styled.div`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: ${({ theme }) => theme.bgtotal};
  z-index: 9999;
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
  z-index: 10000;
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

const ErrorState = styled.div`
  text-align: center;
  padding: 20px;
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
