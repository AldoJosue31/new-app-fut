// Only the dedicated recovery test server installs this mock. Requests using
// real credentials are never intercepted and no real accounts are modified.
if (process.env.E2E_AUTH_RECOVERY === "1") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, options) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    const headers = new Headers(options?.headers || input?.headers);
    if (url.pathname === "/auth/v1/user" &&
        headers.get("authorization")?.endsWith(".codex-recovery-e2e")) {
      return Promise.resolve(new Response(JSON.stringify({ message: "Service temporarily unavailable" }), {
        status: 503, headers: { "Content-Type": "application/json" },
      }));
    }
    return originalFetch(input, options);
  };
}
