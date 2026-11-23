// Sesión demo (JWT sin firma real) que el servidor falso acepta.
export const makeSession = (user) => {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 12;
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const authUser = { id: user.id, aud: "authenticated", role: "authenticated", email: user.email, app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: user.full_name }, identities: [], created_at: "2026-01-10T00:00:00Z" };
  return {
    access_token: `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: user.id, exp, role: "authenticated", aud: "authenticated", email: user.email })}.demo`,
    refresh_token: `demo-refresh-${user.id}`,
    expires_at: exp, expires_in: 3600 * 12, token_type: "bearer", user: authUser,
  };
};
