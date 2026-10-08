import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeRecoveryEmail, validateRecoveryEmail, validateNewPassword,
  getRecoveryErrorMessage, isRecoveryRateLimit, isRecoverySessionExpired,
} from "../src/lib/auth/passwordRecovery.js";
import { buildPasswordRecoveryPath } from "../src/lib/navigation/routes.js";
import { evaluateRouteAccess, getRoutePolicy } from "../src/lib/auth/routeAccess.js";

test("el correo se normaliza y la solicitud rechaza valores vacíos o malformados", () => {
  assert.equal(normalizeRecoveryEmail("  Liga+Manager@Correo.MX  "), "liga+manager@correo.mx");
  for (const email of ["", "correo", "correo@", "a b@correo.mx"]) assert.ok(validateRecoveryEmail(email));
  assert.equal(validateRecoveryEmail("liga+manager@correo.mx"), null);
});

test("la contraseña exige longitud y confirmación sin modificar su contenido", () => {
  assert.ok(validateNewPassword("1234567", "1234567"));
  assert.ok(validateNewPassword("contraseña1", "contraseña2"));
  assert.equal(validateNewPassword("  Clave 2026  ", "  Clave 2026  "), null);
});

test("la redirección del correo usa el endpoint de servidor en el origen actual", () => {
  const url = new URL(buildPasswordRecoveryPath("https://ligas.example"));
  assert.equal(url.origin, "https://ligas.example");
  assert.equal(url.pathname, "/auth/confirm");
  assert.equal(url.searchParams.get("next"), "/restablecer-contrasena");
});

test("los errores de recuperación distinguen frecuencia, sesión y contraseña sin filtrar detalles", () => {
  assert.equal(isRecoveryRateLimit({ status: 429 }), true);
  assert.equal(isRecoverySessionExpired({ code: "bad_jwt" }), true);
  assert.equal(isRecoverySessionExpired({ name: "AuthSessionMissingError", status: 400 }), true);
  assert.match(getRecoveryErrorMessage({ code: "same_password" }), /diferente/);
  assert.match(getRecoveryErrorMessage({ code: "weak_password" }), /segura/);
  assert.match(getRecoveryErrorMessage({ message: "Failed to fetch" }), /conexión/);
  assert.doesNotMatch(getRecoveryErrorMessage({ message: "SMTP credential secret" }), /SMTP|secret/);
});

test("la pantalla de cambio permite navegar con una sesión sin el guard del login", () => {
  assert.equal(getRoutePolicy("/restablecer-contrasena").kind, "public");
  assert.deepEqual(evaluateRouteAccess({
    pathname: "/restablecer-contrasena",
    auth: { status: "authenticated", profile: { role: "manager" } },
  }), { action: "allow" });
});
