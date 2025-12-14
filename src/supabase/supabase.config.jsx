// src/supabase/supabase.config.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_APP_SUPABASE_URL,
  import.meta.env.VITE_APP_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (k) => {
          try { return localStorage.getItem(k); } catch { return null; }
        },
        setItem: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
        removeItem: (k) => { try { localStorage.removeItem(k); } catch {} },
      },
    },
  }
);
