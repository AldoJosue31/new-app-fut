// src/supabase/supabase.config.jsx
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

// NUEVO: Cliente de Administrador (Cuidado: Solo para uso administrativo)
// REQUIERE: VITE_APP_SUPABASE_SERVICE_ROLE_KEY en tu archivo .env
// Se usa un string vacío por defecto temporal para evitar que crashee la app si aún no pones la variable en el .env
const serviceRoleKey = import.meta.env.VITE_APP_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy";

export const supabaseAdmin = createClient(
  import.meta.env.VITE_APP_SUPABASE_URL,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);