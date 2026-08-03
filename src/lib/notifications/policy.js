const POLICY_BY_TYPE = {
  success: { title: "Listo", duration: 4000 },
  error: { title: "No se pudo completar", duration: 6000 },
  warning: { title: "Atención", duration: 6000 },
  info: { title: "Información", duration: 5000 },
};

export const NOTIFICATION_TYPES = Object.freeze(Object.keys(POLICY_BY_TYPE));

export const NOTIFICATION_POLICY = Object.freeze(
  Object.fromEntries(
    Object.entries(POLICY_BY_TYPE).map(([type, policy]) => [
      type,
      Object.freeze({ ...policy }),
    ]),
  ),
);

const FALLBACK_MESSAGE = "Ocurrió algo inesperado.";

export function normalizeNotificationType(type) {
  return NOTIFICATION_TYPES.includes(type) ? type : "info";
}

export function normalizeNotificationMessage(value, fallback = FALLBACK_MESSAGE) {
  const candidate = value instanceof Error ? value.message : value?.message ?? value;
  const normalized = typeof candidate === "string" ? candidate.trim() : "";

  return normalized || fallback;
}

export function createNotificationOptions(type, message, overrides = {}) {
  const safeOverrides =
    overrides && typeof overrides === "object" ? overrides : {};
  const normalizedType = normalizeNotificationType(type);
  const policy = NOTIFICATION_POLICY[normalizedType];
  const duration = Number(safeOverrides.duration);

  return {
    type: normalizedType,
    title: normalizeNotificationMessage(safeOverrides.title, policy.title),
    description: normalizeNotificationMessage(
      safeOverrides.description ?? message,
      FALLBACK_MESSAGE,
    ),
    duration:
      Number.isFinite(duration) && duration >= 1000 && duration <= 30000
        ? duration
        : policy.duration,
  };
}
