// src/store/AuthStore.jsx
import { create } from 'zustand';
import { supabase } from '../supabase/supabase.config';

/**
 * Zustand store que maneja autenticación + profile (tabla profiles).
 * Se inicializa al importar el módulo (fetch session + subscribe).
 */
export const useAuthStore = create((set, get) => {
  // helpers internos
  const fetchProfile = async (id) => {
    if (!id) {
      set({ profile: null });
      return null;
    }
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        // si no existe, devolver null (no mostrar error al usuario)
        console.warn('fetchProfile warning', error.message || error);
        set({ profile: null });
        return null;
      }
      set({ profile: data });
      return data;
    } catch (err) {
      console.error('fetchProfile error', err);
      set({ profile: null });
      return null;
    } finally {
      set({ isLoading: false });
    }
  };

  // acciones públicas disponibles en el store
  const actions = {
    // registro con email/contraseña (upsertea profile si user existe)
    signupWithEmail: async (email, password, extra = {}) => {
      set({ authLoadingAction: true });
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // supabase puede no devolver session hasta confirmar, pero si viene user lo usamos
        const user = data?.user ?? data;
        if (user?.id) {
          await supabase.from('profiles').upsert({
            id: user.id,
            email,
            full_name: extra.full_name ?? null,
            created_at: new Date().toISOString(),
          });
          // actualizar profile local
          await fetchProfile(user.id);
        }
        set({ authLoadingAction: false });
        return user;
      } catch (err) {
        set({ authLoadingAction: false });
        throw err;
      }
    },

    // login con email/password
    loginWithEmail: async (email, password) => {
      set({ authLoadingAction: true });
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        set({ authLoadingAction: false });
        if (error) throw error;
        // session llegará por listener; aún así podemos retornar data
        return data;
      } catch (err) {
        set({ authLoadingAction: false });
        throw err;
      }
    },

    // login con Google (OAuth)
    loginGoogle: async () => {
      set({ authLoadingAction: true });
      try {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) {
          set({ authLoadingAction: false });
          throw error;
        }
        // la sesión y profile se resolverán desde el listener onAuthStateChange
      } catch (err) {
        set({ authLoadingAction: false });
        throw err;
      }
    },

    // sign out
    cerrarSesion: async () => {
      try {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
      } catch (err) {
        console.error('Error al cerrar sesión', err);
      }
    },

    // fetchProfile expuesto por conveniencia
    fetchProfile,

    // estado y getters (valores iniciales)
    user: null,
    profile: null,
    isLoading: true,
    authLoadingAction: false,
  };

  // Inicialización: obtiene session inicial y subscribe
  (async function init() {
    try {
      // 1) obtener sesión actual una vez al inicio
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user ?? null;
      set({ user: sessionUser });

      if (sessionUser?.id) {
        // fetch profile si ya existe sesión
        await fetchProfile(sessionUser.id);
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('AuthStore init error', err);
      set({ isLoading: false });
    }

    // 2) listener para cambios de sesión
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      set({ user: u });

      if (u?.id) {
        // fetch/profile update
        await fetchProfile(u.id);

        // opcional: si el profile no existía puedes crear uno mínimo
        // (pero si ejecutaste el SQL con trigger o hiciste upsert en signup, no hace falta)
        // ejemplo:
        // await supabase.from('profiles').upsert({ id: u.id, email: u.email });
      } else {
        set({ profile: null });
      }

      // en cualquier cambio de sesión, ya no estamos en "isLoading" inicial
      set({ isLoading: false });
    });

    // guarda unsubscribe para evitar fugas si el módulo se recarga (HMR)
    // aunque aquí no guardamos la referencia, supabase mantiene internamente.
    // Si quieres exponer unsubscribe, podríamos guardarla en el store.
    // Ejemplo simple: on window unload unsub
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        try {
          listener?.subscription?.unsubscribe?.();
        } catch (e) {}
      });
    }
  })();

  return actions;
});

export default useAuthStore;
