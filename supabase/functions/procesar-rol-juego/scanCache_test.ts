import { createRoleScanFingerprint, RoleScanCache } from "./scanCache.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const firstContext = {
  divisionName: "Primera Fuerza",
  roundTitle: "Jornada 13",
  teams: [
    { id: "a", name: "Atletico Norte" },
    { id: "b", name: "Deportivo Sur" },
  ],
};
const secondContext = {
  divisionName: "Segunda Division",
  roundTitle: "Jornada 13",
  teams: [
    { id: "c", name: "Real Oriente" },
    { id: "d", name: "Union Poniente" },
  ],
};
const completeImage = {
  entries: [
    {
      divisionLabel: "Primera Fuerza",
      roundLabel: "Jornada 13",
      localTeam: "Atletico Norte",
      visitorTeam: "Deportivo Sur",
    },
    {
      divisionLabel: "Segunda Division",
      roundLabel: "Jornada 13",
      localTeam: "Real Oriente",
      visitorTeam: "Union Poniente",
    },
  ],
};

Deno.test("la huella distingue imagen, formato y credencial", async () => {
  const first = await createRoleScanFingerprint(
    "AQID",
    "image/png",
    "Bearer user-a",
  );
  assert(
    first ===
      await createRoleScanFingerprint("AQID", "image/png", "Bearer user-a"),
    "huella estable",
  );
  assert(
    first !==
      await createRoleScanFingerprint("AQIE", "image/png", "Bearer user-a"),
    "imagen distinta",
  );
  assert(
    first !==
      await createRoleScanFingerprint("AQID", "image/jpeg", "Bearer user-a"),
    "formato distinto",
  );
  assert(
    first !==
      await createRoleScanFingerprint("AQID", "image/png", "Bearer user-b"),
    "usuario distinto",
  );
});

Deno.test("reutiliza una lectura completa para otra division visible", () => {
  const cache = new RoleScanCache();
  cache.store("same-image", firstContext, completeImage);
  const scan = cache.find("same-image", secondContext);
  assert(scan?.complete, "segunda division completa sin otra lectura");
  assert(
    scan?.matches[0]?.localTeamId === "c",
    "selecciona los equipos del contexto nuevo",
  );
});

Deno.test("no reutiliza un bloque ambiguo ni un resultado parcial", () => {
  const cache = new RoleScanCache();
  cache.store("partial", firstContext, { entries: [] });
  assert(
    cache.find("partial", firstContext) === null,
    "resultado parcial no se guarda",
  );

  cache.store("same-image", firstContext, {
    entries: [{
      localTeam: "Atletico Norte",
      visitorTeam: "Deportivo Sur",
    }],
  });
  assert(
    cache.find("same-image", firstContext)?.complete,
    "mismo contexto exacto",
  );
  assert(
    cache.find("same-image", secondContext) === null,
    "otra division sin encabezados ni cobertura",
  );

  cache.store("wrong-round", firstContext, completeImage);
  assert(
    cache.find("wrong-round", {
      ...secondContext,
      roundTitle: "Jornada 14",
    }) === null,
    "jornada distinta vuelve al proveedor",
  );
});

Deno.test("vence por tiempo y descarta la imagen menos reciente", () => {
  let now = 1000;
  const cache = new RoleScanCache({
    ttlMs: 100,
    maxEntries: 2,
    now: () => now,
  });
  cache.store("a", firstContext, completeImage);
  cache.store("b", firstContext, completeImage);
  assert(
    cache.find("a", firstContext)?.complete,
    "a pasa a ser la mas reciente",
  );
  cache.store("c", firstContext, completeImage);
  assert(cache.find("b", firstContext) === null, "b se descarta por LRU");
  now = 1100;
  assert(cache.find("a", firstContext) === null, "a vence por TTL");
});
