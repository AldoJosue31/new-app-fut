const INVALID_SESSION_CODES = new Set([
  "bad_jwt",
  "session_expired",
  "session_not_found",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "user_not_found",
  "user_banned",
]);

export const isTransientAuthError = (error) => {
  if (!error) return false;

  const status = error.status ?? error.statusCode;
  return (
    error.name === "AuthRetryableFetchError" ||
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    (error.name === "TypeError" && /fetch|network|load failed/i.test(error.message)) ||
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    error.code === "request_timeout" ||
    error.code === "conflict"
  );
};

export const isInvalidSessionError = (error) =>
  !isTransientAuthError(error) && (
    INVALID_SESSION_CODES.has(error?.code) ||
    error?.name === "AuthSessionMissingError" ||
    error?.name === "AuthInvalidJwtError"
  );

export const isAuthUnavailable = (status) =>
  status === "auth-unavailable" || status === "profile-unavailable";
