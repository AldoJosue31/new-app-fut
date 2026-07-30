import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server.js";

import { getPublicSupabaseConfig } from "../../lib/supabase/config.js";

export const updateSession = async (
  request,
  { createClient = createServerClient } = {},
) => {
  let response = NextResponse.next({ request });
  const { supabasePublishableKey, supabaseUrl } =
    getPublicSupabaseConfig();

  const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers = {}) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, options, value }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (claims) {
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
};
