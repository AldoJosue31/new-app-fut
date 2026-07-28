export const readJsonBody = async (req) => {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }
  return req.body;
};

export const sendError = (res, error) => {
  const statusCode = error?.statusCode || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error("Private API request failed.", {
      code: error?.code || null,
      name: error?.name || "Error",
      requestId: res.requestId || null,
    });
  }

  return res.status(statusCode).json({
    error: isServerError
      ? "Error interno del servidor."
      : error?.message || "Solicitud invalida.",
  });
};
