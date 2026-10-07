export const recoveryTestUser = {
  id: "00000000-0000-4000-8000-000000000002",
  aud: "authenticated", role: "authenticated",
  email: "manager@league.example.invalid",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {}, identities: [],
  created_at: "2026-01-01T00:00:00Z", email_confirmed_at: "2026-01-01T00:00:00Z",
};

export const recoveryTestProfile = {
  ...recoveryTestUser, role: "manager", is_suspended: false, metadata: {},
};

export const createRecoveryTestSession = () => {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    user: recoveryTestUser,
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
      sub: recoveryTestUser.id, exp: expiresAt, role: "authenticated", aud: "authenticated",
    })}.password-recovery-e2e`,
    refresh_token: "password-recovery-e2e-refresh",
    expires_at: expiresAt, expires_in: 3600, token_type: "bearer",
  };
};
