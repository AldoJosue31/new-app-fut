import { create } from 'zustand';
import { supabase } from '../supabase/supabase.config';

export const useAuthStore = create((set, get) => {
  
  const fetchProfile = async (id) => {
    if (!id) {
      set({ profile: null });
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.warn('Perfil no encontrado (AuthStore):', error.message);
        set({ profile: null });
        return null;
      }
      set({ profile: data });
      return data;
    } catch (err) {
      console.error('fetchProfile error', err);
      set({ profile: null });
      return null;
    }
  };

  const actions = {
    signupWithEmail: async (email, password, extra = {}) => {
      set({ authLoadingAction: true });
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const user = data?.user ?? data;
        if (user?.id) {
          await supabase.from('profiles').upsert({
            id: user.id,
            email,
            full_name: extra.full_name ?? null,
            created_at: new Date().toISOString(),
          });
          await fetchProfile(user.id);
        }
        set({ authLoadingAction: false });
        return user;
      } catch (err) {
        set({ authLoadingAction: false });
        throw err;
      }
    },

    loginWithEmail: async (email, password) => {
      set({ authLoadingAction: true });
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        set({ authLoadingAction: false });
        if (error) throw error;
        return data;
      } catch (err) {
        set({ authLoadingAction: false });
        throw err;
      }
    },

    loginGoogle: async () => {
      set({ authLoadingAction: true });
      try {
        const { error } = await supabase.auth.signInWithOAuth({ 
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/login`, 
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (error) throw error;
      } catch (err) {
        set({ authLoadingAction: false });
        throw err;
      }
    },

    // --- CAMBIO PRINCIPAL: Limpieza solo local ---
    cerrarSesion: async () => {
      try {
        await supabase.auth.signOut();
        // Solo limpiamos el estado de usuario en este store.
        // La limpieza de otros stores (Division, Torneos) la maneja App.jsx
        set({ user: null, profile: null });
      } catch (err) {
        console.error('Error al cerrar sesión', err);
      }
    },

    fetchProfile,

    user: null,
    profile: null,
    isLoading: true,
    authLoadingAction: false,
  };

  return actions;
});

export default useAuthStore;