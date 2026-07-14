import React, { useEffect, useState } from "react";
import styled from "styled-components";
import QRCode from "react-qr-code";
import {
  BiCopy,
  BiEnvelope,
  BiLink,
  BiRefresh,
  BiShieldQuarter,
  BiTrash,
  BiUser,
} from "react-icons/bi";
import { BtnNormal } from "../../moleculas/BtnNormal";
import { Btnsave } from "../../moleculas/Btnsave";
import { InputText2 } from "../formularios/InputText2";
import { Modal } from "../Modal";
import { Toast } from "../../atomos/Toast";
import {
  createDelegateInvitation,
  getActiveDelegateInvitation,
  revokeDelegateInvitation,
} from "../../../services/delegates";
import { v } from "../../../styles/variables";

export function DelegateInviteModal({ isOpen, onClose, team }) {
  const [loading, setLoading] = useState(false);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const [activeInvitation, setActiveInvitation] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [form, setForm] = useState({
    invitedName: "",
    invitedEmail: "",
  });

  const invitationUrl = activeInvitation?.token
    ? `${window.location.origin}/delegate/invitation/${activeInvitation.token}`
    : "";

  useEffect(() => {
    if (!isOpen || !team?.id) return undefined;

    let ignore = false;

    const loadInvitation = async () => {
      setLoadingInvitation(true);

      try {
        const currentInvitation = await getActiveDelegateInvitation(team.id);
        if (ignore) return;

        setActiveInvitation(currentInvitation);
        setForm({
          invitedName: currentInvitation?.invited_name || team.delegate_name || "",
          invitedEmail: currentInvitation?.invited_email || "",
        });
      } catch (error) {
        if (!ignore) {
          setToast({
            show: true,
            message: error.message || "No se pudo cargar la invitación activa.",
            type: "error",
          });
        }
      } finally {
        if (!ignore) {
          setLoadingInvitation(false);
        }
      }
    };

    loadInvitation();

    return () => {
      ignore = true;
    };
  }, [isOpen, team]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleGenerateInvitation = async () => {
    if (!team?.id) return;

    setLoading(true);
    try {
      const response = await createDelegateInvitation({
        teamId: team.id,
        invitedName: form.invitedName,
        invitedEmail: form.invitedEmail,
      });

      setActiveInvitation({
        id: response.invitation_id,
        team_id: team.id,
        token: response.token,
        invited_name: form.invitedName || null,
        invited_email: form.invitedEmail || null,
        expires_at: response.expires_at,
      });

      setToast({
        show: true,
        message: "Invitación creada. El enlace anterior, si existía, quedó revocado.",
        type: "success",
      });
    } catch (error) {
      setToast({
        show: true,
        message: error.message || "No se pudo crear la invitación.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvitation = async () => {
    if (!activeInvitation?.id) return;

    setLoading(true);
    try {
      await revokeDelegateInvitation(activeInvitation.id);
      setActiveInvitation(null);
      setToast({
        show: true,
        message: "Invitación revocada.",
        type: "success",
      });
    } catch (error) {
      setToast({
        show: true,
        message: error.message || "No se pudo revocar la invitación.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!invitationUrl) return;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      setToast({ show: true, message: "Enlace copiado.", type: "success" });
    } catch {
      setToast({ show: true, message: "No se pudo copiar el enlace.", type: "error" });
    }
  };

  return (
    <>
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((current) => ({ ...current, show: false }))}
      />

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={team ? `Invitar delegado: ${team.name}` : "Invitar delegado"}
        width="680px"
      >
        <Container>
          <HeroCard>
            <div className="title-row">
              <BiShieldQuarter />
              <div>
                <strong>Acceso para delegado</strong>
                <p>Comparte un link o QR para que el responsable del equipo cree su cuenta.</p>
              </div>
            </div>
            <small>
              Al generar una nueva invitación, la anterior deja de funcionar automáticamente.
            </small>
          </HeroCard>

          <FormCard>
            <FieldGroup>
              <label htmlFor="delegate-invite-name">Nombre sugerido del delegado</label>
              <InputText2>
                <input
                  id="delegate-invite-name"
                  className="form__field"
                  name="invitedName"
                  placeholder="Nombre del delegado"
                  value={form.invitedName}
                  onChange={handleChange}
                />
                <BiUser className="field-icon" />
              </InputText2>
            </FieldGroup>

            <FieldGroup>
              <label htmlFor="delegate-invite-email">Correo del delegado</label>
              <InputText2>
                <input
                  id="delegate-invite-email"
                  className="form__field"
                  name="invitedEmail"
                  type="email"
                  placeholder="Correo para el registro"
                  value={form.invitedEmail}
                  onChange={handleChange}
                />
                <BiEnvelope className="field-icon" />
              </InputText2>
            </FieldGroup>

            <ActionsRow>
              <Btnsave
                titulo={loading ? "Generando..." : activeInvitation ? "Regenerar enlace" : "Generar enlace"}
                funcion={handleGenerateInvitation}
                bgcolor={v.colorPrincipal}
                icono={activeInvitation ? <BiRefresh /> : <BiLink />}
                width="100%"
                disabled={loading}
              />
            </ActionsRow>
          </FormCard>

          {loadingInvitation ? (
            <StatusBox>Cargando invitación activa...</StatusBox>
          ) : activeInvitation ? (
            <InvitationBox>
              <div className="top">
                <div>
                  <span className="eyebrow">Invitación activa</span>
                  <h4>Lista para compartir</h4>
                  <p>
                    Expira el{" "}
                    <b>{new Date(activeInvitation.expires_at).toLocaleString()}</b>
                  </p>
                </div>

                <div className="top-actions">
                  <BtnNormal funcion={copyLink} titulo="Copiar enlace" />
                  <IconButton type="button" onClick={handleRevokeInvitation} title="Revocar invitación">
                    <BiTrash />
                  </IconButton>
                </div>
              </div>

              <div className="share-grid">
                <div className="qr-card">
                  <QRCode
                    size={180}
                    value={invitationUrl}
                    bgColor="transparent"
                    fgColor="#0f172a"
                  />
                </div>

                <div className="link-panel">
                  <label htmlFor="delegate-registration-link">Link de registro</label>
                  <div className="copy-row">
                    <input id="delegate-registration-link" readOnly value={invitationUrl} />
                    <button type="button" onClick={copyLink} aria-label="Copiar link de registro">
                      <BiCopy />
                    </button>
                  </div>

                  {(activeInvitation.invited_name || activeInvitation.invited_email) && (
                    <InfoList>
                      {activeInvitation.invited_name && (
                        <span><BiUser /> {activeInvitation.invited_name}</span>
                      )}
                      {activeInvitation.invited_email && (
                        <span><BiEnvelope /> {activeInvitation.invited_email}</span>
                      )}
                    </InfoList>
                  )}
                </div>
              </div>
            </InvitationBox>
          ) : (
            <StatusBox>No hay una invitación activa para este equipo.</StatusBox>
          )}
        </Container>
      </Modal>
    </>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const HeroCard = styled.div`
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(28, 176, 246, 0.16), rgba(28, 176, 246, 0.05));
  border: 1px solid rgba(28, 176, 246, 0.22);

  .title-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  svg {
    flex-shrink: 0;
    font-size: 1.6rem;
    color: ${v.colorPrincipal};
  }

  strong {
    display: block;
    margin-bottom: 4px;
  }

  p,
  small {
    margin: 0;
    opacity: 0.78;
    line-height: 1.45;
  }
`;

const FormCard = styled.div`
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.bgtotal};
  border: 1px solid ${({ theme }) => theme.bg4};
`;

const FieldGroup = styled.div`
  display: grid;
  gap: 6px;

  label {
    font-size: 0.86rem;
    font-weight: 700;
    opacity: 0.85;
  }

  .field-icon {
    position: absolute;
    right: 14px;
    top: 14px;
    opacity: 0.45;
    font-size: 1.1rem;
  }
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 10px;
`;

const StatusBox = styled.div`
  padding: 16px;
  border-radius: 14px;
  text-align: center;
  opacity: 0.75;
  background: ${({ theme }) => theme.bgtotal};
  border: 1px dashed ${({ theme }) => theme.bg4};
`;

const InvitationBox = styled.div`
  display: grid;
  gap: 18px;
  padding: 18px;
  border-radius: 18px;
  background: ${({ theme }) => theme.bgcards};
  border: 1px solid rgba(46, 213, 115, 0.25);

  .top {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .eyebrow {
    display: inline-flex;
    margin-bottom: 4px;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${v.verde};
  }

  h4,
  p {
    margin: 0;
  }

  p {
    opacity: 0.75;
    margin-top: 4px;
  }

  .top-actions {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .share-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 18px;
    align-items: center;
  }

  @media (max-width: 720px) {
    .share-grid {
      grid-template-columns: 1fr;
    }
  }

  .qr-card {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 14px;
    border-radius: 18px;
    background: #ffffff;
  }

  .link-panel {
    display: grid;
    gap: 12px;
  }

  .link-panel label {
    font-size: 0.82rem;
    font-weight: 700;
    opacity: 0.74;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .copy-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
  }

  .copy-row input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.bg4};
    background: ${({ theme }) => theme.bgtotal};
    color: ${({ theme }) => theme.text};
    outline: none;
  }

  .copy-row button {
    border: none;
    border-radius: 12px;
    padding: 0 14px;
    cursor: pointer;
    font-size: 1.1rem;
    background: ${v.colorPrincipal};
    color: #fff;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  .copy-row button:hover {
    transform: translateY(-1px);
    opacity: 0.92;
  }
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  span {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.92rem;
    opacity: 0.82;
  }
`;

const IconButton = styled.button`
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: rgba(231, 76, 60, 0.12);
  color: ${v.rojo};
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background: ${v.rojo};
    color: #fff;
  }
`;
