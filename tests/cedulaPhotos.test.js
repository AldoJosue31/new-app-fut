import test from 'node:test';
import assert from 'node:assert/strict';
import { cedulaPhotoPath, compressCedulaPhoto, MAX_CEDULA_PHOTO_BYTES } from '../src/utils/cedulaPhotoUtils.js';
import { deleteTournamentWithCedulas, loadCedulaPhoto, removeTournamentCedulaPhotos, saveCedulaPhoto } from '../src/services/cedulaPhotos.js';

const context = { leagueId: 2, tournamentId: 3, matchId: 4 };
const jpg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' });

test('rechaza rutas ajenas a identificadores válidos', () => {
  assert.equal(cedulaPhotoPath(context), '2/3/4.jpg');
  for (const matchId of ['../4', 0, -4, 1.2]) {
    assert.throws(() => cedulaPhotoPath({ ...context, matchId }));
  }
});

test('la compresión respeta el límite y libera la imagen, sin pasar el original', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  let closed = false;
  let calls = 0;
  const canvas = {
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toBlob(callback, type) {
      calls += 1;
      callback(new Blob([new Uint8Array(calls === 1 ? MAX_CEDULA_PHOTO_BYTES + 1 : 220000)], { type }));
    },
  };
  globalThis.window = { createImageBitmap: async () => ({ width: 4400, height: 3300, close() { closed = true; } }) };
  globalThis.document = { createElement: () => canvas };
  try {
    const compressed = await compressCedulaPhoto(jpg);
    assert.equal(compressed.size, 220000);
    assert.equal(compressed.type, 'image/jpeg');
    assert.equal(canvas.width, 2200);
    assert.equal(canvas.height, 1650);
    assert.equal(closed, true);
    assert.notEqual(compressed, jpg);
    canvas.toBlob = callback => callback(null);
    await assert.rejects(compressCedulaPhoto(jpg), /500 KB/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});

test('guardar reutiliza el mismo objeto y nunca admite la foto original grande', async () => {
  let uploaded;
  const client = { storage: { from: bucket => {
    assert.equal(bucket, 'match-cedulas');
    return { upload: async (...args) => { uploaded = args; return {}; } };
  } } };
  await saveCedulaPhoto(client, context, jpg);
  assert.equal(uploaded[0], '2/3/4.jpg');
  assert.equal(uploaded[2].upsert, true);
  await assert.rejects(saveCedulaPhoto(client, context, new Blob([new Uint8Array(MAX_CEDULA_PHOTO_BYTES + 1)], { type: 'image/jpeg' })), /500 KB/);
});

test('cargar verifica el nombre exacto, no el resultado parcial de búsqueda', async () => {
  const client = { storage: { from: () => ({ list: async () => ({ data: [{ name: '44.jpg' }] }), download: () => assert.fail('No debe descargar otro partido') }) } };
  assert.equal(await loadCedulaPhoto(client, context), null);
});

test('la limpieza borra todas las páginas sin saltar fotos y solo de ese torneo', async () => {
  const files = Array.from({ length: 237 }, (_, i) => ({ name: `${i + 1}.jpg` }));
  const sizes = [];
  const bucket = {
    list: async (folder, { limit }) => {
      assert.equal(folder, '2/3');
      return { data: files.slice(0, limit) };
    },
    remove: async paths => {
      assert.ok(paths.every(path => path.startsWith('2/3/')));
      sizes.push(paths.length);
      return { data: files.splice(0, paths.length) };
    },
  };
  await removeTournamentCedulaPhotos({ storage: { from: () => bucket } }, context);
  assert.deepEqual(sizes, [100, 100, 37]);
});

const deletionClient = (storageError) => {
  const actions = [];
  const client = {
    from: () => ({
      update(values) {
        actions.push(values.cedula_uploads_locked ? 'lock' : 'unlock');
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: 3, divisions: { league_id: 2 } } }) }), then(resolve) { resolve({}); } }) };
      },
      delete() {
        actions.push('delete');
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: 3 } }) }) }) };
      },
    }),
    storage: { from: () => ({ list: async () => {
      actions.push('list');
      return storageError ? { error: new Error('Storage no disponible') } : { data: [] };
    } }) },
  };
  return { client, actions };
};

test('finalizar bloquea las cargas y termina la limpieza antes de borrar el torneo', async () => {
  const { client, actions } = deletionClient(false);
  await deleteTournamentWithCedulas(client, 3);
  assert.deepEqual(actions, ['lock', 'list', 'delete']);
});

test('un fallo de Storage conserva el torneo y desbloquea las cargas para reintentar', async () => {
  const { client, actions } = deletionClient(true);
  await assert.rejects(deleteTournamentWithCedulas(client, 3), /Storage no disponible/);
  assert.deepEqual(actions, ['lock', 'list', 'unlock']);
});

test('un borrado parcial no permite eliminar el torneo ni entra en un bucle', async () => {
  const client = { storage: { from: () => ({ list: async () => ({ data: [{ name: '4.jpg' }] }), remove: async () => ({ data: [] }) }) } };
  await assert.rejects(removeTournamentCedulaPhotos(client, context), /todas las fotos/);
});
