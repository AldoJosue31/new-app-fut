import test from "node:test";
import assert from "node:assert/strict";

import {
  detectImageMimeType,
  isPotentialImageFile,
  normalizeImageMimeType,
  prepareImageForScan,
} from "../src/utils/scanImageUtils.js";

const fakeFile = (bytes, name, type = "") => {
  const blob = new Blob([Uint8Array.from(bytes)], { type });
  Object.defineProperty(blob, "name", { value: name });
  return blob;
};

const withImageEnvironment = async ({ width, height, canvas }, callback) => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  let closeCalls = 0;
  let createElementCalls = 0;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      createImageBitmap: async () => ({
        width,
        height,
        close: () => {
          closeCalls += 1;
        },
      }),
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: {
      createElement: () => {
        createElementCalls += 1;
        return canvas;
      },
    },
  });

  try {
    return await callback({
      getCloseCalls: () => closeCalls,
      getCreateElementCalls: () => createElementCalls,
    });
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else delete globalThis.document;
  }
};

test("normaliza los alias que suelen entregar los selectores moviles", () => {
  assert.equal(normalizeImageMimeType({ name: "foto", type: "image/x-heic" }), "image/heic");
  assert.equal(normalizeImageMimeType({ name: "foto", type: "image/pjpeg" }), "image/jpeg");
  assert.equal(normalizeImageMimeType({ name: "foto.JFIF", type: "" }), "image/jpeg");
});

test("acepta formatos de imagen convertibles aunque no se envien directamente al escaner", () => {
  assert.equal(isPotentialImageFile(fakeFile([], "captura.avif", "application/octet-stream")), true);
  assert.equal(isPotentialImageFile(fakeFile([], "captura.bmp", "image/bmp")), true);
  assert.equal(isPotentialImageFile(fakeFile([], "archivo", "")), true);
  assert.equal(isPotentialImageFile(fakeFile([], "documento.pdf", "application/pdf")), false);
});

test("detecta una foto por su firma aunque el movil omita MIME y extension", async () => {
  const jpeg = fakeFile([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "archivo", "application/octet-stream");
  assert.equal(await detectImageMimeType(jpeg), "image/jpeg");
});

test("distingue HEIF y AVIF mediante la marca del contenedor", async () => {
  const header = (brand) => [
    0x00, 0x00, 0x00, 0x18,
    ...Buffer.from("ftyp"),
    ...Buffer.from(brand),
    0x00, 0x00, 0x00, 0x00,
  ];
  assert.equal(await detectImageMimeType(fakeFile(header("heic"), "foto")), "image/heif");
  assert.equal(await detectImageMimeType(fakeFile(header("avif"), "foto")), "image/avif");
});

test("conserva el passthrough para fotos moviles pequenas dentro del limite de dimensiones", async () => {
  const file = fakeFile([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "foto.jpg", "image/jpeg");
  const canvas = {
    toBlob: () => {
      throw new Error("No se debe recomprimir una imagen dentro de los limites.");
    },
  };

  await withImageEnvironment({ width: 1600, height: 1200, canvas }, async ({
    getCloseCalls,
    getCreateElementCalls,
  }) => {
    const result = await prepareImageForScan(file);

    assert.equal(result.blob, file);
    assert.equal(result.mimeType, "image/jpeg");
    assert.equal(getCreateElementCalls(), 0);
    assert.equal(getCloseCalls(), 1);
  });
});

test("recomprime una imagen ligera con dimensiones mayores al limite de escaneo", async () => {
  const file = fakeFile([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "captura.jpg", "image/jpeg");
  const drawCalls = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      fillStyle: "",
      fillRect: () => {},
      drawImage: (...args) => drawCalls.push(args),
    }),
    toBlob: (callback, mimeType) => {
      callback(new Blob(["optimizada"], { type: mimeType }));
    },
  };

  await withImageEnvironment({ width: 4032, height: 3024, canvas }, async ({ getCloseCalls }) => {
    const result = await prepareImageForScan(file);

    assert.notEqual(result.blob, file);
    assert.equal(result.mimeType, "image/jpeg");
    assert.equal(result.fileName, "imagen-optimizada.jpg");
    assert.equal(canvas.width, 2200);
    assert.equal(canvas.height, 1650);
    assert.equal(drawCalls.length, 1);
    assert.equal(getCloseCalls(), 1);
  });
});
