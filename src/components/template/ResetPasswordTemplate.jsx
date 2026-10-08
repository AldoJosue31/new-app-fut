"use client";

import { useRef, useState } from "react";
import { RiArrowRightLine, RiCheckLine } from "react-icons/ri";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { ROUTES } from "../../lib/navigation/routes.js";
import {
  getRecoveryErrorMessage, isRecoverySessionExpired, PASSWORD_MIN_LENGTH, validateNewPassword,
} from "../../lib/auth/passwordRecovery.js";
import RecoveryPasswordField from "../organismos/auth/RecoveryPasswordField.jsx";
import {
  RecoveryCard, RecoveryHeading, RecoveryDescription, RecoveryForm,
  PrimaryAction, InlineMessage, RecoveryActions, PrimaryRecoveryLink, RecoveryNote,
} from "../organismos/auth/RecoveryCard.jsx";

export default function ResetPasswordTemplate({ sessionState }) {
  const updatePassword = useAuthStore((state) => state.updateRecoveredPassword);
  const signOut = useAuthStore((state) => state.cerrarSesion);
  const inFlight = useRef(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  const finishSignOut = async () => {
    try { await signOut(); setSignedOut(true); return true; }
    catch { setError("Tu contraseña se actualizó. No pudimos cerrar la sesión; inténtalo de nuevo para ingresar."); return false; }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    const validationError = validateNewPassword(password, confirmation);
    setError(validationError);
    if (validationError) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await updatePassword(password, confirmation);
      setPassword(""); setConfirmation(""); setCompleted(true);
      await finishSignOut();
    } catch (updateError) {
      setError(getRecoveryErrorMessage(updateError));
      if (isRecoverySessionExpired(updateError)) setExpired(true);
    } finally { inFlight.current = false; setBusy(false); }
  };

  if (completed) return (
    <RecoveryCard>
      <RecoveryHeading>Contraseña actualizada</RecoveryHeading>
      <RecoveryDescription role="status">Tu nueva contraseña está lista. Vuelve a ingresar para continuar con tu liga.</RecoveryDescription>
      <RecoveryActions>
        {error && <InlineMessage $error role="alert">{error}</InlineMessage>}
        <PrimaryAction type="button" disabled={busy} onClick={async () => {
          if (inFlight.current) return;
          inFlight.current = true; setBusy(true);
          if (signedOut || await finishSignOut()) window.location.replace(ROUTES.LOGIN);
          inFlight.current = false; setBusy(false);
        }}><RiCheckLine aria-hidden="true" />{busy ? "Cerrando sesión…" : signedOut ? "Ingresar" : "Cerrar sesión e ingresar"}</PrimaryAction>
      </RecoveryActions>
    </RecoveryCard>
  );

  if (sessionState !== "ready" || expired) {
    const unavailable = sessionState === "unavailable";
    return (
      <RecoveryCard>
        <RecoveryHeading>{unavailable ? "No pudimos verificar tu enlace" : "Necesitas un nuevo enlace"}</RecoveryHeading>
        <RecoveryDescription>
          {unavailable ? "Revisa tu conexión e intenta abrir el enlace de tu correo otra vez." :
            "El enlace venció, ya fue utilizado o no es válido. Solicita otro para cambiar tu contraseña."}
        </RecoveryDescription>
        <RecoveryActions>
          <PrimaryRecoveryLink href={`${ROUTES.LOGIN}?recovery=1`}>Solicitar nuevo enlace <RiArrowRightLine aria-hidden="true" /></PrimaryRecoveryLink>
        </RecoveryActions>
      </RecoveryCard>
    );
  }

  return (
    <RecoveryCard>
      <RecoveryHeading>Elige tu nueva contraseña</RecoveryHeading>
      <RecoveryDescription>Usa una contraseña que no hayas utilizado en otras cuentas.</RecoveryDescription>
      <RecoveryForm onSubmit={handleSubmit} noValidate aria-busy={busy}>
        <RecoveryPasswordField id="new-password" label="Nueva contraseña" value={password}
          onChange={(event) => setPassword(event.target.value)} disabled={busy} invalid={Boolean(error)}
          describedBy={error ? "password-guidance password-error" : "password-guidance"} />
        <InlineMessage id="password-guidance">Al menos {PASSWORD_MIN_LENGTH} caracteres. Combina letras, números y símbolos.</InlineMessage>
        <RecoveryPasswordField id="confirm-password" label="Confirmar contraseña" value={confirmation}
          visibilityLabel="confirmación de contraseña"
          onChange={(event) => setConfirmation(event.target.value)} disabled={busy} invalid={Boolean(error)}
          describedBy={error ? "password-error" : undefined} />
        {error && <InlineMessage id="password-error" $error role="alert">{error}</InlineMessage>}
        <PrimaryAction type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}<RiArrowRightLine aria-hidden="true" /></PrimaryAction>
      </RecoveryForm>
      <RecoveryNote>Después de guardarla, podrás ingresar con tu nueva contraseña.</RecoveryNote>
    </RecoveryCard>
  );
}
