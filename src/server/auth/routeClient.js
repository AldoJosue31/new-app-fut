import "server-only";

import { createServerClient } from "@supabase/ssr";

import { getPublicSupabaseConfig } from "../../lib/supabase/config.js";

export const createRouteSupabaseClient = (request, response) => {
  const { supabasePublishableKey, supabaseUrl } =
    getPublicSupabaseConfig();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers = {}) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });
};
