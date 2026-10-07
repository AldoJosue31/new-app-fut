"use client";

import { useEffect, useRef, useState } from "react";
import { RiArrowRightLine, RiMailSendLine } from "react-icons/ri";
import { useAuthStore } from "../../../store/AuthStore.jsx";
import {
  getRecoveryErrorMessage,
  isRecoveryRateLimit,
  normalizeRecoveryEmail,
  RECOVERY_RESEND_SECONDS,
  validateRecoveryEmail,
} from "../../../lib/auth/passwordRecovery.js";
import {
  RecoveryCard, RecoveryHeading, RecoveryDescription, RecoveryForm,
  Field, PrimaryAction, TextAction, InlineMessage, RecoveryActions, RecoveryNote,
} from "./RecoveryCard.jsx";

export default function PasswordRecoveryRequest({ initialEmail = "", onBack }) {
  const requestPasswordRecovery = useAuthStore((state) => state.requestPasswordRecovery);
  const emailRef = useRef(null);
  const inFlight = useRef(false);
  const retryUntil = useRef(0);
  const [email, setEmail] = useState(initialEmail);
  const [sentEmail, setSentEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);

  useEffect(() => { emailRef.current?.focus(); }, []);
  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = window.setTimeout(() => setRetrySeconds(Math.max(0, Math.ceil((retryUntil.current - Date.now()) / 1000))), 1000);
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);

  const startCooldown = () => {
    retryUntil.current = Date.now() + RECOVERY_RESEND_SECONDS * 1000;
    setRetrySeconds(RECOVERY_RESEND_SECONDS);
  };

  const sendLink = async (event) => {
    event?.preventDefault();
    if (inFlight.current || retrySeconds > 0) return;
    const normalizedEmail = normalizeRecoveryEmail(email);
    const validationError = validateRecoveryEmail(normalizedEmail);
    setFieldError(Boolean(validationError));
    setError(validationError);
    if (validationError) { emailRef.current?.focus(); return; }
    inFlight.current = true;
    setBusy(true);
    try {
      await requestPasswordRecovery(normalizedEmail);
      setEmail(normalizedEmail);
      setSentEmail(normalizedEmail);
      startCooldown();
    } catch (requestError) {
      setError(getRecoveryErrorMessage(requestError));
      if (isRecoveryRateLimit(requestError)) startCooldown();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <RecoveryCard onBack={onBack ? () => onBack(email) : undefined} backDisabled={busy}>
      <RecoveryHeading>{sentEmail ? "Revisa tu correo" : "Recupera tu acceso"}</RecoveryHeading>
      {sentEmail ? (
        <>
          <RecoveryDescription role="status">
            Si existe una cuenta con <strong>{sentEmail}</strong>, recibirás un enlace para elegir una nueva contraseña.
          </RecoveryDescription>
          <RecoveryActions aria-busy={busy}>
            <InlineMessage>Abre el enlace desde tu correo para continuar.</InlineMessage>
            {error && <InlineMessage $error role="alert">{error}</InlineMessage>}
            <PrimaryAction type="button" onClick={sendLink} disabled={busy || retrySeconds > 0}>
              <RiMailSendLine aria-hidden="true" />
              {busy ? "Enviando…" : retrySeconds > 0 ? `Reenviar en ${retrySeconds} s` : "Reenviar enlace"}
            </PrimaryAction>
            <TextAction type="button" disabled={busy} onClick={() => {
              setSentEmail(""); setError(null); setFieldError(false);
            }}>Usar otro correo</TextAction>
          </RecoveryActions>
          <RecoveryNote>Si no aparece, revisa la carpeta de spam o correo no deseado.</RecoveryNote>
        </>
      ) : (
        <>
          <RecoveryDescription>Escribe el correo de tu cuenta y te enviaremos un enlace para cambiar tu contraseña.</RecoveryDescription>
          <RecoveryForm onSubmit={sendLink} noValidate aria-busy={busy}>
            <Field>
              <label htmlFor="recovery-email">Correo electrónico</label>
              <input ref={emailRef} id="recovery-email" name="email" className="field-input"
                type="email" autoComplete="email" inputMode="email" autoCapitalize="none"
                autoCorrect="off" spellCheck="false" required maxLength={254}
                placeholder="tu@correo.com" value={email} onChange={(event) => setEmail(event.target.value)}
                disabled={busy} aria-invalid={fieldError} aria-describedby={error ? "recovery-error" : undefined} />
            </Field>
            {error && <InlineMessage id="recovery-error" $error role="alert">{error}</InlineMessage>}
            <PrimaryAction type="submit" disabled={busy || retrySeconds > 0}>
              {busy ? "Enviando…" : retrySeconds > 0 ? `Enviar en ${retrySeconds} s` : "Enviar enlace"}
              {!busy && retrySeconds === 0 && <RiArrowRightLine aria-hidden="true" />}
            </PrimaryAction>
          </RecoveryForm>
          <RecoveryNote>Tu contraseña actual seguirá funcionando hasta que guardes una nueva.</RecoveryNote>
        </>
      )}
    </RecoveryCard>
  );
}
