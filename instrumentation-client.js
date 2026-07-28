const MAX_BUFFERED_ERRORS = 20;
const INSTALLATION_FLAG = "__BRACKET_CLIENT_INSTRUMENTATION_INSTALLED__";

const recordClientError = (entry) => {
  const currentErrors = Array.isArray(window.__BRACKET_CLIENT_ERRORS__)
    ? window.__BRACKET_CLIENT_ERRORS__
    : [];
  const normalizedEntry = {
    message: String(entry.message || "Error de cliente desconocido").slice(0, 500),
    source: entry.source || "client",
    timestamp: new Date().toISOString(),
  };

  window.__BRACKET_CLIENT_ERRORS__ = [
    ...currentErrors,
    normalizedEntry,
  ].slice(-MAX_BUFFERED_ERRORS);
  window.dispatchEvent(
    new CustomEvent("bracket:client-error", { detail: normalizedEntry }),
  );
};

if (!window[INSTALLATION_FLAG]) {
  window[INSTALLATION_FLAG] = true;

  window.addEventListener("error", (event) => {
    recordClientError({
      message: event.error?.message || event.message,
      source: "window.error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    recordClientError({
      message: event.reason?.message || event.reason,
      source: "unhandledrejection",
    });
  });
}
