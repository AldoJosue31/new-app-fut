import assert from "node:assert/strict";
import test from "node:test";

import {
  createNotificationOptions,
  normalizeNotificationMessage,
  normalizeNotificationType,
} from "../src/lib/notifications/policy.js";

test("aplica títulos y duraciones consistentes para cada tipo", () => {
  assert.deepEqual(createNotificationOptions("success", "Liga guardada"), {
    type: "success",
    title: "Listo",
    description: "Liga guardada",
    duration: 4000,
  });

  assert.deepEqual(createNotificationOptions("error", "Falló la operación"), {
    type: "error",
    title: "No se pudo completar",
    description: "Falló la operación",
    duration: 6000,
  });
});

test("normaliza tipos desconocidos y mensajes Error", () => {
  assert.equal(normalizeNotificationType("loading"), "info");
  assert.equal(
    normalizeNotificationMessage(new Error("  Servicio no disponible  ")),
    "Servicio no disponible",
  );

  assert.deepEqual(createNotificationOptions("loading", new Error("Sin red")), {
    type: "info",
    title: "Información",
    description: "Sin red",
    duration: 5000,
  });
});

test("acepta personalización segura y descarta duraciones inválidas", () => {
  assert.deepEqual(
    createNotificationOptions("warning", "Cambio pendiente", {
      title: "Revisa esto",
      duration: 2500,
    }),
    {
      type: "warning",
      title: "Revisa esto",
      description: "Cambio pendiente",
      duration: 2500,
    },
  );

  assert.equal(
    createNotificationOptions("success", "Guardado", { duration: null }).duration,
    4000,
  );
  assert.equal(
    createNotificationOptions("error", "Falló", { duration: 60001 }).duration,
    6000,
  );
  assert.equal(createNotificationOptions("info", "Aviso", null).duration, 5000);
});

test("garantiza una descripción legible aun con entradas vacías", () => {
  const result = createNotificationOptions("error", "   ");

  assert.equal(result.description, "Ocurrió algo inesperado.");
});
