export const FIELD_LIMITS = Object.freeze({
  playerFirstName: 25,
  playerLastName: 35,
  playerIdentity: 30,
  teamName: 35,
  delegateName: 45,
  phone: 25,
  email: 254,
});

const PERSON_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u;
const TEAM_NAME_PATTERN = /^[\p{L}\p{M}\p{N}]+(?:[ .&'()/-][\p{L}\p{M}\p{N}]+)*$/u;
const IDENTITY_PATTERN = /^[\p{L}\p{N}]+(?:[ ./_-][\p{L}\p{N}]+)*$/u;
const PHONE_PATTERN = /^\+?[0-9](?:[0-9 ()-]{5,23}[0-9])?$/;

export const normalizeText = (value) =>
  String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");

export const normalizePhone = (value) => normalizeText(value);
export const normalizeIdentity = (value) => normalizeText(value).toUpperCase();

export function validateOptionalEmail(value) {
  const email = normalizeText(value).toLowerCase();
  if (!email) return { value: "", error: null };
  if (email.length > FIELD_LIMITS.email) {
    return { value: email, error: `El correo admite máximo ${FIELD_LIMITS.email} caracteres.` };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { value: email, error: "Escribe un correo válido." };
  }
  return { value: email, error: null };
}

const required = (value, label) =>
  value ? null : `${label} es obligatorio.`;

const maxLength = (value, limit, label) =>
  value.length <= limit ? null : `${label} admite máximo ${limit} caracteres.`;

const firstError = (...errors) => errors.find(Boolean) || null;

export function validatePlayerForm(input) {
  const data = {
    ...input,
    first_name: normalizeText(input.first_name),
    last_name: normalizeText(input.last_name),
    curp_dni: normalizeIdentity(input.curp_dni),
  };
  const errors = {};

  errors.first_name = firstError(
    required(data.first_name, "El nombre"),
    maxLength(data.first_name, FIELD_LIMITS.playerFirstName, "El nombre"),
    data.first_name && !PERSON_NAME_PATTERN.test(data.first_name)
      ? "El nombre solo puede contener letras, espacios, punto, apóstrofo o guion."
      : null
  );
  errors.last_name = firstError(
    required(data.last_name, "Los apellidos"),
    maxLength(data.last_name, FIELD_LIMITS.playerLastName, "Los apellidos"),
    data.last_name && !PERSON_NAME_PATTERN.test(data.last_name)
      ? "Los apellidos solo pueden contener letras, espacios, punto, apóstrofo o guion."
      : null
  );
  errors.curp_dni = firstError(
    maxLength(data.curp_dni, FIELD_LIMITS.playerIdentity, "El identificador"),
    data.curp_dni && !IDENTITY_PATTERN.test(data.curp_dni)
      ? "El identificador contiene caracteres no permitidos."
      : null
  );

  const dorsal = data.dorsal === "" || data.dorsal == null ? null : Number(data.dorsal);
  if (dorsal !== null && (!Number.isInteger(dorsal) || dorsal < 0 || dorsal > 999)) {
    errors.dorsal = "El dorsal debe ser un número entero entre 0 y 999.";
  }
  data.dorsal = dorsal;

  Object.keys(errors).forEach((key) => !errors[key] && delete errors[key]);
  return { data, errors, isValid: Object.keys(errors).length === 0 };
}

export function validateTeamForm(input) {
  const data = {
    ...input,
    name: normalizeText(input.name),
    delegate_name: normalizeText(input.delegate_name),
    contact_phone: normalizePhone(input.contact_phone),
  };
  const errors = {};

  errors.name = firstError(
    required(data.name, "El nombre del equipo"),
    maxLength(data.name, FIELD_LIMITS.teamName, "El nombre del equipo"),
    data.name && !TEAM_NAME_PATTERN.test(data.name)
      ? "Usa letras, números, espacios y puntuación habitual (.-&'()/)."
      : null
  );
  errors.delegate_name = firstError(
    maxLength(data.delegate_name, FIELD_LIMITS.delegateName, "El nombre del delegado"),
    data.delegate_name && !PERSON_NAME_PATTERN.test(data.delegate_name)
      ? "El nombre del delegado contiene caracteres no permitidos."
      : null
  );
  errors.contact_phone = firstError(
    maxLength(data.contact_phone, FIELD_LIMITS.phone, "El teléfono"),
    data.contact_phone && !PHONE_PATTERN.test(data.contact_phone)
      ? "Escribe un teléfono válido; solo se permiten números, +, espacios, paréntesis y guiones."
      : null
  );

  Object.keys(errors).forEach((key) => !errors[key] && delete errors[key]);
  return { data, errors, isValid: Object.keys(errors).length === 0 };
}
