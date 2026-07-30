import test from "node:test";
import assert from "node:assert/strict";

import {
  detectImageMimeType,
  isPotentialImageFile,
  normalizeImageMimeType,
} from "../src/utils/scanImageUtils.js";

const fakeFile = (bytes, name, type = "") => {
  const blob = new Blob([Uint8Array.from(bytes)], { type });
  Object.defineProperty(blob, "name", { value: name });
  return blob;
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
