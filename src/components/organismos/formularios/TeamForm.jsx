import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import QRCode from "react-qr-code";
import {
  BiArrowBack,
  BiBadgeCheck,
  BiChevronRight,
  BiCopy,
  BiEnvelope,
  BiLink,
  BiLockAlt,
  BiPhone,
  BiQr,
  BiRefresh,
  BiTrash,
  BiUnlink,
  BiUser,
} from "react-icons/bi";
import { PhotoUploader } from "../../moleculas/PhotoUploader";
import { InputText2 } from "./InputText2";
import { Btnsave } from "../../moleculas/Btnsave";
import { v } from "../../../styles/variables";
import {
  createDelegateInvitation,
  getActiveDelegateInvitation,
  getLinkedDelegateProfileService,
  revokeDelegateInvitation,
  unlinkTeamDelegateService,
  updateLinkedDelegateProfileService,
} from "../../../services/delegates";
import { FIELD_LIMITS, validateOptionalEmail } from "../../../utils/entityValidation";
import { maxLengthFeedback } from "../../../utils/maxLengthFeedback";

const TEAM_FORM_PANEL = "form";
const TEAM_INVITE_PANEL = "invite";
const TEAM_DELEGATE_PANEL = "delegate";

const EMPTY_DELEGATE_PROFILE_FORM = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
};

export function TeamForm({
  form,
  onFormChange,
  onSave,
  isUploading,
  preview,
  originalFile,
  onFileChange,
  onClearImage,
  showToast,
  teamToEdit,
  allowStatusEdit = true,
  canManageDelegateLink = true,
  teamId = null,
  linkedDelegateAssignment = null,
  onDelegateLinkStateChanged,
  onInvitePanelChange,
  saveLabel = "Guardar Equipo",
}) {
  const containerRef = useRef(null);
  const colorTextRef = useRef(null);
  const colorInputRef = useRef(null);
  const hasLoadedInvitationRef = useRef(false);
  const [activePanel, setActivePanel] = useState(TEAM_FORM_PANEL);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeInvitation, setActiveInvitation] = useState(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const [inviteActionLoading, setInviteActionLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [delegateProfileForm, setDelegateProfileForm] = useState(
    EMPTY_DELEGATE_PROFILE_FORM,
  );
  const [loadingDelegateProfile, setLoadingDelegateProfile] = useState(false);
  const [savingDelegateProfile, setSavingDelegateProfile] = useState(false);

  const isLinkedDelegate = Boolean(linkedDelegateAssignment?.delegate_profile_id);
  const delegateDisplayName = (form.delegate_name || "").trim();
  const delegateInputDisplay = isLinkedDelegate
    ? delegateDisplayName || "Delegado vinculado"
    : delegateDisplayName;
  const invitationUrl = activeInvitation?.token
    ? `${window.location.origin}/delegate/invitation/${activeInvitation.token}`
    : "";

  useEffect(() => {
    const color = form.color || "#000000";
    if (containerRef.current) {
      containerRef.current.style.setProperty("--team-color", color);
    }
    if (colorTextRef.current) {
      colorTextRef.current.innerText = color;
    }
    if (colorInputRef.current) {
      colorInputRef.current.value = color;
    }
  }, [form.color]);

  useEffect(() => {
    setActivePanel(TEAM_FORM_PANEL);
    setShowUnlinkConfirm(false);
    setActiveInvitation(null);
    setInviteName("");
    setInviteEmail("");
    setDelegateProfileForm(EMPTY_DELEGATE_PROFILE_FORM);
    hasLoadedInvitationRef.current = false;
  }, [teamId]);

  useEffect(() => {
    if (
      !canManageDelegateLink ||
      activePanel !== TEAM_INVITE_PANEL ||
      !teamId ||
      isLinkedDelegate ||
      hasLoadedInvitationRef.current
    ) {
      return undefined;
    }

    let ignore = false;
    hasLoadedInvitationRef.current = true;

    const loadInvitation = async () => {
      setLoadingInvitation(true);

      try {
        const invitation = await getActiveDelegateInvitation(teamId);
        if (ignore) return;

        setActiveInvitation(invitation);
        setInviteEmail(invitation?.invited_email || "");
      } catch (error) {
        if (!ignore) {
          showToast?.(
            error.message || "No se pudo cargar la invitacion activa.",
            "error"
          );
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
  }, [activePanel, canManageDelegateLink, isLinkedDelegate, showToast, teamId]);

  const handleColorInput = (event) => {
    const value = event.target.value;
    if (containerRef.current) {
      containerRef.current.style.setProperty("--team-color", value);
    }
    if (colorTextRef.current) {
      colorTextRef.current.innerText = value;
    }
  };

  const handleColorChange = (event) => {
    onFormChange(event);
  };

  const handleInviteEmailChange = (event) => {
    setInviteEmail(event.target.value);
  };

  const handleInviteNameChange = (event) => {
    setInviteName(event.target.value);
  };

  const handleDelegateProfileChange = (event) => {
    const { name, value } = event.target;
    setDelegateProfileForm((current) => ({ ...current, [name]: value }));
  };

  const openInvitePanel = (event) => {
    event.preventDefault();
    setActivePanel(TEAM_INVITE_PANEL);
    setShowUnlinkConfirm(false);
    onInvitePanelChange?.(true);
  };

  const openDelegateProfilePanel = async (event) => {
    event.preventDefault();

    if (!canManageDelegateLink || !teamId || !isLinkedDelegate) return;

    setActivePanel(TEAM_DELEGATE_PANEL);
    setShowUnlinkConfirm(false);
    setDelegateProfileForm({
      fullName: delegateDisplayName,
      email: "",
      password: "",
      phone: form.contact_phone || "",
    });
    setLoadingDelegateProfile(true);
    onInvitePanelChange?.(true);

    try {
      const response = await getLinkedDelegateProfileService(teamId);
      const delegate = response?.delegate || {};

      setDelegateProfileForm({
        fullName: delegate.fullName || delegateDisplayName,
        email: delegate.email || "",
        password: "",
        phone: delegate.phone || "",
      });
    } catch (error) {
      showToast?.(
        error.message || "No se pudo cargar la informacion del delegado.",
        "error",
      );
    } finally {
      setLoadingDelegateProfile(false);
    }
  };

  const goBackToForm = (event) => {
    event.preventDefault();
    setActivePanel(TEAM_FORM_PANEL);
    onInvitePanelChange?.(false);
  };

  const handleSaveDelegateProfile = async (event) => {
    event.preventDefault();

    const fullName = delegateProfileForm.fullName.trim();
    const phone = delegateProfileForm.phone.trim();
    const password = delegateProfileForm.password;
    const emailValidation = validateOptionalEmail(delegateProfileForm.email);

    if (!fullName) {
      showToast?.("El nombre del delegado es obligatorio.", "error");
      return;
    }

    if (!emailValidation.value || emailValidation.error) {
      showToast?.(emailValidation.error || "El correo del delegado es obligatorio.", "error");
      return;
    }

    if (password && (password.length < 6 || password.length > 72)) {
      showToast?.(
        "La nueva contrasena debe tener entre 6 y 72 caracteres.",
        "error",
      );
      return;
    }

    setSavingDelegateProfile(true);

    try {
      const response = await updateLinkedDelegateProfileService({
        teamId,
        fullName,
        email: emailValidation.value,
        password,
        phone,
      });
      const delegate = response?.delegate || {};
      const nextFullName = delegate.fullName || fullName;
      const nextPhone = delegate.phone || "";

      setDelegateProfileForm({
        fullName: nextFullName,
        email: delegate.email || emailValidation.value,
        password: "",
        phone: nextPhone,
      });

      onFormChange?.({
        target: { name: "delegate_name", value: nextFullName },
      });
      onFormChange?.({
        target: { name: "contact_phone", value: nextPhone },
      });
      onDelegateLinkStateChanged?.({
        teamId,
        delegateName: nextFullName,
        contactPhone: nextPhone,
        delegateAssignment: linkedDelegateAssignment,
      });

      showToast?.("Informacion del delegado actualizada.", "success");
    } catch (error) {
      showToast?.(
        error.message || "No se pudo actualizar la informacion del delegado.",
        "error",
      );
    } finally {
      setSavingDelegateProfile(false);
    }
  };

  const copyInvitationLink = async (event) => {
    event.preventDefault();

    if (!invitationUrl) return;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      showToast?.("Enlace copiado.", "success");
    } catch {
      showToast?.("No se pudo copiar el enlace.", "error");
    }
  };

  const handleGenerateInvitation = async (event) => {
    event.preventDefault();

    if (!teamId) {
      showToast?.(
        "Guarda el equipo primero para habilitar el enlace de delegado.",
        "error"
      );
      return;
    }

    const emailValidation = validateOptionalEmail(inviteEmail);
    if (emailValidation.error) {
      showToast?.(emailValidation.error, "error");
      return;
    }
    setInviteEmail(emailValidation.value);

    setInviteActionLoading(true);

    try {
      const response = await createDelegateInvitation({
        teamId,
        invitedName: inviteName.trim() || null,
        invitedEmail: emailValidation.value || null,
        invitedPhone: form.contact_phone || null,
      });

      setActiveInvitation({
        id: response.invitation_id,
        team_id: teamId,
        token: response.token,
        invited_name: inviteName.trim() || null,
        invited_email: emailValidation.value || null,
        invited_phone: form.contact_phone || null,
        expires_at: response.expires_at,
      });

      showToast?.(
        "Enlace generado. Si habia otro activo, quedo revocado automaticamente.",
        "success"
      );
    } catch (error) {
      showToast?.(error.message || "No se pudo generar la invitacion.", "error");
    } finally {
      setInviteActionLoading(false);
    }
  };

  const handleRevokeInvitation = async (event) => {
    event.preventDefault();

    if (!activeInvitation?.id) return;

    setInviteActionLoading(true);

    try {
      await revokeDelegateInvitation(activeInvitation.id);
      setActiveInvitation(null);
      showToast?.("Invitacion revocada.", "success");
    } catch (error) {
      showToast?.(error.message || "No se pudo revocar la invitacion.", "error");
    } finally {
      setInviteActionLoading(false);
    }
  };

  const toggleUnlinkConfirm = (event) => {
    event.preventDefault();
    setShowUnlinkConfirm((current) => !current);
  };

  const handleUnlinkDelegate = async (event) => {
    event.preventDefault();

    if (!teamId) {
      showToast?.("No se encontro el equipo para desvincular al delegado.", "error");
      return;
    }

    setUnlinkLoading(true);

    try {
      const response = await unlinkTeamDelegateService({
        teamId,
        deleteAccount: true,
      });

      onDelegateLinkStateChanged?.({
        teamId,
        delegateName: form.delegate_name || "",
        contactPhone: form.contact_phone || "",
        delegateAssignment: null,
      });

      setShowUnlinkConfirm(false);
      setActiveInvitation(null);

      if (response?.warning) {
        showToast?.(
          `${response.message} Detalle: ${response.warning}`,
          "success"
        );
      } else {
        showToast?.(response.message || "Delegado desvinculado.", "success");
      }
    } catch (error) {
      showToast?.(
        error.message || "No se pudo desvincular la cuenta del delegado.",
        "error"
      );
    } finally {
      setUnlinkLoading(false);
    }
  };

  const renderInvitePanel = () => (
    <PanelShell>
      <PanelHeader>
        <PanelBackButton type="button" onClick={goBackToForm}>
          <BiArrowBack />
          <span>Volver al equipo</span>
        </PanelBackButton>
        <strong>Vincular delegado por QR o enlace</strong>
      </PanelHeader>

      <InvitePanelContentRow>
        <PanelCard>
          <FieldGroup>
            <label htmlFor="team-delegate-name">Nombre sugerido del delegado</label>
            <InputText2>
              <input
                id="team-delegate-name"
                className="form__field"
                name="invite_name"
                value={inviteName}
                onChange={handleInviteNameChange}
                placeholder={delegateDisplayName || "Ej. Juan Pérez"}
                {...maxLengthFeedback(FIELD_LIMITS.delegateName)}
              />
              <BiUser className="field-icon" />
            </InputText2>
          </FieldGroup>

          <FieldGroup>
            <label htmlFor="team-delegate-email">Correo sugerido</label>
            <InputText2>
              <input
                id="team-delegate-email"
                className="form__field"
                name="invite_email"
                type="email"
                value={inviteEmail}
                onChange={handleInviteEmailChange}
                placeholder="Correo para el registro"
                {...maxLengthFeedback(FIELD_LIMITS.email)}
              />
              <BiEnvelope className="field-icon" />
            </InputText2>
          </FieldGroup>

          <FieldGroup>
            <label htmlFor="team-delegate-phone">Telefono sugerido (opcional)</label>
            <InputText2>
              <input
                id="team-delegate-phone"
                className="form__field"
                name="contact_phone"
                type="tel"
                value={form.contact_phone || ""}
                onChange={onFormChange}
                placeholder="Telefono del delegado"
                {...maxLengthFeedback(FIELD_LIMITS.phone)}
              />
              <BiPhone className="field-icon" />
            </InputText2>
          </FieldGroup>

          {!teamId && (
            <PanelNotice $tone="warning">
              Guarda el equipo primero para generar el QR o el enlace de registro.
            </PanelNotice>
          )}

          <PrimaryActions>
            <ActionButton
              type="button"
              onClick={handleGenerateInvitation}
              disabled={!teamId || inviteActionLoading}
              $tone="primary"
            >
              {activeInvitation ? <BiRefresh /> : <BiLink />}
              <span>
                {inviteActionLoading
                  ? "Generando..."
                  : activeInvitation
                    ? "Regenerar enlace"
                    : "Generar enlace"}
              </span>
            </ActionButton>
          </PrimaryActions>
        </PanelCard>

        <div className="invitation-side">
          {loadingInvitation ? (
            <StatusBox>Cargando invitacion activa...</StatusBox>
          ) : activeInvitation ? (
            <InvitationBox>
              <IconButton
                className="revoke-btn"
                type="button"
                onClick={handleRevokeInvitation}
                disabled={inviteActionLoading}
                title="Revocar invitacion"
              >
                <BiTrash />
              </IconButton>

              <div className="top">
                <span className="eyebrow">Invitacion activa</span>
                <h4>Lista para compartir</h4>
                <p>
                  Expira el <b>{new Date(activeInvitation.expires_at).toLocaleString()}</b>
                </p>
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
                  <label htmlFor="team-delegate-registration-link">Link de registro</label>
                  <div className="copy-row">
                    <input id="team-delegate-registration-link" readOnly value={invitationUrl} />
                    <button type="button" onClick={copyInvitationLink} aria-label="Copiar link de registro">
                      <BiCopy />
                    </button>
                  </div>

                  <InfoList>
                    {activeInvitation.invited_name && (
                      <span>
                        <BiUser />
                        {activeInvitation.invited_name}
                      </span>
                    )}
                    {inviteEmail && (
                      <span>
                        <BiEnvelope />
                        {inviteEmail}
                      </span>
                    )}
                    {form.contact_phone && (
                      <span>
                        <BiPhone />
                        {form.contact_phone}
                      </span>
                    )}
                  </InfoList>
                </div>
              </div>
            </InvitationBox>
          ) : (
            <StatusBox>No hay una invitacion activa para este equipo.</StatusBox>
          )}
        </div>
      </InvitePanelContentRow>
    </PanelShell>
  );

  const renderDelegateProfilePanel = () => (
    <PanelShell>
      <PanelHeader>
        <PanelBackButton type="button" onClick={goBackToForm}>
          <BiArrowBack />
          <span>Volver al equipo</span>
        </PanelBackButton>
        <strong>Editar informacion del delegado</strong>
        <p>
          Actualiza sus datos personales y, si es necesario, sus credenciales de acceso.
        </p>
      </PanelHeader>

      {loadingDelegateProfile ? (
        <StatusBox>Cargando informacion del delegado...</StatusBox>
      ) : (
        <PanelCard>
          <DelegateProfileGrid>
            <FieldGroup>
              <label htmlFor="linked-delegate-name">Nombre del delegado</label>
              <InputText2>
                <input
                  id="linked-delegate-name"
                  className="form__field"
                  name="fullName"
                  value={delegateProfileForm.fullName}
                  onChange={handleDelegateProfileChange}
                  placeholder="Nombre completo"
                  required
                  {...maxLengthFeedback(FIELD_LIMITS.delegateName)}
                />
                <BiUser className="field-icon" />
              </InputText2>
            </FieldGroup>

            <FieldGroup>
              <label htmlFor="linked-delegate-email">Correo electronico</label>
              <InputText2>
                <input
                  id="linked-delegate-email"
                  className="form__field"
                  name="email"
                  type="email"
                  value={delegateProfileForm.email}
                  onChange={handleDelegateProfileChange}
                  placeholder="Correo de acceso"
                  required
                  autoComplete="email"
                  {...maxLengthFeedback(FIELD_LIMITS.email)}
                />
                <BiEnvelope className="field-icon" />
              </InputText2>
            </FieldGroup>

            <FieldGroup>
              <label htmlFor="linked-delegate-phone">Telefono</label>
              <InputText2>
                <input
                  id="linked-delegate-phone"
                  className="form__field"
                  name="phone"
                  type="tel"
                  value={delegateProfileForm.phone}
                  onChange={handleDelegateProfileChange}
                  placeholder="Numero de contacto"
                  autoComplete="tel"
                  {...maxLengthFeedback(FIELD_LIMITS.phone)}
                />
                <BiPhone className="field-icon" />
              </InputText2>
            </FieldGroup>

            <FieldGroup>
              <label htmlFor="linked-delegate-password">
                Nueva contrasena (opcional)
              </label>
              <InputText2>
                <input
                  id="linked-delegate-password"
                  className="form__field"
                  name="password"
                  type="password"
                  value={delegateProfileForm.password}
                  onChange={handleDelegateProfileChange}
                  placeholder="Dejar vacio para conservarla"
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={72}
                />
                <BiLockAlt className="field-icon" />
              </InputText2>
            </FieldGroup>
          </DelegateProfileGrid>

          <PanelNotice $tone="warning">
            Si cambias el correo o la contrasena, el delegado debera usar los nuevos datos
            en su proximo inicio de sesion.
          </PanelNotice>

          <PrimaryActions>
            <ActionButton
              type="button"
              onClick={handleSaveDelegateProfile}
              disabled={savingDelegateProfile}
              $tone="primary"
            >
              <v.iconoguardar />
              <span>
                {savingDelegateProfile ? "Guardando..." : "Guardar delegado"}
              </span>
            </ActionButton>
          </PrimaryActions>
        </PanelCard>
      )}
    </PanelShell>
  );

  const renderDelegateField = () => (
    <div className="full-width">
      <span className="label">Delegado</span>
      {isLinkedDelegate ? (
        <LinkedDelegateContainer>
          <LinkedDelegateButton
            type="button"
            onClick={openDelegateProfilePanel}
            disabled={!canManageDelegateLink}
            aria-label={`Editar informacion de ${delegateInputDisplay}`}
            title={canManageDelegateLink ? "Editar informacion del delegado" : undefined}
          >
            <span className="delegate-info">
              <span className="delegate-name">{delegateInputDisplay}</span>
              <BiBadgeCheck className="verified-icon" />
            </span>
            {canManageDelegateLink && <BiChevronRight className="edit-chevron" />}
          </LinkedDelegateButton>
          {canManageDelegateLink && (
            <button aria-label="Desvincular"
              className="unlink-btn"
              type="button"
              onClick={toggleUnlinkConfirm}
              title="Desvincular"
            >
              <BiUnlink />
            </button>
          )}
        </LinkedDelegateContainer>
      ) : (
        <DelegateFieldShell $linked={false} $withAction={canManageDelegateLink}>
          <InputText2>
            <input
              className="form__field"
              name="delegate_name"
              value={delegateInputDisplay}
              onChange={onFormChange}
              placeholder="Nombre del delegado"
              {...maxLengthFeedback(FIELD_LIMITS.delegateName)}
            />
          </InputText2>

          {canManageDelegateLink && (
            <DelegateActionButton
              type="button"
              onClick={openInvitePanel}
              $danger={false}
            >
              <BiQr />
              <span>QR / Link</span>
            </DelegateActionButton>
          )}
        </DelegateFieldShell>
      )}

      {isLinkedDelegate ? (
        <HelperText $tone="verified">
          {canManageDelegateLink
            ? "Delegado registrado. Haz clic en su nombre para editar sus datos."
            : "Delegado registrado y vinculado."}
        </HelperText>
      ) : delegateDisplayName ? null : (
        <HelperText>
          Escribe un nombre manual o usa QR / Link para que el delegado se vincule con cuenta propia.
        </HelperText>
      )}

      {isLinkedDelegate && showUnlinkConfirm && (
        <DangerZone>
          <strong>Desvincular delegado</strong>
          <p>
            Se quitara la vinculacion de este equipo y se intentara eliminar la cuenta del
            delegado. Si esa cuenta esta ligada a otros equipos o no puede borrarse, el
            sistema la dejara protegida con un bloqueo.
          </p>
          <DangerActions>
            <SecondaryButton type="button" onClick={toggleUnlinkConfirm}>
              Cancelar
            </SecondaryButton>
            <DangerButton
              type="button"
              onClick={handleUnlinkDelegate}
              disabled={unlinkLoading}
            >
              <BiUnlink />
              <span>{unlinkLoading ? "Procesando..." : "Confirmar desvinculacion"}</span>
            </DangerButton>
          </DangerActions>
        </DangerZone>
      )}
    </div>
  );

  const handleSubmit = (event) => {
    if (activePanel === TEAM_DELEGATE_PANEL) {
      handleSaveDelegateProfile(event);
      return;
    }

    if (activePanel !== TEAM_FORM_PANEL) {
      event.preventDefault();
      return;
    }

    onSave(event);
  };

  return (
    <FormContainer
      ref={containerRef}
      onSubmit={handleSubmit}
      style={{ "--team-color": form.color || "#000000" }}
    >
      {activePanel === TEAM_INVITE_PANEL ? (
        renderInvitePanel()
      ) : activePanel === TEAM_DELEGATE_PANEL ? (
        renderDelegateProfilePanel()
      ) : (
        <>
          <div className="logo-section">
            <div className="preview-container">
              <PhotoUploader
                previewUrl={preview}
                originalUrl={teamToEdit?.original_logo_url || teamToEdit?.logo_url}
                originalFile={originalFile}
                onImageSelect={(croppedFile, sourceOriginalFile) => {
                  onFileChange({
                    target: { files: [croppedFile] },
                    original: sourceOriginalFile,
                  });
                }}
                onClear={onClearImage}
                showToast={showToast}
                isTeamLogo={true}
                themeColor={form.color}
                shape="square"
                width="120px"
                height="120px"
                enableClipboardPaste={true}
              />
            </div>

            <div className="actions-column">
              <p className="hint">
                Si no subes un logo, el sistema mostrara un escudo dinamico con las
                iniciales y el color del equipo para ahorrar espacio y mantener velocidad.
              </p>
            </div>
          </div>

          <div className="grid-inputs">
            <div className="full-width">
              <span className="label">Nombre del Equipo *</span>
              <InputText2>
                <input
                  className="form__field"
                  name="name"
                  value={form.name || ""}
                  onChange={onFormChange}
                  required
                  placeholder="Ej. Rayados"
                  {...maxLengthFeedback(FIELD_LIMITS.teamName)}
                />
              </InputText2>
            </div>

            {renderDelegateField()}

            <div className="full-width">
              <span className="label">Telefono</span>
              <InputText2>
                <input
                  className="form__field"
                  name="contact_phone"
                  value={form.contact_phone || ""}
                  onChange={onFormChange}
                  placeholder="Contacto"
                  type="tel"
                  {...maxLengthFeedback(FIELD_LIMITS.phone)}
                />
              </InputText2>
            </div>

            <div>
              <span className="label">Color Uniforme</span>
              <ColorInputContainer>
                <input
                  ref={colorInputRef}
                  aria-label="Color del equipo"
                  type="color"
                  name="color"
                  defaultValue={form.color || "#000000"}
                  onInput={handleColorInput}
                  onChange={handleColorChange}
                />
                <span ref={colorTextRef}>{form.color || "#000000"}</span>
              </ColorInputContainer>
            </div>

            <div>
              <span className="label">Estado</span>
              {allowStatusEdit ? (
                <SelectStyled name="status" value={form.status} onChange={onFormChange}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Suspendido">Suspendido</option>
                </SelectStyled>
              ) : (
                <ReadonlyField>
                  <strong>{form.status || "Activo"}</strong>
                  <span>Solo el manager puede cambiar el estado del equipo.</span>
                </ReadonlyField>
              )}
            </div>
          </div>

          <div className="actions">
            <Btnsave
              titulo={isUploading ? "Guardando..." : saveLabel}
              bgcolor={v.colorPrincipal}
              icono={<v.iconoguardar />}
              disabled={isUploading}
              width="100%"
            />
          </div>
        </>
      )}
    </FormContainer>
  );
}

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-x: clip;

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

  .label {
    display: block;
    margin-bottom: 5px;
    color: ${({ theme }) => theme.text};
    font-size: 13px;
    font-weight: 600;
    opacity: 0.8;
  }

  .logo-section {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    padding: 15px;
    border: 1px dashed var(--team-color);
    border-radius: 12px;
    background: color-mix(in srgb, var(--team-color), transparent 85%);
    transition: background 0.1s, border-color 0.1s;

    .preview-container {
      position: relative;
      width: fit-content;
    }

    .actions-column {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 10px;
      justify-content: center;
      align-items: flex-start;

      .hint {
        margin: 0;
        color: ${({ theme }) => theme.text};
        font-size: 12px;
        line-height: 1.4;
        opacity: 0.8;
        text-align: left;
      }
    }
  }

  .grid-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;

    .full-width {
      grid-column: span 2;
    }
  }

  .actions {
    margin-top: 10px;
  }

  @media (max-width: 768px) {
    .logo-section {
      flex-direction: column;
      align-items: center;
    }

    .grid-inputs {
      grid-template-columns: 1fr;

      .full-width {
        grid-column: span 1;
      }
    }
  }
`;

const DelegateFieldShell = styled.div`
  position: relative;

  .form__field {
    padding-right: ${({ $linked, $withAction }) => {
      if (!$withAction && $linked) return "46px";
      return $linked ? "150px" : "122px";
    }} !important;
    color: ${({ $linked, theme }) => ($linked ? "#1cb0f6" : theme.text)};
    font-weight: ${({ $linked }) => ($linked ? 700 : 400)};
  }
`;

const DelegateActionButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: ${({ $danger }) => ($danger ? "rgba(231, 76, 60, 0.12)" : "#1cb0f6")};
  color: ${({ $danger }) => ($danger ? "#ff6b6b" : "#ffffff")};
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 800;
  transition: transform 0.2s ease, opacity 0.2s ease, background 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-50%) scale(1.02);
    opacity: 0.94;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  svg {
    font-size: 0.95rem;
  }
`;

const VerifiedInlineBadge = styled.div`
  position: absolute;
  top: 7px;
  right: ${({ $withAction }) => ($withAction ? "125px" : "12px")};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1cb0f6;
  font-size: 0.78rem;
  font-weight: 700;

  svg {
    font-size: 1rem;
  }
`;

const LinkedDelegateContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
  padding: 5px 6px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.bgtotal || "#ffffff"};
  border: 1px solid ${({ theme }) => theme.color2 || "#e2e8f0"};
  color: ${({ theme }) => theme.text};
  min-height: 48px;

  .unlink-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    border: none;
    border-radius: 8px;
    background: rgba(231, 76, 60, 0.12);
    color: #ff6b6b;
    cursor: pointer;
    transition: 0.2s;

    &:hover {
      background: #ff6b6b;
      color: #fff;
    }

    svg {
      font-size: 1.2rem;
    }
  }
`;

const LinkedDelegateButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  min-height: 38px;
  flex: 1;
  padding: 0 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background 180ms cubic-bezier(0.25, 1, 0.5, 1);

  .delegate-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .delegate-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .verified-icon {
    flex-shrink: 0;
    color: #1cb0f6;
    font-size: 1.2rem;
  }

  .edit-chevron {
    flex-shrink: 0;
    font-size: 1.15rem;
    opacity: 0.55;
    transition: transform 180ms cubic-bezier(0.25, 1, 0.5, 1), opacity 180ms ease;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.bg4};

    .edit-chevron {
      opacity: 1;
      transform: translateX(2px);
    }
  }

  &:focus-visible {
    outline: 2px solid ${v.colorPrincipal};
    outline-offset: 1px;
  }

  &:disabled {
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    &, .edit-chevron {
      transition: none;
    }
  }
`;

const HelperText = styled.p`
  margin: 2px 0 0 0;
  color: ${({ $tone, theme }) => ($tone === "verified" ? "#8cd5ff" : theme.text)};
  font-size: 0.8rem;
  line-height: 1.45;
  opacity: ${({ $tone }) => ($tone === "verified" ? 1 : 0.72)};
`;

const DangerZone = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 14px;
  border: 1px solid rgba(231, 76, 60, 0.28);
  border-radius: 14px;
  background: rgba(231, 76, 60, 0.08);

  strong {
    color: ${({ theme }) => theme.text};
    font-size: 0.92rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.text};
    font-size: 0.82rem;
    line-height: 1.45;
    opacity: 0.84;
  }
`;

const DangerActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const BaseActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 700;
  transition: transform 0.2s ease, opacity 0.2s ease, background 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    opacity: 0.95;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

const SecondaryButton = styled(BaseActionButton)`
  background: ${({ theme }) => theme.bg4};
  border-color: ${({ theme }) => theme.bg4};
  color: ${({ theme }) => theme.text};
`;

const DangerButton = styled(BaseActionButton)`
  background: ${v.rojo};
  color: #ffffff;
`;

const PanelShell = styled.div`
  display: grid;
  gap: 18px;
`;

const InvitePanelContentRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: start;

  .invitation-side {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const PanelHeader = styled.div`
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(28, 176, 246, 0.16), rgba(28, 176, 246, 0.05));
  border: 1px solid rgba(28, 176, 246, 0.22);

  strong {
    display: block;
    margin-bottom: 4px;
    color: ${({ theme }) => theme.text};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.text};
    font-size: 0.9rem;
    line-height: 1.45;
    opacity: 0.8;
  }
`;

const PanelBackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  border: none;
  background: transparent;
  color: ${v.colorPrincipal};
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 800;
  padding: 0;
`;

const PanelCard = styled.div`
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
    top: 14px;
    right: 14px;
    opacity: 0.45;
    font-size: 1.1rem;
  }
`;

const DelegateProfileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const PanelNotice = styled.div`
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid
    ${({ $tone }) =>
      $tone === "warning" ? "rgba(243, 156, 18, 0.28)" : "rgba(28, 176, 246, 0.22)"};
  background: ${({ $tone }) =>
    $tone === "warning" ? "rgba(243, 156, 18, 0.12)" : "rgba(28, 176, 246, 0.08)"};
  color: ${({ theme }) => theme.text};
  font-size: 0.84rem;
  line-height: 1.45;
`;

const PrimaryActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const ActionButton = styled(BaseActionButton)`
  background: ${({ $tone, theme }) =>
    $tone === "primary" ? v.colorPrincipal : theme.bg4};
  border-color: ${({ $tone, theme }) =>
    $tone === "primary" ? v.colorPrincipal : theme.bg4};
  color: ${({ $tone, theme }) => ($tone === "primary" ? "#ffffff" : theme.text)};
`;

const StatusBox = styled.div`
  padding: 16px;
  border: 1px dashed ${({ theme }) => theme.bg4};
  border-radius: 14px;
  background: ${({ theme }) => theme.bgtotal};
  text-align: center;
  opacity: 0.75;
`;

const InvitationBox = styled.div`
  position: relative;
  display: grid;
  gap: 18px;
  padding: 18px;
  border-radius: 18px;
  background: ${({ theme }) => theme.bgcards};
  border: 1px solid rgba(46, 213, 115, 0.25);

  .revoke-btn {
    position: absolute;
    top: 14px;
    right: 14px;
  }

  .top {
    display: grid;
    gap: 2px;
    padding-right: 52px;
  }

  .eyebrow {
    display: inline-flex;
    margin-bottom: 4px;
    color: ${v.verde};
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  h4,
  p {
    margin: 0;
  }

  p {
    margin-top: 4px;
    opacity: 0.75;
  }

  .share-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .qr-card {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 14px;
    border-radius: 18px;
    background: #ffffff;
    width: fit-content;
    margin: 0 auto;
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
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 12px;
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
    color: #ffffff;
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

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: ${v.rojo};
    color: #ffffff;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

const ColorInputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.bg4};
  border-radius: 12px;
  background: ${({ theme }) => theme.bgtotal};

  span {
    color: ${({ theme }) => theme.text};
    font-size: 13px;
    font-weight: 600;
  }

  input[type="color"] {
    border: none;
    width: 30px;
    height: 30px;
    cursor: pointer;
    background: none;
  }
`;

const SelectStyled = styled.select`
  width: 100%;
  padding: 12px;
  border: 2px solid ${({ theme }) => theme.color2};
  border-radius: 15px;
  background: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  font-family: inherit;
  outline: none;
`;

const ReadonlyField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 2px solid ${({ theme }) => theme.color2};
  border-radius: 15px;
  background: ${({ theme }) => theme.bgtotal};

  strong {
    font-size: 0.95rem;
  }

  span {
    font-size: 0.78rem;
    line-height: 1.35;
    opacity: 0.72;
  }
`;
