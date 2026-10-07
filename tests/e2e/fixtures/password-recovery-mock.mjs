import { createRecoveryTestSession, recoveryTestProfile, recoveryTestUser } from "./password-recovery-session.mjs";

// Installed exclusively in the dedicated test process. Only synthetic tokens
// and codes are intercepted; real credentials and production accounts are untouched.
if (process.env.E2E_PASSWORD_RECOVERY === "1") {
  const originalFetch = globalThis.fetch;
  const json = (value, status = 200) => new Response(JSON.stringify(value), {
    status, headers: { "Content-Type": "application/json" },
  });
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    const headers = new Headers(options?.headers || input?.headers);
    const syntheticSession = headers.get("authorization")?.endsWith(".password-recovery-e2e");
    if (syntheticSession && url.pathname === "/auth/v1/user") return json(recoveryTestUser);
    if (syntheticSession && url.pathname === "/rest/v1/profiles") return json(recoveryTestProfile);

    if (["/auth/v1/verify", "/auth/v1/token"].includes(url.pathname)) {
      const rawBody = options?.body || (input instanceof Request ? await input.clone().text() : "{}");
      const body = JSON.parse(rawBody);
      const token = body.token_hash || body.auth_code || "";
      if (token.startsWith("password-recovery-e2e-")) {
        if (token.endsWith("expired")) return json({ code: "otp_expired", message: "Expired test link" }, 403);
        if (token.endsWith("unavailable")) return json({ code: "unexpected_failure", message: "Unavailable" }, 503);
        return json(createRecoveryTestSession());
      }
    }
    return originalFetch(input, options);
  };
}
