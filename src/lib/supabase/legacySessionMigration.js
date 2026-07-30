import "client-only";

import { supabase } from "./browserClient.js";
import { getPublicSupabaseConfig } from "./config.js";
import {
  migrateLegacySession,
} from "./legacySession.js";

const safeBrowserStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable in private browser contexts.
    }
  },
};

export const migrateLegacyLocalStorageSession = async ({
  authClient = supabase,
  storage = safeBrowserStorage,
} = {}) => {
  const { supabaseUrl } = getPublicSupabaseConfig();
  return migrateLegacySession({
    auth: authClient.auth,
    storage,
    supabaseUrl,
  });
};
