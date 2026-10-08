export const PASSWORD_MIN_LENGTH = 8;
export const RECOVERY_RESEND_SECONDS = 60;

export const normalizeRecoveryEmail = (email) =>
  String(email || "").trim().toLowerCase();

export const validateRecoveryEmail = (email) => {
  if (!email) return "Ingresa tu correo electrónico.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Ingresa un correo electrónico válido.";
  }
  return null;
};

export const validateNewPassword = (password, confirmation) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres en tu nueva contraseña.`;
  }
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return null;
};

export const isRecoveryRateLimit = (error) =>
  error?.status === 429 ||
  ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error?.code);

export const isRecoverySessionExpired = (error) =>
  error?.status === 401 ||
  error?.name === "AuthSessionMissingError" ||
  ["session_not_found", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt"].includes(error?.code);

export const getRecoveryErrorMessage = (error) => {
  if (isRecoveryRateLimit(error)) {
    return "Hay demasiados intentos. Espera un momento antes de solicitar otro enlace.";
  }
  if (isRecoverySessionExpired(error)) {
    return "Tu enlace ya no es válido. Solicita uno nuevo para continuar.";
  }
  if (error?.code === "same_password") {
    return "Elige una contraseña diferente a la que usabas antes.";
  }
  if (error?.code === "weak_password") {
    return "Elige una contraseña más segura. Combina letras, números y símbolos.";
  }
  if (/fetch|network|connection/i.test(String(error?.message || ""))) {
    return "No pudimos conectarnos. Revisa tu conexión e inténtalo otra vez.";
  }
  return "No pudimos completar la solicitud. Inténtalo otra vez en unos minutos.";
};
