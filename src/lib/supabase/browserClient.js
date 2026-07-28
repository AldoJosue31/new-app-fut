import "client-only";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseConfig } from "./config.js";

const { supabasePublishableKey, supabaseUrl } = getPublicSupabaseConfig();

export const supabase = createBrowserClient(
  supabaseUrl,
  supabasePublishableKey,
);
