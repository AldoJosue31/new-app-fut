import { isInvalidSessionError } from "./sessionErrors.js";

// The client already renews tokens on focus. Recover its result rather than
// forcing another refresh, which can race with SSR or another browser tab.
export const createSessionRecovery = ({
  auth,
  migrateSession,
  onSession,
  onSignedOut,
  onInvalidSession,
  onError,
  canRecover = () => true,
  schedule = setTimeout,
  cancel = clearTimeout,
}) => {
  let disposed = false;
  let generation = 0;
  let inFlight = null;
  let retryTimer = null;
  let retryDelay = 2000;
  let migrated = false;

  const cancelRetry = () => {
    if (retryTimer !== null) cancel(retryTimer);
    retryTimer = null;
  };

  const retry = () => {
    cancelRetry();
    retryTimer = schedule(() => {
      retryTimer = null;
      void recover();
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 30000);
  };

  const recover = () => {
    if (disposed || !canRecover()) return Promise.resolve();
    if (inFlight) return inFlight;
    cancelRetry();

    const attemptGeneration = generation;
    const isCurrent = () => !disposed && generation === attemptGeneration;
    // Start in a microtask so even a synchronous failure is tracked inFlight.
    const attempt = Promise.resolve().then(async () => {
      try {
        if (!migrated) {
          await migrateSession();
          if (!isCurrent()) return;
          migrated = true;
        }

        const { data, error } = await auth.getSession();
        if (!isCurrent()) return;
        if (error) throw error;

        if (!data?.session?.user) {
          onSignedOut();
          return;
        }

        const validated = await onSession(data.session, isCurrent);
        if (!isCurrent()) return;
        if (validated === false) retry();
        else retryDelay = 2000;
      } catch (error) {
        if (!isCurrent()) return;
        if (isInvalidSessionError(error)) {
          await onInvalidSession(error);
        } else {
          onError(error);
          retry();
        }
      }
    });

    inFlight = attempt;
    void attempt.finally(() => {
      if (inFlight === attempt) inFlight = null;
    }).catch(() => undefined);
    return attempt;
  };

  return {
    recover,
    invalidate() {
      generation += 1;
      inFlight = null;
      cancelRetry();
      retryDelay = 2000;
    },
    dispose() {
      disposed = true;
      generation += 1;
      cancelRetry();
    },
  };
};
