import { recoveryTestProfile, recoveryTestUser } from "./password-recovery-session.mjs";

// Only the dedicated recovery test server installs this mock. Requests using
// real credentials are never intercepted and no real accounts are modified.
if (process.env.E2E_AUTH_RECOVERY === "1") {
  const originalFetch = globalThis.fetch;
  const json = (value, status = 200) => new Response(JSON.stringify(value), {
    status, headers: { "Content-Type": "application/json" },
  });
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    const headers = new Headers(options?.headers || input?.headers);
    const token = headers.get("authorization");
    if (token?.endsWith(".codex-recovery-e2e-available")) {
      if (url.pathname === "/auth/v1/user") return json(recoveryTestUser);
      if (url.pathname === "/rest/v1/profiles") return json(recoveryTestProfile);
    }
    if (url.pathname === "/auth/v1/user" && token?.endsWith(".codex-recovery-e2e")) {
      return json({ message: "Service temporarily unavailable" }, 503);
    }
    return originalFetch(input, options);
  };
}
