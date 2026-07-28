export const getLegacySessionStorageKey = (supabaseUrl) => {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token`;
};

export const parseLegacySession = (rawValue) => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    const session = parsed?.currentSession || parsed?.session || parsed;
    const accessToken = session?.access_token;
    const refreshToken = session?.refresh_token;

    if (
      typeof accessToken !== "string" ||
      typeof refreshToken !== "string" ||
      !accessToken ||
      !refreshToken
    ) {
      return null;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  } catch {
    return null;
  }
};

export const migrateLegacySession = async ({
  auth,
  storage,
  supabaseUrl,
}) => {
  const {
    data: { session: cookieSession },
  } = await auth.getSession();

  if (cookieSession) return false;

  const storageKey = getLegacySessionStorageKey(supabaseUrl);
  const legacySession = parseLegacySession(storage.getItem(storageKey));
  if (!legacySession) return false;

  const { data, error } = await auth.setSession(legacySession);
  if (error) throw error;

  if (!data?.session) return false;

  storage.removeItem(storageKey);
  return true;
};
