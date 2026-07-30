import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_ROLES,
  evaluateRouteAccess,
  getRoutePolicy,
} from "../src/lib/auth/routeAccess.js";

const authFor = (role) => ({
  profile: { id: "user-1", role },
  status: "authenticated",
  user: { id: "user-1" },
});

test("la matriz publica y protegida conserva el contrato de navegacion", () => {
  assert.equal(getRoutePolicy("/landing").kind, "public");
  assert.equal(getRoutePolicy("/share/standings/7").kind, "public");
  assert.deepEqual(getRoutePolicy("/admin/managers").roles, [
    AUTH_ROLES.ADMIN,
  ]);
  assert.deepEqual(getRoutePolicy("/torneos").roles, [
    AUTH_ROLES.ADMIN,
    AUTH_ROLES.MANAGER,
  ]);
  assert.deepEqual(getRoutePolicy("/equipos").roles, [
    AUTH_ROLES.ADMIN,
    AUTH_ROLES.DELEGATE,
    AUTH_ROLES.MANAGER,
  ]);
});

test("anonimo se redirige a login conservando retorno interno", () => {
  assert.deepEqual(
    evaluateRouteAccess({
      auth: { profile: null, status: "anonymous", user: null },
      pathname: "/configuracion",
      returnPath: "/configuracion?tab=cuenta",
    }),
    {
      action: "redirect",
      destination:
        "/login?next=%2Fconfiguracion%3Ftab%3Dcuenta",
    },
  );
});

test("cada rol recibe solo sus rutas", () => {
  assert.equal(
    evaluateRouteAccess({
      auth: authFor(AUTH_ROLES.DELEGATE),
      pathname: "/equipos",
    }).action,
    "allow",
  );
  assert.deepEqual(
    evaluateRouteAccess({
      auth: authFor(AUTH_ROLES.DELEGATE),
      pathname: "/torneos",
    }),
    { action: "redirect", destination: "/equipos" },
  );
  assert.equal(
    evaluateRouteAccess({
      auth: authFor(AUTH_ROLES.MANAGER),
      pathname: "/torneos",
    }).action,
    "allow",
  );
  assert.deepEqual(
    evaluateRouteAccess({
      auth: authFor(AUTH_ROLES.MANAGER),
      pathname: "/admin/managers",
    }),
    { action: "redirect", destination: "/dashboard" },
  );
  assert.equal(
    evaluateRouteAccess({
      auth: authFor(AUTH_ROLES.ADMIN),
      pathname: "/admin/managers",
    }).action,
    "allow",
  );
});

test("un perfil temporalmente no disponible nunca muestra contenido privado", () => {
  assert.deepEqual(
    evaluateRouteAccess({
      auth: {
        profile: null,
        status: "profile-unavailable",
        user: { id: "user-1" },
      },
      pathname: "/dashboard",
    }),
    { action: "pending" },
  );
});

test("rutas desconocidas y login autenticado redirigen sin flash", () => {
  assert.deepEqual(
    evaluateRouteAccess({
      auth: authFor(AUTH_ROLES.MANAGER),
      pathname: "/login",
    }),
    { action: "redirect", destination: "/dashboard" },
  );
  assert.deepEqual(
    evaluateRouteAccess({
      auth: { profile: null, status: "anonymous", user: null },
      pathname: "/ruta-inexistente",
    }),
    { action: "redirect", destination: "/" },
  );
});
