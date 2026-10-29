const abortError = () => new DOMException("Request aborted", "AbortError");

export function createRequestCache({ ttlMs, maxEntries = 24, now = Date.now }) {
  const entries = new Map();

  return {
    set(key, data) {
      entries.set(key, { data, expiresAt: now() + ttlMs, users: 0 });
      if (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    },
    read(key, load, { signal, onCachedData } = {}) {
      if (signal?.aborted) return Promise.reject(abortError());
      let entry = entries.get(key);
      if (entry?.data !== undefined) {
        onCachedData?.(entry.data);
        if (entry.expiresAt > now()) return Promise.resolve(entry.data);
      }

      if (!entry) {
        entry = { users: 0 };
        entries.set(key, entry);
        if (entries.size > maxEntries) entries.delete(entries.keys().next().value);
      }
      if (!entry.pending) {
        const controller = new AbortController();
        entry.controller = controller;
        entry.pending = Promise.resolve().then(() => load(controller.signal)).then((data) => {
          entry.data = data;
          entry.expiresAt = now() + ttlMs;
          return data;
        }).finally(() => {
          entry.pending = null;
        });
      }

      const pending = entry.pending;
      entry.users += 1;
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener("abort", onAbort);
          entry.users -= 1;
          callback(value);
          // Allow a replacement subscriber in the same render to share the request.
          queueMicrotask(() => {
            if (entry.users === 0 && entry.pending === pending) {
              if (entries.get(key) === entry) entries.delete(key);
              entry.controller.abort();
            }
          });
        };
        const onAbort = () => finish(reject, abortError());
        signal?.addEventListener("abort", onAbort, { once: true });
        pending.then((data) => finish(resolve, data), (error) => finish(reject, error));
      });
    },
  };
}
