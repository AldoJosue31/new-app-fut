import { assertEquals } from "jsr:@std/assert";
import { sanitizeMatchObservations } from "./scanObservations.ts";

Deno.test("elimina metadatos administrativos de las observaciones", () => {
  assertEquals(
    sanitizeMatchObservations(
      "Jornada: 5 | División: Segunda | Categoría: Libre | Fecha: 2026-08-04 | Hora: 19:00",
    ),
    "",
  );
});

Deno.test("conserva solamente incidentes ocurridos durante el partido", () => {
  assertEquals(
    sanitizeMatchObservations(
      "Jornada 5; Jugador 10 salió lesionado; Fecha: 2026-08-04; Partido suspendido por lluvia",
    ),
    "Jugador 10 salió lesionado | Partido suspendido por lluvia",
  );
});

Deno.test("no elimina una referencia temporal dentro de un incidente narrativo", () => {
  assertEquals(
    sanitizeMatchObservations(
      "El partido se suspendió a las 20:15 por falta de iluminación",
    ),
    "El partido se suspendió a las 20:15 por falta de iluminación",
  );
});

Deno.test("elimina etiquetas vacias y clausulas repetidas", () => {
  assertEquals(
    sanitizeMatchObservations(
      "Observaciones adicionales: | Hubo invasión de cancha | Hubo invasión de cancha",
    ),
    "Hubo invasión de cancha",
  );
});
