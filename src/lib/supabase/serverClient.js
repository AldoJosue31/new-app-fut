import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers.js";

import { getPublicSupabaseConfig } from "./config.js";

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  const { supabasePublishableKey, supabaseUrl } =
    getPublicSupabaseConfig();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. proxy.js refreshes them.
        }
      },
    },
  });
};
