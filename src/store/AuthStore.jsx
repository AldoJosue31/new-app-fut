// src/store/AuthStore.jsx
import { create } from 'zustand';
import { supabase } from '../supabase/supabase.config';

export const useAuthStore = create((set, get) => {
  
  // Helpers internos
  const fetchProfile = async (id) => {
    if (!id) {
      set({ profile: null });
      return null;
    }
    // Nota: No activamos isLoading global aquí para no parpadear la UI si se llama en segundo plano
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
    // --- Registro con Email ---
    signupWithEmail: async (email, password, extra = {}) => {
      set({ authLoadingAction: true });
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        const user = data?.user ?? data;
        if (user?.id) {
          // Crear perfil inmediatamente
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

    // --- Login con Email ---
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

    // --- Login con Google (MODIFICADO) ---
    loginGoogle: async () => {
      set({ authLoadingAction: true });
      try {
        const { error } = await supabase.auth.signInWithOAuth({ 
          provider: 'google',
          options: {
            // Asegura que vuelva a tu app (ajusta la ruta si es necesario)
            redirectTo: `${window.location.origin}/dashboard`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        
        if (error) throw error;
        // No seteamos false aquí inmediatamente porque la redirección recarga la página
      } catch (err) {
        set({ authLoadingAction: false });
        throw err;
      }
    },

    // --- Cerrar Sesión ---
cerrarSesion: async () => {
      try {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
        
        // LIMPIEZA DE DATOS VIEJOS
        useDivisionStore.getState().resetStore(); // <--- AGREGA ESTO
        localStorage.removeItem('division-storage'); // Opcional: forzar borrado del storage
        
      } catch (err) {
        console.error('Error al cerrar sesión', err);
      }
    },

    fetchProfile,

    // Estado inicial
    user: null,
    profile: null,
    isLoading: true,
    authLoadingAction: false,
  };

  return actions;
});

export default useAuthStore;